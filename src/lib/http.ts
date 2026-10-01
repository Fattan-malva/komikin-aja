import axios from "axios";
import type { AxiosResponse } from "axios";

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const client = axios.create({
  timeout: 20_000,
  maxRedirects: 6,
  headers: {
    "User-Agent": BROWSER_UA,
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  },
});

export interface TextResponse {
  body: string;
  /** URL setelah semua redirect, dipakai sebagai "domain aktif" berikutnya. */
  finalUrl: string;
}

function finalUrlOf(res: AxiosResponse, fallback: string): string {
  const raw = (res.request as { res?: { responseUrl?: string } } | undefined)?.res
    ?.responseUrl;
  return typeof raw === "string" && raw ? raw : fallback;
}

export async function getText(url: string, timeout = 20_000): Promise<TextResponse> {
  const res = await client.get<string>(url, {
    timeout,
    responseType: "text",
    transformResponse: [(data) => data],
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const body = typeof res.data === "string" ? res.data : String(res.data ?? "");
  return { body, finalUrl: finalUrlOf(res, url) };
}

export async function getJson<T>(url: string, timeout = 20_000): Promise<T> {
  const res = await client.get<T>(url, { timeout, responseType: "json" });
  return res.data;
}

export interface ProbeResponse {
  status: number;
  body: string;
  /** URL absolut tujuan redirect (3xx), kalau ada. */
  location?: string;
  headers: Record<string, string>;
}

function headerValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
}

/**
 * Fetch satu hop tanpa mengikuti redirect. Dipakai resolver saat menelusuri
 * domain: beberapa shortlink menjawab 302 dalam milidetik tapi_chain mengikuti
 * redirect-nya justru menggantung puluhan detik.
 */
export async function probe(
  url: string,
  timeout = 10_000,
): Promise<ProbeResponse> {
  const res = await client.get<string>(url, {
    timeout,
    maxRedirects: 0,
    responseType: "text",
    transformResponse: [(data) => data],
    validateStatus: () => true,
    headers: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
  });

  const body = typeof res.data === "string" ? res.data : "";
  const raw = res.headers["location"];
  const rawLocation = Array.isArray(raw) ? raw[0] : raw;

  let location: string | undefined;
  if (typeof rawLocation === "string" && rawLocation.trim()) {
    try {
      location = new URL(rawLocation, url).toString();
    } catch {
      location = undefined;
    }
  }

  return {
    status: res.status,
    body,
    location,
    headers: {
      server: headerValue(res.headers["server"]),
      "cf-mitigated": headerValue(res.headers["cf-mitigated"]),
      "cf-ray": headerValue(res.headers["cf-ray"]),
      "content-type": headerValue(res.headers["content-type"]),
    },
  };
}

/**
 * Error ini bisa diperbaiki dengan me-resolve ulang domain, jadi layak dicoba ulang.
 * Error HTTP 4xx (404, 403, dll) dianggap permanen.
 */
export function isTransientError(err: unknown): boolean {
  const response = (err as { response?: { status?: number } } | undefined)?.response;
  if (!response) return true;
  const status = response.status;
  return typeof status !== "number" || status >= 500;
}

export function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

/** Jalankan task dengan batas konkurensi supaya server sumber tidak dibanjiri. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index], index);
      } catch {
        results[index] = undefined as R;
      }
    }
  });

  await Promise.all(runners);
  return results;
}
