import * as cheerio from "cheerio";
import { getText, isTransientError } from "./http";
import { invalidateSecondarySource, resolveSecondarySource } from "./resolve";
import { extractSlug, sanitizeHtml, slugify } from "./utils";
import type { Chapter, ChapterDetail, Komik, KomikListResponse } from "@/src/types";

/**
 * Sumber kedua (DOMAIN_KOMIK_H) adalah situs WordPress bertema "mangareader".
 * Semua request memakai axios, bukan `child_process`/`curl`, supaya tetap jalan
 * di Vercel serverless yang tidak menyediakan binary curl.
 */

const REQUEST_TIMEOUT = 20_000;
const DETAIL_PATHS = ["/komik/", "/manga/"];

async function hFetch(path: string): Promise<string> {
  const attempt = async (): Promise<string> => {
    const source = await resolveSecondarySource();
    if (source.kind !== "wordpress") {
      throw new Error(
        `Domain ${source.entry} mengarah ke ${source.origin} yang bukan situs WordPress yang didukung.`,
      );
    }
    const { body } = await getText(`${source.origin}${path}`, REQUEST_TIMEOUT);
    return body;
  };

  try {
    return await attempt();
  } catch (err) {
    if (!isTransientError(err)) throw err;
    invalidateSecondarySource();
    return attempt();
  }
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

// Tema ini lazy-load gambar: `src` berisi placeholder SVG, URL asli ada di
// `data-lazy-src`.
const IMAGE_ATTRS = [
  "data-lazy-src",
  "data-src",
  "data-original",
  "data-lazy",
  "data-srcset",
  "srcset",
  "src",
];

function usableUrl(raw: string | undefined): string {
  if (!raw) return "";
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return "";
  const first = (value.split(",")[0] ?? "").trim().split(/\s+/)[0] ?? "";
  return /^https?:\/\//i.test(first) ? first : "";
}

function pickImage(el: unknown): string {
  const attribs = (el as { attribs?: Record<string, string> } | null)?.attribs;
  if (!attribs) return "";
  for (const attr of IMAGE_ATTRS) {
    const url = usableUrl(attribs[attr]);
    if (url) return url;
  }
  return "";
}

function titleCase(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

function parseBsxList(html: string): Komik[] {
  const $ = cheerio.load(html);

  // `listupd` = daftar update, `bxcl` = slider. Pakai yang utama dulu supaya
  // kartu tidak berduplikat.
  let cards = $(".listupd .bsx");
  if (cards.length === 0) cards = $(".bsx");

  const out: Komik[] = [];
  const seen = new Set<string>();

  cards.each((_, el) => {
    const card = $(el);
    const link = card.find("a").first();
    const slug = extractSlug(link.attr("href"));
    if (!slug || seen.has(slug)) return;

    const img = card.find("img").first();
    const thumbnail = img.length ? pickImage(img[0]) : "";
    const title =
      link.attr("title")?.trim() ||
      card.find(".tt, h4, h2").first().text().trim() ||
      img.attr("alt")?.trim() ||
      "";
    if (!title) return;

    const rawType =
      card
        .find("span.type")
        .first()
        .attr("class")
        ?.replace(/\btype\b/g, " ")
        .trim() ?? "";

    const rating = card.find(".numscore, .rating .num, .num").first().text().trim();

    seen.add(slug);
    out.push({
      slug: `h-${slug}`,
      title,
      thumbnail,
      type: titleCase(rawType) || undefined,
      rating: rating || undefined,
    });
  });

  return out;
}

function parseInfoRows($: cheerio.CheerioAPI): {
  type: string;
  status: string;
  author: string;
  artist: string;
} {
  const info = { type: "", status: "", author: "", artist: "" };
  $(".imptdt").each((_, el) => {
    const label = $(el).contents().first().text().trim().toLowerCase();
    const value = $(el).find("i, a, span").first().text().trim();
    if (!value) return;
    if (label === "status") info.status = value;
    else if (label === "type") info.type = value;
    else if (label === "author") info.author = value;
    else if (label === "artist") info.artist = value;
  });
  return info;
}

function parseChapters($: cheerio.CheerioAPI): Chapter[] {
  const chapters: Chapter[] = [];
  const seen = new Set<string>();

  $(".eplister#chapterlist li, #chapterlist li").each((_, el) => {
    const row = $(el);
    const slug = extractSlug(row.find("a").first().attr("href"));
    if (!slug || seen.has(slug)) return;

    const label = row.find(".chapternum").first().text().trim();
    const date = row.find(".chapterdate").first().text().trim();
    const number = label.match(/([\d.]+)\s*$/)?.[1] ?? label;

    seen.add(slug);
    chapters.push({ slug, number, title: label || undefined, date: date || undefined });
  });

  return chapters;
}

function parseDetail(rawSlug: string, html: string): Komik | null {
  const $ = cheerio.load(html);

  const title = $("h1.entry-title").first().text().trim();
  if (!title) return null;

  const coverImg = $("img.wp-post-image, .thumb img").first();
  const synopsis = sanitizeHtml(
    $(".entry-content, .entry-summ, div[itemprop='description']")
      .first()
      .text(),
  );

  const genres: string[] = [];
  $(".wd-full .mgen a, a[rel='tag']").each((_, el) => {
    const name = $(el).text().trim();
    if (name && !genres.includes(name)) genres.push(name);
  });

  const info = parseInfoRows($);

  return {
    slug: rawSlug,
    title,
    thumbnail: coverImg.length ? pickImage(coverImg[0]) : "",
    type: info.type,
    status: info.status,
    rating: $(".num[itemprop='ratingValue'], .num").first().text().trim(),
    synopsis,
    genres,
    author: info.author,
    artist: info.artist,
    chapters: parseChapters($),
  };
}

function countPages(html: string, current: number): number {
  const $ = cheerio.load(html);
  let total = Math.max(1, current);
  $(".pagination a, .pagination span, a.page-numbers, span.page-numbers").each(
    (_, el) => {
      const value = parseInt($(el).text().trim(), 10);
      if (!Number.isNaN(value) && value > total) total = value;
    },
  );
  return total;
}

function parseReaderPayload(raw: string): Record<string, unknown> {
  // Minifier PHP sering menulis boolean sebagai !0 / !1.
  const attempts = [raw, raw.replace(/!0/g, "true").replace(/!1/g, "false")];
  for (const attempt of attempts) {
    try {
      const value: unknown = JSON.parse(attempt);
      if (value && typeof value === "object") {
        return value as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return {};
}

/* ------------------------------------------------------------------ *
 * API publik
 * ------------------------------------------------------------------ */

export async function searchKomikH(
  query: string,
  page: number = 1,
  prefixSlug = true,
): Promise<KomikListResponse> {
  const term = query.trim();
  if (!term) return { komik: [], currentPage: 1, totalPages: 1 };

  const path =
    page > 1
      ? `/page/${page}/?s=${encodeURIComponent(term)}`
      : `/?s=${encodeURIComponent(term)}`;

  const html = await hFetch(path);
  const found = parseBsxList(html);
  const komik = found.map((k) => {
    const bare = k.slug.replace(/^h-/, "");
    return { ...k, slug: prefixSlug ? `h-${bare}` : bare };
  });

  return { komik, currentPage: page, totalPages: countPages(html, page) };
}

export async function getDetailH(rawSlug: string): Promise<Komik | null> {
  if (!rawSlug) return null;

  for (const prefix of DETAIL_PATHS) {
    try {
      const komik = parseDetail(rawSlug, await hFetch(`${prefix}${rawSlug}/`));
      if (komik) return komik;
    } catch {
      continue;
    }
  }
  return null;
}

export async function getThumbnailH(rawSlug: string): Promise<string> {
  if (!rawSlug) return "";
  for (const prefix of DETAIL_PATHS) {
    try {
      const html = await hFetch(`${prefix}${rawSlug}/`);
      const $ = cheerio.load(html);
      if (!$("h1.entry-title").first().text().trim()) continue;
      const img = $("img.wp-post-image, .thumb img").first();
      const src = img.length ? pickImage(img[0]) : "";
      if (src) return src;
    } catch {
      continue;
    }
  }
  return "";
}

export async function getGenreH(
  genre: string,
  page: number = 1,
): Promise<KomikListResponse> {
  const slug = slugify(genre);
  if (!slug) return { komik: [], currentPage: 1, totalPages: 1 };

  const path = page > 1 ? `/genres/${slug}/page/${page}/` : `/genres/${slug}/`;
  const html = await hFetch(path);

  return {
    komik: parseBsxList(html),
    currentPage: page,
    totalPages: countPages(html, page),
  };
}

export async function getChapterImagesH(
  rawSlug: string,
  chapterSlug: string,
): Promise<ChapterDetail | null> {
  if (!chapterSlug) return null;

  const html = await hFetch(`/${chapterSlug}/`);
  const match = /ts_reader\.run\(({[\s\S]*?})\)/.exec(html);
  if (!match) return null;

  const payload = parseReaderPayload(match[1]);
  const sources = Array.isArray(payload.sources)
    ? (payload.sources as Array<{ images?: unknown }>)
    : [];

  let images: string[] = [];
  for (const source of sources) {
    if (Array.isArray(source?.images)) {
      images = source.images.filter(
        (img): img is string => typeof img === "string" && img.length > 0,
      );
    }
    if (images.length > 0) break;
  }
  if (images.length === 0) return null;

  const chapters = (await getDetailH(rawSlug).catch(() => null))?.chapters ?? [];

  return {
    images,
    prev: extractSlug(String(payload.prevUrl ?? "")),
    next: extractSlug(String(payload.nextUrl ?? "")),
    chapters,
  };
}
