import { execSync } from "child_process";
import * as cheerio from "cheerio";
import { getDomainsH } from "./utils";
import type { Komik, Chapter, ChapterDetail, KomikListResponse } from "@/src/types";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
const CURL_OPTS = `-s --compressed -H 'User-Agent: ${UA}' -H 'Accept: application/json, text/html, */*'`;

function curl(url: string): string {
  return execSync(`curl ${CURL_OPTS} ${JSON.stringify(url)}`, {
    timeout: 15000,
    encoding: "utf-8",
    maxBuffer: 5 * 1024 * 1024,
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

function parseDetailFromHtml(html: string): { thumbnail: string; type: string; status: string; rating: string; author: string } {
  const $ = cheerio.load(html);
  const thumbnail = $("img.wp-post-image").first().attr("src") || $(".thumb img").first().attr("src") || "";
  let type = "", status = "", author = "";
  $(".imptdt").each((_, el) => {
    const label = $(el).contents().first().text().trim().toLowerCase();
    const value = $(el).find("i, a, span").first().text().trim();
    if (label === "status") status = value;
    else if (label === "type") type = value;
    else if (label === "author") author = value;
  });
  const rating = $(".num").first().text().trim();
  return { thumbnail, type, status, rating, author };
}

export async function searchKomikH(
  query: string,
  page: number = 1,
  prefixSlug = true,
): Promise<KomikListResponse> {
  return tryDomains((domain) => {
    let results: Array<{ id: number; title: string; url: string }> = [];
    try {
      const json = curl(
        `${domain}/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=50&page=${page}&type=post`,
      );
      results = JSON.parse(json);
    } catch {
      return { komik: [] };
    }
    if (!Array.isArray(results)) return { komik: [] };

    const komik: Komik[] = [];
    const batch = results.slice(0, 30);

    const BATCH_SIZE = 5;
    for (let i = 0; i < batch.length; i += BATCH_SIZE) {
      const slice = batch.slice(i, i + BATCH_SIZE);
      const pages = slice.map((item) => {
        const url = item.url.replace(/\/+$/, "");
        const slug = url.split("/").pop() || "";
        const prefixed = prefixSlug ? `h-${slug}` : slug;
        const entry: Komik = { slug: prefixed, title: item.title, thumbnail: "" };
        try {
          const html = curl(item.url);
          const parsed = parseDetailFromHtml(html);
          entry.thumbnail = parsed.thumbnail;
          entry.type = parsed.type;
          entry.status = parsed.status;
          entry.rating = parsed.rating;
        } catch {}
        return entry;
      });
      komik.push(...pages);
    }

    return { komik };
  }, { komik: [] });
}

export async function getDetailH(rawSlug: string): Promise<Komik | null> {
  return tryDomains((domain) => {
    const html = curl(`${domain}/manga/${rawSlug}/`);
    const $ = cheerio.load(html);

    const title = $("h1.entry-title").first().text().trim();
    if (!title) return null;

    const thumbnail = $("img.wp-post-image").first().attr("src") || $(".thumb img").first().attr("src") || "";
    const synopsis = $('.entry-content-single, div[itemprop="description"]').first().text().trim();
    let type = "", status = "", author = "";

    $(".imptdt").each((_, el) => {
      const label = $(el).contents().first().text().trim().toLowerCase();
      const value = $(el).find("i, a, span").first().text().trim();
      if (label === "status") status = value;
      else if (label === "type") type = value;
      else if (label === "author") author = value;
    });

    const genres: string[] = [];
    $(".wd-full .mgen a, a[rel='tag']").each((_, el) => {
      const genre = $(el).text().trim();
      if (genre && !genres.includes(genre)) genres.push(genre);
    });

    const chapters: Chapter[] = [];
    $(".eplister#chapterlist li").each((_, el) => {
      const link = $(el).find("a").first();
      const chapterHref = link.attr("href") || "";
      const chapterSlug = chapterHref.replace(/\/+$/, "").split("/").pop() || "";
      const chapterText = $(el).find(".chapternum").first().text().trim();
      const chapterDate = $(el).find(".chapterdate").first().text().trim();
      if (chapterSlug) {
        chapters.push({ slug: chapterSlug, number: chapterText, title: chapterText || undefined, date: chapterDate || undefined });
      }
    });

    return { slug: rawSlug, title, thumbnail, type, status, rating: $(".num").first().text().trim() || "", synopsis, genres, author, chapters };
  }, null);
}

export async function getGenreH(genre: string, page: number = 1): Promise<KomikListResponse> {
  return tryDomains((domain) => {
    const url = page > 1
      ? `${domain}/genres/${genre}/page/${page}/`
      : `${domain}/genres/${genre}/`;
    const html = curl(url);
    const $ = cheerio.load(html);

    const komik: Komik[] = [];
    $(".listupd .bsx").each((_, el) => {
      const link = $(el).find("a").first();
      const href = link.attr("href") || "";
      const slug = href.replace(/\/+$/, "").split("/").pop() || "";
      if (!slug) return;
      const title = link.attr("title") || $(el).find(".tt").text().trim() || "";
      const thumbnail = $(el).find("img").first().attr("src") || "";
      if (title) {
        komik.push({ slug: `h-${slug}`, title, thumbnail });
      }
    });

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
      .filter((n) => n > 0);
    if (nums.length > 0) totalPages = Math.max(...nums);

    return { komik, totalPages, currentPage: page };
  }, { komik: [], totalPages: 1, currentPage: page });
}

export async function getChapterImagesH(rawSlug: string, chapterSlug: string): Promise<ChapterDetail | null> {
  let lastError: unknown;

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
      const prev = prevUrl ? prevUrl.replace(/\/+$/, "").split("/").pop() || "" : "";
      const next = nextUrl ? nextUrl.replace(/\/+$/, "").split("/").pop() || "" : "";

      let chapters: Chapter[] = [];
      try {
        const detail = await getDetailH(rawSlug);
        if (detail?.chapters) chapters = detail.chapters;
      } catch {}

      return { images, prev, next, chapters };
    } catch (e) {
      lastError = e;
    }
  }

  return null;
}
