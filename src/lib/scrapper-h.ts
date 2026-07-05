import { execSync } from "child_process";
import * as cheerio from "cheerio";
import { getDomainsH } from "./utils";
import type { Komik, Chapter, ChapterDetail, KomikListResponse } from "@/src/types";

const CF_COOKIE_H = process.env.CF_COOKIE_H || "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
const CURL_OPTS = `-s --compressed -H 'User-Agent: ${UA}' -H 'Accept: application/json, text/html, */*'${CF_COOKIE_H ? ` -H 'Cookie: ${CF_COOKIE_H}'` : ""}`;

function curl(url: string, timeoutMs = 30000): string {
  return execSync(`curl ${CURL_OPTS} ${JSON.stringify(url)}`, {
    timeout: timeoutMs,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function tryDomains<T>(fn: (domain: string) => T, fallbackValue: T): T {
  const domains = getDomainsH();
  for (const domain of domains) {
    try {
      return fn(domain);
    } catch {
      continue;
    }
  }
  return fallbackValue;
}

function extractSlug(url: string): string {
  return url.replace(/\/+$/, "").split("/").pop() || "";
}

function parseBsxList(html: string): Komik[] {
  const $ = cheerio.load(html);
  const komik: Komik[] = [];
  $(".listupd .bsx").each((_, el) => {
    const link = $(el).find("a").first();
    const href = link.attr("href") || "";
    const slug = extractSlug(href);
    if (!slug) return;
    const title = link.attr("title") || $(el).find(".tt").text().trim() || "";
    const thumbnail = $(el).find("img").first().attr("src") || "";
    if (title) {
      komik.push({ slug: `h-${slug}`, title, thumbnail });
    }
  });
  return komik;
}

function parseDetailFromHtml(html: string) {
  const $ = cheerio.load(html);
  const thumbnail = $("img.wp-post-image").first().attr("src") || $(".thumb img").first().attr("src") || "";
  let type = "", status = "", author = "";
  $("table.infotable tr").each((_, el) => {
    const label = $(el).find("td").first().text().trim().toLowerCase();
    const value = $(el).find("td").eq(1).text().trim();
    if (label === "status") status = value;
    else if (label === "type") type = value;
    else if (label === "author") author = value;
  });
  if (!status || !type) {
    $(".imptdt").each((_, el) => {
      const label = $(el).contents().first().text().trim().toLowerCase();
      const value = $(el).find("i, a, span").first().text().trim();
      if (!status && label === "status") status = value;
      else if (!type && label === "type") type = value;
      else if (!author && label === "author") author = value;
    });
  }
  return { thumbnail, type, status, rating: $(".num").first().text().trim(), author };
}

function fetchThumbnailForSlug(domain: string, slug: string): string {
  try {
    for (const prefix of ["/komik/", "/manga/"]) {
      const html = curl(`${domain}${prefix}${slug}/`);
      const $ = cheerio.load(html);
      const thumb = $("img.wp-post-image").first().attr("src") || $(".thumb img").first().attr("src") || "";
      if (thumb) return thumb;
    }
  } catch {}
  return "";
}

export async function searchKomikH(
  query: string,
  page: number = 1,
  prefixSlug = true,
): Promise<KomikListResponse> {
  return tryDomains((domain) => {
    const komik: Komik[] = [];

    // 1. Try HTML search page with cookie (Cloudflare bypass)
    try {
      const searchUrl = page > 1
        ? `${domain}/page/${page}/?s=${encodeURIComponent(query)}`
        : `${domain}/?s=${encodeURIComponent(query)}`;
      const html = curl(searchUrl);
      const fromHtml = parseBsxList(html);
      if (fromHtml.length > 0) {
        for (const item of fromHtml) {
          komik.push({
            slug: prefixSlug ? item.slug : item.slug.replace(/^h-/, ""),
            title: item.title,
            thumbnail: item.thumbnail,
          });
        }
        return { komik };
      }
    } catch {}

    // 2. Fallback: WP REST API — return title+slug instantly, skip thumbnails
    try {
      const json = curl(
        `${domain}/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=30&page=${page}&type=post`,
      );
      const results: Array<{ id: number; title: string; url: string }> = JSON.parse(json);
      if (Array.isArray(results)) {
        for (const item of results) {
          const slug = extractSlug(item.url);
          if (slug) {
            komik.push({
              slug: prefixSlug ? `h-${slug}` : slug,
              title: item.title,
              thumbnail: "",
            });
          }
        }
      }
    } catch {}

    return { komik };
  }, { komik: [] });
}

export async function searchKomikHWithThumbnail(
  query: string,
  page: number = 1,
  prefixSlug = true,
): Promise<KomikListResponse> {
  const base = await searchKomikH(query, page, false);
  if (base.komik.length === 0) return base;

  return tryDomains((domain) => {
    // Fetch thumbnails in parallel batches of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < base.komik.length; i += BATCH_SIZE) {
      const batch = base.komik.slice(i, i + BATCH_SIZE);
      batch.forEach((item) => {
        if (!item.thumbnail) {
          const rawSlug = item.slug.replace(/^h-/, "");
          item.thumbnail = fetchThumbnailForSlug(domain, rawSlug);
        }
        if (prefixSlug && !item.slug.startsWith("h-")) {
          item.slug = `h-${item.slug}`;
        }
      });
    }
    return base;
  }, base);
}

export async function getDetailH(rawSlug: string): Promise<Komik | null> {
  return tryDomains((domain) => {
    for (const prefix of ["/komik/", "/manga/"]) {
      try {
        const html = curl(`${domain}${prefix}${rawSlug}/`);
        const $ = cheerio.load(html);
        const title = $("h1.entry-title").first().text().trim();
        if (!title) continue;

        const parsed = parseDetailFromHtml(html);
        const synopsis = $('.entry-content-single, div[itemprop="description"]').first().text().trim();

        const genres: string[] = [];
        $(".wd-full .mgen a, a[rel='tag']").each((_, el) => {
          const genre = $(el).text().trim();
          if (genre && !genres.includes(genre)) genres.push(genre);
        });

        const chapters: Chapter[] = [];
        $(".eplister#chapterlist li").each((_, el) => {
          const link = $(el).find("a").first();
          const chapterHref = link.attr("href") || "";
          const chapterSlug = extractSlug(chapterHref);
          const chapterText = $(el).find(".chapternum").first().text().trim();
          const chapterDate = $(el).find(".chapterdate").first().text().trim();
          if (chapterSlug) {
            chapters.push({ slug: chapterSlug, number: chapterText, title: chapterText || undefined, date: chapterDate || undefined });
          }
        });

        return {
          slug: rawSlug, title,
          thumbnail: parsed.thumbnail,
          type: parsed.type, status: parsed.status,
          rating: parsed.rating || "",
          synopsis, genres, author: parsed.author, chapters,
        };
      } catch {}
    }
    return null;
  }, null);
}

export async function getGenreH(genre: string, page: number = 1): Promise<KomikListResponse> {
  return tryDomains((domain) => {
    const url = page > 1
      ? `${domain}/genres/${genre}/page/${page}/`
      : `${domain}/genres/${genre}/`;
    const html = curl(url);
    const komik = parseBsxList(html);

    const $ = cheerio.load(html);
    let totalPages = 1;
    const nums = $(".pagination .page-numbers")
      .map((_, el) => {
        const href = $(el).attr("href") || "";
        const m = href.match(/\/page\/(\d+)\//);
        if (m) return parseInt(m[1]);
        const n = parseInt($(el).text().trim());
        return isNaN(n) ? 0 : n;
      })
      .get()
      .filter((n: number) => n > 0);
    if (nums.length > 0) totalPages = Math.max(...nums);

    return { komik, totalPages, currentPage: page };
  }, { komik: [], totalPages: 1, currentPage: page });
}

export async function getChapterImagesH(rawSlug: string, chapterSlug: string): Promise<ChapterDetail | null> {
  const domains = getDomainsH();
  for (const domain of domains) {
    try {
      const html = curl(`${domain}/${chapterSlug}/`);
      const match = html.match(/ts_reader\.run\(({[\s\S]*?})\)/);
      if (!match) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(match[1].replace(/!0/g, 'true').replace(/!1/g, 'false'));
      } catch {
        continue;
      }

      const sources = data.sources as Array<{ source?: string; images?: string[] }> | undefined;
      const images = sources?.[0]?.images || [];
      if (images.length === 0) continue;

      const prevUrl = (data.prevUrl as string) || "";
      const nextUrl = (data.nextUrl as string) || "";
      const prev = prevUrl ? extractSlug(prevUrl) : "";
      const next = nextUrl ? extractSlug(nextUrl) : "";

      let chapters: Chapter[] = [];
      try {
        const detail = await getDetailH(rawSlug);
        if (detail?.chapters) chapters = detail.chapters;
      } catch {}

      return { images, prev, next, chapters };
    } catch {}
  }

  return null;
}
