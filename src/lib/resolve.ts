import { getJson, getText, probe, toOrigin } from "./http";

/**
 * Sumber data dibaca dari domain UTAMA yang ada di .env (mis. cosmictoon.to).
 * Domain utama biasanya hanya landing page berisi tombol "Baca Komik" /
 * "Website Utama" yang menunjuk ke subdomain aktif. Subdomain bisa kapan saja
 * mati atau kena blokir, jadi tidak boleh di-hardcode: setiap kali cache habis
 * sistem menelusuri ulang tautan di landing page tersebut.
 */
export type SourceKind = "cosmic" | "wordpress";

export interface ResolvedSource {
  /** Domain utama dari .env. */
  entry: string;
  /** Origin situs yang benar-benar melayani data. */
  origin: string;
  /** Base URL JSON API (sama dengan `origin` untuk situs WordPress). */
  apiBase: string;
  kind: SourceKind;
  resolvedAt: number;
}

const CACHE_TTL = 30 * 60 * 1000;
const MAX_DEPTH = 2;
const MAX_PROBES = 24;
const MAX_QUEUE = 40;
const WORKERS = 4;
const PROBE_TIMEOUT = 5_000;
/** Batas total supaya fungsi serverless tidak menggantung saat cache kosong. */
const RESOLVE_DEADLINE = 10_000;
/** Satu host gagal sekali belum berarti mati - coba lagi sebelum menyerah. */
const PROBE_RETRIES = 1;
const RESOLVE_ATTEMPTS = 2;
const MAX_BUNDLE_FILES = 16;
const BUNDLE_FETCH_WIDTH = 6;
const MAX_API_CANDIDATES = 8;

const cache = new Map<string, ResolvedSource>();
const inflight = new Map<string, Promise<ResolvedSource>>();

/** Setel RESOLVE_DEBUG=1 untuk melihat_alur penelusuran di log server. */
const TRACE = process.env.RESOLVE_DEBUG === "1";
const trace = (message: string) => {
  if (TRACE) console.log(`[resolve:${new Date().toISOString().slice(11, 23)}] ${message}`);
};

/* ------------------------------------------------------------------ *
 * Pembersih kandidat tautan
 * ------------------------------------------------------------------ */

const JUNK_HOST_FRAGMENTS = [
  "discord",
  "telegram",
  "t.me",
  "twitter",
  "facebook",
  "instagram",
  "youtube",
  "youtu.be",
  "pixeldrain",
  "whatsapp",
  "wa.me",
  "medium.com",
  "google",
  "gstatic",
  "jsdelivr",
  "unpkg",
  "cdnjs",
  "tailwindcss",
  "bootstrap",
  "fontawesome",
  "gravatar",
  "s.w.org",
  "schema.org",
  "w3.org",
  "wordpress.com",
  "wp.com",
  "blogspot",
  "paypal",
  "saweria",
  "trakteer",
  "sociabuddy",
  "sentry",
];

const JUNK_HOST_PREFIXES = [
  "cdn.",
  "img.",
  "images.",
  "static.",
  "assets.",
  "media.",
  "pay.",
  "pdf.",
  "apk.",
  "file.",
  "files.",
  "dl.",
  "fonts.",
  "www2.",
];

const JUNK_PATH = /\.(?:apk|ipa|pdf|zip|rar|7z|jpe?g|png|gif|webp|svg|ico|css|m?js|mp3|mp4|webm|woff2?|ttf|eot)$/i;

const REDIRECT_PARAMS = [
  "redirect",
  "url",
  "u",
  "goto",
  "go",
  "to",
  "target",
  "dest",
  "destination",
  "out",
];

function isJunkCandidate(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  const host = url.hostname.toLowerCase();
  if (!host) return true;
  if (JUNK_HOST_FRAGMENTS.some((fragment) => host.includes(fragment))) return true;
  if (JUNK_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) return true;
  if (JUNK_PATH.test(url.pathname)) return true;
  if (url.pathname.length > 120) return true;
  return false;
}

/**
 * Kandidat plus tingkat prioritasnya. Tombol yang teksnya berbunyi "Baca
 * Komik"/"Read" dianggap lebihemdahulu daripada tautan lain di menu, karena
 * landing page sering juga memuat menu lain (mis. "Baca Novel") yang bukan
 * sumber yang kita cari.
 */
interface Candidate {
  url: string;
  priority: boolean;
}

const READER_HINT = /\bbaca\b|\bread\b|komik|manga|manhwa|reader|nonton|watch/i;

const LINK_PATTERNS = [
  /href\s*=\s*["']([^"'#]+)["']/gi,
  /<meta[^>]+http-equiv=["']?refresh["']?[^>]*?content=["'][^"']*?url=([^"'\s>]+)/gi,
  /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/gi,
];

const ANCHOR_PATTERN =
  /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi;

/**
 * Kumpulkan tujuan outbound dari satu halaman: link biasa, meta refresh, dan
 * script pengalihan. Parameter `?redirect=` pada URL sendiri ikut diambil karena
 * landing page biasanya memakai pola "klik tombol -> lempar ke shortlink".
 */
function extractCandidates(body: string, pageUrl: string): Candidate[] {
  const found: Candidate[] = [];
  const seen = new Set<string>();

  const add = (
    raw: string | null | undefined,
    priority: boolean,
    base: string,
  ) => {
    if (!raw) return;
    const value = raw.trim().replace(/&amp;/g, "&");
    if (!value || value.startsWith("#")) return;
    if (/^(?:javascript|mailto|tel|data):/i.test(value)) return;

    let url: URL;
    try {
      url = new URL(value, base);
    } catch {
      return;
    }
    if (isJunkCandidate(url)) return;

    const key = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ url: url.toString(), priority });
  };

  try {
    const current = new URL(pageUrl);
    for (const param of REDIRECT_PARAMS) {
      for (const value of current.searchParams.getAll(param)) {
        let decoded = value;
        try {
          decoded = decodeURIComponent(value);
        } catch {
          decoded = value;
        }
        add(decoded, true, current.toString());
      }
    }
  } catch {
    // URL halaman sudah dinormalisasi di pemanggil, abaikan saja.
  }

  // Tombol berlabel jelas (mis. "Baca Komik") didahulukan.
  let anchor: RegExpExecArray | null;
  while ((anchor = ANCHOR_PATTERN.exec(body)) !== null) {
    const label = anchor[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    add(anchor[1], READER_HINT.test(label), pageUrl);
  }

  for (const pattern of LINK_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) add(match[1], false, pageUrl);
  }

  return found;
}

/* ------------------------------------------------------------------ *
 * Deteksi jenis situs
 * ------------------------------------------------------------------ */

const COSMIC_MARKER = /_app\/immutable|__sveltekit|svelte-kit/i;

const WORDPRESS_MARKERS = [
  /class=["'][^"']*\b(?:listupd|eplister|bsx)\b/i,
  /ts_reader\.run\(/,
  /id=["']chapterlist["']/i,
  /class=["'][^"']*\bentry-title\b/i,
];

function detectKind(body: string): SourceKind | null {
  if (COSMIC_MARKER.test(body)) return "cosmic";
  if (WORDPRESS_MARKERS.some((marker) => marker.test(body))) return "wordpress";
  if (
    /\/(?:komik|manga)\/[a-z0-9][a-z0-9-]{2,}\//i.test(body) &&
    /class=["'][^"']*\b(?:bsx|ts-post-image)\b/i.test(body)
  ) {
    return "wordpress";
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Penemuan API untuk situs SvelteKit ( Cosmic )
 * ------------------------------------------------------------------ */

const COSMIC_PROBE_PATH = "/v1/manga/popularToday";
const API_MARKER = /\/v1\/manga\/|PUBLIC_COSMIC_API_BASE_URL|publicSettings/;
const ORIGIN_PATTERN = /https?:\/\/[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?::\d+)?/gi;
const JUNK_API_HOST =
  /google|gstatic|firebase|jsdelivr|unpkg|cdnjs|fontawesome|fonts\.|w3\.org|github|discord|doubleclick|schema\.org|blogger|gravatar|sentry|cloudflare|amazonaws|cloudfront|vercel|netlify/i;

async function probeCosmicApi(base: string): Promise<boolean> {
  try {
    const body = await getJson<{ success?: unknown; data?: unknown }>(
      `${base}${COSMIC_PROBE_PATH}`,
      PROBE_TIMEOUT,
    );
    return body?.success === true && Array.isArray(body.data);
  } catch {
    return false;
  }
}

function extractBundleRefs(body: string, pageUrl: string): string[] {
  const refs = new Set<string>();
  for (const match of body.matchAll(/["']([^"']*_app\/immutable\/[^"']+?\.js)["']/g)) {
    try {
      refs.add(new URL(match[1], pageUrl).toString());
    } catch {
      continue;
    }
  }
  return [...refs];
}

function extractModuleDeps(bundleUrl: string, source: string): string[] {
  const deps = new Set<string>();
  for (const match of source.matchAll(/["'](\.\.?\/[^"']+?\.js)["']/g)) {
    try {
      deps.add(new URL(match[1], bundleUrl).toString());
    } catch {
      continue;
    }
  }
  return [...deps];
}

/**
 * Bucket JS SvelteKit itu hasil bundle, bukan file individual, jadi API base URL
 * tidak ada di HTML. Telusuri graf import (dibatasi) sampai ketemu file yang
 * memuat konfigurasi API.
 */
async function collectBundleSources(
  origin: string,
  html: string,
): Promise<string[]> {
  const queue = extractBundleRefs(html, origin);
  const seen = new Set<string>();
  const sources: string[] = [];
  let attempts = 0;

  while (queue.length > 0 && sources.length < MAX_BUNDLE_FILES) {
    const batch = queue.splice(0, BUNDLE_FETCH_WIDTH);
    const fetched = await Promise.all(
      batch.map(async (url) => {
        if (seen.has(url)) return null;
        seen.add(url);
        attempts++;
        if (attempts > MAX_BUNDLE_FILES * 3) return null;
        const body = await getText(url, PROBE_TIMEOUT)
          .then((res) => res.body)
          .catch(() => "");
        return body ? { url, body } : null;
      }),
    );

    for (const item of fetched) {
      if (!item) continue;
      sources.push(item.body);
      for (const dep of extractModuleDeps(item.url, item.body)) {
        if (!seen.has(dep)) queue.push(dep);
      }
    }
  }

  return sources;
}

function extractApiOrigins(sources: string[]): string[] {
  const scores = new Map<string, number>();

  for (const source of sources) {
    const markers: number[] = [];
    for (const match of source.matchAll(new RegExp(API_MARKER, "g"))) {
      markers.push(match.index);
    }

    for (const match of source.matchAll(ORIGIN_PATTERN)) {
      const origin = match[0].replace(/\/+$/, "");
      if (JUNK_API_HOST.test(origin)) continue;

      let score = 1;
      for (const marker of markers) {
        if (Math.abs((match.index ?? 0) - marker) < 800) {
          score = 3;
          break;
        }
      }
      scores.set(origin, Math.max(scores.get(origin) ?? 0, score));
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_API_CANDIDATES)
    .map(([origin]) => origin);
}

async function discoverCosmicApi(origin: string, html: string): Promise<string | null> {
  if (await probeCosmicApi(origin)) return origin;

  const sources = await collectBundleSources(origin, html);
  if (sources.length === 0) return null;

  const candidates = extractApiOrigins(sources);
  const results = await Promise.all(candidates.map((c) => probeCosmicApi(c)));
  const hit = candidates.find((_, index) => results[index]);
  return hit ?? null;
}

/* ------------------------------------------------------------------ *
 * Resolusi
 * ------------------------------------------------------------------ */

interface FetchedPage {
  body: string;
  /** Kalau server membalas 3xx, tujuan redirect-nya (masih satu hop logis). */
  redirectTo?: string;
  status: number;
  headers: Record<string, string>;
}

async function fetchPage(url: string): Promise<FetchedPage | null> {
  try {
    const res = await probe(url, PROBE_TIMEOUT);
    if (res.status >= 300 && res.status < 400) {
      return { body: "", redirectTo: res.location, status: res.status, headers: res.headers };
    }
    if (res.status < 200 || res.status >= 300) {
      // Penting: catat statusnya. Cloudflare membalas 403/521/523 dengan
      // sangat cepat, jadi ini yang membedakan "diblokir" dari "timeout".
      const title = /<title[^>]*>([^<]{0,60})/i.exec(res.body)?.[1]?.trim();
      lastError = `HTTP ${res.status}${title ? ` (${title})` : ""}`;
      return null;
    }
    return { body: res.body, status: res.status, headers: res.headers };
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code ?? "";
    lastError = err instanceof Error ? `${code} ${err.message}`.trim() : String(err);
    return null;
  }
}

/** Error request terakhir, dipakai untuk pesan kegagalan yang lebih jelas. */
let lastError = "";

// Sengaja tanpa `unref()`: timer ini wajib menjadwalkan percobaan berikutnya,
// kalau tidak process bisa keluar sebelum retry sempat jalan.
const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Penelusuran breadth-first yang berjalan konkurens: begitu satu kandidat
 * dikenali sebagai situs baca komik, proses langsung dihentikan tanpa menunggu
 * kandidat lain (yang sering menggantung di domain mati) selesai.
 *
 * `expected` dipakai sebagai saringan: landing page sumber komik bisa punya menu
 * tambahan ke situs lain (mis. "Baca Novel"), dan situs jenis itu tidak boleh
 * dipakai walau sidik jari fingerprint-nya cocok.
 */
async function resolveFromEntry(
  entry: string,
  expected: SourceKind,
  log?: (message: string) => void,
): Promise<ResolvedSource> {
  const started = Date.now();
  const say = (message: string) => {
    if (log) log(`[${Date.now() - started}ms] ${message}`);
    else trace(message);
  };
  const state: { match: ResolvedSource | null; priority: boolean } = {
    match: null,
    priority: false,
  };
  const seen = new Set<string>([entry]);
  const visited = new Set<string>([entry]);
  const queue: Array<{ url: string; depth: number; priority: boolean }> = [
    { url: entry, depth: 0, priority: true },
  ];
  const active = new Set<Promise<void>>();

  let wake: () => void = () => {};
  const matched = new Promise<void>((resolve) => {
    wake = resolve;
  });
  const deadline = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, RESOLVE_DEADLINE);
    timer.unref?.();
  });

  const accept = (source: ResolvedSource, priority: boolean) => {
    if (state.match && !(priority && !state.priority)) return;
    state.match = source;
    state.priority = priority;
    say(`! MATCH ${source.origin} (${source.kind}) api=${source.apiBase}`);
    wake();
  };

  /**
   * Masukkan kandidat ke antrean. Parameter `?redirect=` yang ada di URL itu
   * sendiri langsung ikut ditembakkan sebagai kandidat prioritas, jadi kita
   * tidak perlu menunggu halaman "pergi ke sini" merespons (biasanya berat /
   * diblokir Cloudflare) hanya untuk membaca parametermya.
   */
  const enqueue = (url: string, depth: number, priority: boolean) => {
    if (depth > MAX_DEPTH + 1) return;
    if (seen.has(url) || toOrigin(url) === entry) return;
    if (seen.size >= MAX_PROBES || queue.length >= MAX_QUEUE) return;
    seen.add(url);
    queue.push({ url, depth, priority });
    say(`+ enqueue d${depth}${priority ? " *" : "  "} ${url}`);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    for (const param of REDIRECT_PARAMS) {
      for (const raw of parsed.searchParams.getAll(param)) {
        let target = raw;
        try {
          target = decodeURIComponent(raw);
        } catch {
          target = raw;
        }
        if (!target) continue;
        let targetUrl: URL;
        try {
          targetUrl = new URL(target, parsed);
        } catch {
          continue;
        }
        if (isJunkCandidate(targetUrl)) continue;
        enqueue(targetUrl.toString(), depth, true);
      }
    }
  };

  const visit = async (
    url: string,
    depth: number,
    priority: boolean,
  ): Promise<void> => {
    say(`> visit   d${depth} ${url}`);
    let page = await fetchPage(url);
    if (!page) {
      // Host yang biasanya sehat kadang gagal sekali karena koneksi baru
      // masih buildup atau Cloudflare yang rate-limit. Coba lagi sebelum menyerah.
      for (let retry = 0; retry < PROBE_RETRIES; retry++) {
        if (Date.now() >= started + RESOLVE_DEADLINE) break;
        await sleep(250);
        page = await fetchPage(url);
        if (page) break;
      }
    }
    if (!page) {
      say(`x unreachable ${url} (${lastError || "no response"})`);
      return;
    }
    if (state.match) return;

    // Redirect bukan lapis penelusuran baru, jadi kedalaman tidak bertambah.
    if (page.redirectTo) {
      say(`  -> 302 ${page.redirectTo}`);
      enqueue(page.redirectTo, depth, priority);
      return;
    }

    const kind = detectKind(page.body);
    const origin = toOrigin(url);
    visited.add(origin);
    say(
      `  -> ${url}\n     status=${page.status} len=${page.body.length} kind=${kind ?? "none"} expected=${expected}` +
        `\n     cf-mitigated=${page.headers["cf-mitigated"] || "-"} cf-ray=${page.headers["cf-ray"] ? "yes" : "-"} server=${page.headers["server"] || "-"}` +
        `\n     has_immutable=${page.body.includes("/_app/immutable/")} title=${/<title[^>]*>([^<]{0,60})/i.exec(page.body)?.[1] ?? "-"}`,
    );

    if (kind === "wordpress") {
      if (expected === "wordpress") {
        accept({ entry, origin, apiBase: origin, kind, resolvedAt: Date.now() }, priority);
      }
      return;
    }

    if (kind === "cosmic") {
      const apiBase = await discoverCosmicApi(url, page.body);
      if (apiBase && expected === "cosmic") {
        accept(
          { entry, origin, apiBase, kind, resolvedAt: Date.now() },
          priority,
        );
      }
      return;
    }

    // Bukan situs komik: coba satu lapis lebih dalam lewat tombol/menu.
    if (depth >= MAX_DEPTH) return;

    const next = extractCandidates(page.body, url)
      .filter((item) => !seen.has(item.url) && toOrigin(item.url) !== entry)
      .sort((a, b) => Number(b.priority) - Number(a.priority));

    for (const item of next) {
      if (state.match || seen.size >= MAX_PROBES || queue.length >= MAX_QUEUE) {
        break;
      }
      enqueue(item.url, depth + 1, item.priority);
    }
  };

  for (;;) {
    while (!state.match && queue.length > 0 && active.size < WORKERS) {
      const job = queue.shift();
      if (!job) break;
      const task = visit(job.url, job.depth, job.priority);
      active.add(task);
      void task
        .catch(() => {})
        .finally(() => {
          active.delete(task);
        });
    }

    if (state.match) break;
    if (active.size === 0) break;

    await Promise.race([matched, deadline, ...active]);
    if (Date.now() >= started + RESOLVE_DEADLINE) break;
  }

  // Rencana B: kalau shell SPA-nya tidak bisa diambil (mis. diblokir Cloudflare
  // untuk IP datacenter) tapi API-nya dilayani dari host yang sama, kita masih
  // bisa jalan tanpa perlu membaca bundle sama sekali.
  if (!state.match && expected === "cosmic") {
    const hosts = [...visited].slice(0, 6);
    const results = await Promise.all(hosts.map((h) => probeCosmicApi(h)));
    const hit = hosts.find((_, i) => results[i]);
    if (hit) {
      say(`! MATCH (fallback API) ${hit}`);
      return {
        entry,
        origin: hit,
        apiBase: hit,
        kind: "cosmic",
        resolvedAt: Date.now(),
      };
    }
  }

  return (
    state.match ??
    Promise.reject(
      new Error(
        `Tidak menemukan situs ${expected} yang bisa dibaca dari ${entry}. ` +
          `Pastikan halaman ${entry} masih punya tombol/menu ke situs baca komik.`,
      ),
    )
  );
}

function getSourceEntry(envKey: string): string {
  const raw = process.env[envKey];
  if (!raw || !raw.trim()) {
    throw new Error(`${envKey} tidak ditemukan di .env`);
  }
  return toOrigin(raw.trim());
}

async function resolveSource(
  envKey: string,
  expected: SourceKind,
): Promise<ResolvedSource> {
  const entry = getSourceEntry(envKey);
  const cacheKey = `${envKey}:${entry}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.resolvedAt < CACHE_TTL) return cached;

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    // 1) Nilai cadangan (kalau diisi) dicoba lebih dulu: ini host API-nya
    //    langsung, jadi tidak perlu menembus halaman challenge Cloudflare
    //    seperti auto-deteksi. Tetap diuji kelayakannya dulu, dan kalau
    //    sudah mati otomatis jatuh ke auto-deteksi.
    const override = await buildFromOverride(envKey, expected);
    if (override) {
      console.warn(
        `[resolve] ${envKey}: memakai ${OVERRIDE_KEYS[envKey]}=${override.apiBase} (auto-deteksi dilewati)`,
      );
      cache.set(cacheKey, override);
      return override;
    }

    // 2) Auto-deteksi: telusuri tombol di landing page sampai ketemu.
    let lastErr: unknown;

    for (let attempt = 1; attempt <= RESOLVE_ATTEMPTS; attempt++) {
      try {
        const source = await resolveFromEntry(entry, expected);
        cache.set(cacheKey, source);
        return source;
      } catch (err) {
        lastErr = err;
        if (attempt < RESOLVE_ATTEMPTS) {
          trace(`gagal (percobaan ${attempt}), mengulang...`);
          await sleep(400);
        }
      }
    }

    throw lastErr;
  })().finally(() => {
    inflight.delete(cacheKey);
  });

  inflight.set(cacheKey, task);
  return task;
}

/**
 * Nilai cadangan opsional. Auto-deteksi tetap jadi jalur utama; ini cuma
 * jaring pengaman untuk environment yang IP-nya diblokir sumber.
 */
const OVERRIDE_KEYS: Record<string, string> = {
  DOMAIN_KOMIK: "COSMIC_API_BASE",
  DOMAIN_KOMIK_H: "DOMAIN_KOMIK_H_ORIGIN",
};

async function buildFromOverride(
  envKey: string,
  expected: SourceKind,
): Promise<ResolvedSource | null> {
  const overrideKey = OVERRIDE_KEYS[envKey];
  const raw = overrideKey ? (process.env[overrideKey] ?? "").trim() : "";
  if (!raw) return null;

  const value = toOrigin(raw);
  const entry = getSourceEntry(envKey);

  if (expected === "cosmic") {
    if (!(await probeCosmicApi(value))) return null;
    return {
      entry,
      origin: value,
      apiBase: value,
      kind: "cosmic",
      resolvedAt: Date.now(),
    };
  }

  return {
    entry,
    origin: value,
    apiBase: value,
    kind: "wordpress",
    resolvedAt: Date.now(),
  };
}

export function invalidateSource(envKey: string): void {
  const entry = (process.env[envKey] || "").trim();
  cache.delete(`${envKey}:${toOrigin(entry)}`);
}

/**
 * Jalankan penelusuran dari nol sambil mengumpulkan lognya. Dipakai endpoint
 * `/api/resolve-debug` untuk melihat kenapa sebuah sumber tidak ditemukan di
 * server tertentu (mis. IP datacenter vs IP rumah).
 *
 * Melaporkan tiga hal terpisah supaya tidak menyesatkan: auto-deteksi, status
 * nilai cadangan, dan hasil efektif yang benar-benar dipakai aplikasi.
 */
export async function debugResolve(envKey: string): Promise<{
  envKey: string;
  expected: SourceKind;
  override: { key: string; configured: string | null; alive: boolean | null };
  auto: { resolved: ResolvedSource | null; error: string | null; log: string[] };
  effective: { resolved: ResolvedSource | null; error: string | null };
}> {
  const expected: SourceKind =
    envKey === "DOMAIN_KOMIK_H" ? "wordpress" : "cosmic";
  const overrideKey = OVERRIDE_KEYS[envKey] ?? "";
  const configured = (process.env[overrideKey] ?? "").trim() || null;

  const entry = getSourceEntry(envKey);
  const log: string[] = [];

  let auto: { resolved: ResolvedSource | null; error: string | null };
  try {
    const source = await resolveFromEntry(entry, expected, (m) => log.push(m));
    auto = { resolved: source, error: null };
  } catch (err) {
    auto = {
      resolved: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let alive: boolean | null = null;
  if (configured) {
    alive = (await buildFromOverride(envKey, expected)) !== null;
  }

  // Hasil efektif: jalur resolveSource sungguhan (override dulu, baru
  // auto-deteksi), setelah cache dibuang supaya benar-benar dihitung ulang.
  invalidateSource(envKey);
  let effective: { resolved: ResolvedSource | null; error: string | null };
  try {
    effective = { resolved: await resolveSource(envKey, expected), error: null };
  } catch (err) {
    effective = {
      resolved: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    envKey,
    expected,
    override: { key: overrideKey, configured, alive },
    auto: { ...auto, log },
    effective,
  };
}

export function resolvePrimarySource(): Promise<ResolvedSource> {
  return resolveSource("DOMAIN_KOMIK", "cosmic");
}

export function resolveSecondarySource(): Promise<ResolvedSource> {
  return resolveSource("DOMAIN_KOMIK_H", "wordpress");
}

export function invalidatePrimarySource(): void {
  invalidateSource("DOMAIN_KOMIK");
}

export function invalidateSecondarySource(): void {
  invalidateSource("DOMAIN_KOMIK_H");
}
