import { getJson, postJson, isTransientError, mapWithConcurrency } from "./http";
import { invalidatePrimarySource, resolvePrimarySource } from "./resolve";
import { computeRelevance, filterKomik, formatDate, sanitizeHtml, slugify } from "./utils";
import type {
  Chapter,
  ChapterDetail,
  Genre,
  Komik,
  KomikListResponse,
  SearchFilters,
} from "@/src/types";

/**
 * Sumber utama (DOMAIN_KOMIK) adalah situs baca komik Cosmic: halamannya
 * dirender di sisi client, jadi HTML kosong dan scraping cheerio tidak mungkin.
 * Datanya diambil dari JSON API publik yang ditemukan resolver di resolve.ts.
 */

const PAGE_SIZE = 20;
const MAX_PAGES = 20;
const MAX_WALK_STEPS = 20;
const GENRE_CACHE_TTL = 60 * 60 * 1000;

interface ApiChapter {
  chapterNum?: string | null;
  slug?: string | null;
  time?: string | null;
}

interface ApiManga {
  title?: string | null;
  slug?: string | null;
  cover?: string | null;
  big_cover?: string | null;
  badge?: string | null;
  rating?: string | null;
  status?: string | null;
  type?: string | null;
  sinopsis?: string | null;
  author?: string | null;
  artist?: string | null;
  genres?: string[] | null;
  genre?: string[] | string | null;
  chapters?: ApiChapter[] | null;
}

interface ApiCursor {
  hasNext?: boolean;
  nextCursor?: string | null;
}

interface ApiList {
  success?: boolean;
  data?: ApiManga[] | null;
  cursor?: ApiCursor | null;
}

interface ApiDetail {
  success?: boolean;
  data?: ApiManga | null;
}

interface ApiChapterPage {
  success?: boolean;
  data?: {
    chapters?: string[] | null;
    otherChapters?: ApiChapter[] | null;
    slugManga?: string | null;
    pageCount?: number | null;
    redirect_link?: string | null;
  } | null;
}

interface ApiImageSession {
  success?: boolean;
  data?: {
    sessionId?: string;
    axisKeys?: string[];
  } | null;
}



interface ListResult {
  items: Komik[];
  page: number;
  hasNext: boolean;
}

/* ------------------------------------------------------------------ *
 * Pemanggilan API
 * ------------------------------------------------------------------ */

/**
 * API memakai cursor, bukan nomor halaman. Error transient (subdomain/CDN
 * bermasalah) memicu resolve ulang domain lalu percobaan kedua.
 */
async function cosmic<T>(fn: (apiBase: string) => Promise<T>): Promise<T> {
  const source = await resolvePrimarySource();
  if (source.kind !== "cosmic") {
    throw new Error(
      `Domain ${source.entry} mengarah ke ${source.origin} yang bukan situs Cosmic yang didukung.`,
    );
  }

  try {
    return await fn(source.apiBase);
  } catch (err) {
    if (!isTransientError(err)) throw err;
    invalidatePrimarySource();
    return fn((await resolvePrimarySource()).apiBase);
  }
}

function buildUrl(apiBase: string, path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${apiBase}${path}?${search.toString()}`;
}

async function requestList(
  apiBase: string,
  path: string,
  params: Record<string, string>,
  after?: string,
): Promise<ApiList> {
  const next: Record<string, string> = { ...params };
  if (after) next.after = after;

  const res = await getJson<ApiList>(buildUrl(apiBase, path, next));
  if (!res || res.success !== true || !Array.isArray(res.data)) {
    throw new Error(`API sumber menolak permintaan ${path}.`);
  }
  return res;
}

/** cacheKey -> (nomor halaman -> cursor `after` untuk halaman itu) */
const cursorCache = new Map<string, Map<number, string | undefined>>();

function listKey(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  search.sort();
  return `${path}?${search.toString()}`;
}

async function listPage(
  path: string,
  params: Record<string, string>,
  page: number,
): Promise<ListResult> {
  const target = Math.min(Math.max(1, Math.floor(page) || 1), MAX_PAGES);

  return cosmic(async (apiBase) => {
    const key = listKey(path, params);
    let store = cursorCache.get(key);
    if (!store) {
      store = new Map<number, string | undefined>([[1, undefined]]);
      cursorCache.set(key, store);
    }

    const toResult = (res: ApiList, current: number): ListResult => ({
      items: (res.data ?? [])
        .filter((raw) => raw?.slug && raw?.title)
        .map((raw) => mapListItem(raw)),
      page: current,
      hasNext: Boolean(res.cursor?.nextCursor),
    });

    if (store.has(target)) {
      return toResult(await requestList(apiBase, path, params, store.get(target)), target);
    }

    // Mulai dari halaman terdalam yang sudah diketahui, lalu majukan cursor.
    let from = 1;
    for (const known of store.keys()) {
      if (known > from && known < target) from = known;
    }

    let res = await requestList(apiBase, path, params, store.get(from));
    let current = from;
    let hasNext = Boolean(res.cursor?.nextCursor);
    let steps = 0;

    while (current < target && hasNext && steps < MAX_WALK_STEPS) {
      const nextCursor = res.cursor?.nextCursor;
      if (!nextCursor) break;
      current++;
      steps++;
      store.set(current, nextCursor);
      res = await requestList(apiBase, path, params, nextCursor);
      hasNext = Boolean(res.cursor?.nextCursor);
    }

    // Habis data sebelum sampai halaman yang diminta: kembalikan halaman terakhir.
    return toResult(res, Math.min(current, target));
  });
}

/* ------------------------------------------------------------------ *
 * Pemetaan payload
 * ------------------------------------------------------------------ */

function toChapters(list?: ApiChapter[] | null): Chapter[] {
  if (!Array.isArray(list)) return [];
  const out: Chapter[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const slug = entry?.slug;
    if (!slug || seen.has(slug)) continue;
    const number = String(entry.chapterNum ?? "").trim();
    seen.add(slug);
    out.push({
      slug,
      number,
      // ChapterList menampilkan `title`, jadi selalu diisi walau API tidak
      // mengirimnya (kartu chapter dari sumber kedua memakai label "Chapter N").
      title: number ? `Chapter ${number}` : "Chapter",
      date: formatDate(entry.time),
    });
  }
  return out;
}

function normalizeGenres(raw: ApiManga): string[] {
  const source = raw.genres ?? raw.genre;
  if (Array.isArray(source)) {
    return source
      .filter((g): g is string => typeof g === "string")
      .map((g) => g.trim())
      .filter(Boolean);
  }
  if (typeof source === "string") {
    return source
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }
  return [];
}

function mapListItem(raw: ApiManga): Komik {
  const chapters = toChapters(raw.chapters);
  const latest = chapters[0];
  return {
    slug: raw.slug ?? "",
    title: raw.title ?? "",
    thumbnail: raw.cover ?? raw.big_cover ?? "",
    type: raw.type ?? "",
    status: raw.status ?? "",
    rating: raw.rating ?? "",
    genres: normalizeGenres(raw),
    latestChapter: latest?.number ?? "",
    date: latest?.date ?? "",
  };
}

function mapDetail(raw: ApiManga): Komik {
  return {
    ...mapListItem(raw),
    slug: raw.slug ?? "",
    synopsis: sanitizeHtml(raw.sinopsis ?? ""),
    author: raw.author ?? "",
    artist: raw.artist ?? "",
    chapters: toChapters(raw.chapters),
  };
}

function toListResponse(result: ListResult): KomikListResponse {
  return {
    komik: result.items,
    currentPage: result.page,
    totalPages: result.hasNext ? result.page + 1 : result.page,
  };
}

/* ------------------------------------------------------------------ *
 * API publik
 * ------------------------------------------------------------------ */

export async function getHome(page: number = 1): Promise<KomikListResponse> {
  // `order_by=update` urutan dan isinya sama persis dengan `/v1/manga/latest`,
  // tapi ikut membawa `type` dan `genres` yang dibutuhkan kartu.
  return toListResponse(
    await listPage(
      "/v1/manga/filter",
      { limit: String(PAGE_SIZE), order_by: "update" },
      page,
    ),
  );
}

export async function getPopular(page: number = 1): Promise<KomikListResponse> {
  return toListResponse(
    await listPage("/v1/manga/popularToday", { limit: String(PAGE_SIZE) }, page),
  );
}

const TYPE_LABEL: Record<string, string> = {
  manhwa: "Manhwa",
  manga: "Manga",
  manhua: "Manhua",
};

export async function getByType(
  type: string,
  page: number = 1,
): Promise<KomikListResponse> {
  const label = TYPE_LABEL[type.toLowerCase()] ?? type;
  return toListResponse(
    await listPage(
      "/v1/manga/filter",
      { limit: String(PAGE_SIZE), type_manga: label },
      page,
    ),
  );
}

export async function getManhwa(page: number = 1): Promise<KomikListResponse> {
  return getByType("manhwa", page);
}

export async function getManga(page: number = 1): Promise<KomikListResponse> {
  return getByType("manga", page);
}

export async function getManhua(page: number = 1): Promise<KomikListResponse> {
  return getByType("manhua", page);
}

export async function getDetail(slug: string): Promise<Komik | null> {
  if (!slug) return null;
  try {
    const res = await cosmic((apiBase) =>
      getJson<ApiDetail>(`${apiBase}/v1/manga/mangaDetail/${encodeURIComponent(slug)}`),
    );
    const data = res?.data;
    if (!data?.slug || !data?.title) return null;
    return mapDetail(data);
  } catch {
    return null;
  }
}

function extractImages(chunks?: string[] | null): string[] {
  if (!Array.isArray(chunks)) return [];
  const images: string[] = [];
  for (const chunk of chunks) {
    const value = (chunk ?? "").trim();
    if (!value) continue;

    // API sumber utama mengirim URL gambar mentah, bukan potongan HTML.
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith("/")) {
      // `trap/*` adalah gambar jebakan, bukan halaman chapter.
      if (!value.includes("/v1/manga/img/trap/")) images.push(value);
      continue;
    }

    // Sebagian chapter (mis. hasil impor lama) masih berupa tag <img>.
    const tag = /<img\b[^>]*>/i.exec(value)?.[0];
    if (!tag) continue;
    const src =
      /\b(?:data-src|data-lazy-src)=['"]([^'"]+)['"]/i.exec(tag)?.[1] ??
      /\bsrc=['"]([^'"]+)['"]/i.exec(tag)?.[1] ??
      /\bsrcset=['"]([^'"]+)['"]/i.exec(tag)?.[1]?.trim().split(/\s+/)[0];
    if (src) images.push(src);
  }
  return images;
}

/* ------------------------------------------------------------------ *
 * Penandatanganan URL gambar Cosmic
 * ------------------------------------------------------------------ */

// Server hanya menolak timestamp lampau, bukan masa depan; offset 1 hari
// mencegah URL kedaluwarsa (30 detik) sebelum gambar selesai dimuat.
const IMAGE_URL_TIME_OFFSET = 24 * 60 * 60 * 1000;

function hexBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error("Kunci sesi gambar tidak valid");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function xorBytes(value: Uint8Array, key: Uint8Array): Uint8Array<ArrayBuffer> {
  if (key.length === 0) throw new Error("Kunci masker gambar kosong");
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) out[i] = value[i] ^ key[i % key.length];
  return out;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Reader Cosmic menyembunyikan URL gambar di canvas dan memberi URL `trap/*`
 * yang bukan gambar chapter. URL aslinya ditandatangani client dengan kunci
 * sesi; kita lakukan hal yang sama di server supaya next/image & proxy app
 * tetap menerima URL gambar biasa.
 */
async function signedChapterImages(
  apiBase: string,
  origin: string,
  chapterSlug: string,
  pageCount: number,
): Promise<string[]> {
  // Konfigurasi sumber saat ini mematikan Turnstile; token "dev-bypass" adalah
  // nilai yang dipakai reader resminya pada kondisi tersebut.
  const session = await postJson<ApiImageSession>(
    `${apiBase}/v1/manga/img/session`,
    { turnstile_token: "dev-bypass", chapter_slug: chapterSlug },
    { Origin: origin, Referer: `${origin}/` },
  );
  const { sessionId, axisKeys } = session?.data ?? {};
  if (!sessionId || !axisKeys || axisKeys.length < 2) {
    throw new Error("Respons sesi gambar Cosmic tidak valid");
  }

  const signKey = hexBytes(axisKeys[0]);
  const maskKey = hexBytes(axisKeys[1]);
  const signer = await crypto.subtle.importKey(
    "raw",
    signKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return Promise.all(
    Array.from({ length: pageCount }, async (_, pageIndex) => {
      const message = xorBytes(
        new TextEncoder().encode(
          `${chapterSlug}:${pageIndex}:${Date.now() + IMAGE_URL_TIME_OFFSET}`,
        ),
        maskKey,
      );
      const signature = new Uint8Array(await crypto.subtle.sign("HMAC", signer, message));
      return `${apiBase}/v1/manga/img/r/${sessionId}.${base64Url(signature)}.${base64Url(message)}`;
    }),
  );
}

export async function getChapterImages(
  _slug: string,
  chapterSlug: string,
): Promise<ChapterDetail | null> {
  if (!chapterSlug) return null;

  try {
    const { data, apiBase, origin } = await cosmic(async (apiBase) => ({
      data: (
        await getJson<ApiChapterPage>(
          `${apiBase}/v1/manga/readingPage/${encodeURIComponent(chapterSlug)}`,
        )
      )?.data,
      apiBase,
      origin: (await resolvePrimarySource()).origin,
    }));
    if (!data || data.redirect_link) return null;

    const chapters = toChapters(data.otherChapters);
    const index = chapters.findIndex((chapter) => chapter.slug === chapterSlug);
    const pageCount = Number(data.pageCount ?? 0);

    let images: string[] = [];
    if (Number.isInteger(pageCount) && pageCount > 0) {
      try {
        images = await signedChapterImages(apiBase, origin, chapterSlug, pageCount);
      } catch (error) {
        console.warn("[cosmic-images] gagal membuat URL bertanda tangan:", error);
      }
    }

    // Kompatibilitas dengan payload API lama yang sudah berisi URL gambar.
    if (images.length === 0) images = extractImages(data.chapters);
    if (images.length === 0) return null;

    return {
      images,
      pageCount: pageCount > 0 ? pageCount : images.length,
      next: index > 0 ? chapters[index - 1].slug : "",
      prev: index >= 0 ? (chapters[index + 1]?.slug ?? "") : "",
      chapters,
    };
  } catch {
    return null;
  }
}
async function searchApi(apiBase: string, term: string): Promise<ApiList | null> {
  try {
    return await getJson<ApiList>(
      buildUrl(apiBase, "/v1/manga/search", { q: term, limit: "100" }),
    );
  } catch {
    return null;
  }
}

export async function searchKomik(
  query: string,
  page: number = 1,
  filters?: SearchFilters,
): Promise<KomikListResponse> {
  const term = query.trim();
  if (!term) return { komik: [], currentPage: 1, totalPages: 1 };

  const collected = await cosmic(async (apiBase) => {
    const found = new Map<string, ApiManga>();
    const absorb = (res: ApiList | null) => {
      for (const raw of res?.data ?? []) {
        if (raw?.slug && raw?.title) found.set(raw.slug, raw);
      }
    };

    absorb(await searchApi(apiBase, term));

    // Pencarian API memCocokkan frasa secara literal, jadi "one piece" hanya
    // menghasilkan 2 hasil. Kalau masih sedikit, sambung dengan pencarian per
    // kata lalu biarkan computeRelevance yang mengurutkannya.
    if (found.size < PAGE_SIZE) {
      const tokens = term
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2 && t.toLowerCase() !== term.toLowerCase());

      const extras = await Promise.all(
        tokens.slice(0, 2).map((token) => searchApi(apiBase, token)),
      );
      extras.forEach(absorb);
    }

    return found;
  });

  let items = [...collected.values()].map((raw) => mapListItem(raw));

  // Author/artist belum ada di hasil API, jadi disaring setelah detail diambil.
  if (filters) items = filterKomik(items, {
    genre: filters.genre,
    type: filters.type,
    status: filters.status,
    orderby: filters.orderby,
    order: filters.order,
  });

  items.sort((a, b) => {
    const relA = computeRelevance(a.title, term);
    const relB = computeRelevance(b.title, term);
    if (relA !== relB) return relB - relA;
    return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
  });

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const slice = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Hasil pencarian tidak menyertakan type/status, jadi lengkapi seperlunya.
  const details = await mapWithConcurrency(slice, 6, (item) =>
    getDetail(item.slug),
  );
  const komik = slice.map((item, index) => {
    const detail = details[index];
    if (!detail) return item;
    return {
      ...detail,
      slug: item.slug,
      title: item.title,
      thumbnail: item.thumbnail || detail.thumbnail,
    };
  });

  // shortcut: author/artist hanya ada di detail, jadi filter ini berlaku per halaman.
  const finalKomik = filters?.author || filters?.artist
    ? filterKomik(komik, { author: filters.author, artist: filters.artist })
    : komik;

  return { komik: finalKomik, currentPage: current, totalPages };
}

let genreCache: { at: number; genres: Genre[] } | null = null;

export async function getGenreList(): Promise<Genre[]> {
  if (genreCache && Date.now() - genreCache.at < GENRE_CACHE_TTL) {
    return genreCache.genres;
  }

  try {
    // Satu request sudah cukup: tiap item hasil filter membawa daftar genre-nya.
    const result = await listPage("/v1/manga/filter", { limit: "60" }, 1);
    const seen = new Map<string, Genre>();
    for (const item of result.items) {
      for (const name of item.genres ?? []) {
        const slug = slugify(name);
        if (slug && !seen.has(slug)) seen.set(slug, { name, slug });
      }
    }

    const genres = [...seen.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "id"),
    );
    genreCache = { at: Date.now(), genres };
    return genres;
  } catch {
    return genreCache?.genres ?? [];
  }
}

export async function getGenre(
  genre: string,
  page: number = 1,
): Promise<KomikListResponse> {
  const slug = slugify(genre);
  if (!slug) return { komik: [], currentPage: 1, totalPages: 1 };

  const result = await listPage(
    "/v1/manga/filter",
    { limit: String(PAGE_SIZE), genres_slug: slug },
    page,
  );

  // API mengabaikan slug genre yang tidak dikenal dan mengembalikan daftar
  // default, jadi pastikan hasilnya benar-benar bergenre tersebut.
  if (
    result.page === 1 &&
    result.items.length > 0 &&
    !result.items.some((k) => (k.genres ?? []).some((g) => slugify(g) === slug))
  ) {
    return { komik: [], currentPage: 1, totalPages: 1 };
  }

  return toListResponse(result);
}
