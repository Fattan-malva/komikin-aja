import { execSync } from "child_process";
import * as cheerio from "cheerio";
import { getDomainH } from "./utils";
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

interface WPSearchResult {
  id: number;
  title: string;
  url: string;
}

export async function searchKomikH(
  query: string,
  _page: number = 1,
  prefixSlug = true,
): Promise<KomikListResponse> {
  const domain = getDomainH();

  let results: WPSearchResult[] = [];
  try {
    const json = curl(
      `${domain}/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=20&type=post`,
    );
    results = JSON.parse(json);
  } catch {
    return { komik: [] };
  }
  if (!Array.isArray(results)) return { komik: [] };

  const komik: Komik[] = [];

  for (const item of results.slice(0, 15)) {
    const url = item.url.replace(/\/+$/, "");
    const slug = url.split("/").pop() || "";
    const prefixed = prefixSlug ? `h-${slug}` : slug;
    const entry: Komik = { slug: prefixed, title: item.title, thumbnail: "" };
    try {
      const html = curl(item.url);
      const $ = cheerio.load(html);
      entry.thumbnail = $("img.wp-post-image").first().attr("src") || $(".thumb img").first().attr("src") || "";
      $("table.infotable tbody tr").each((_, el) => {
        const label = $(el).find("td").first().text().trim().toLowerCase();
        const value = $(el).find("td").eq(1).text().trim();
        if (label === "status") entry.status = value;
        else if (label === "type") entry.type = value;
      });
      entry.rating = $(".num").first().text().trim();
    } catch {}
    komik.push(entry);
  }

  return { komik };
}

export async function getDetailH(rawSlug: string): Promise<Komik | null> {
  const domain = getDomainH();
  const html = curl(`${domain}/komik/${rawSlug}/`);
  const $ = cheerio.load(html);

  const title = $("h1.entry-title").first().text().trim() || $(".seriestuhead h1").first().text().trim();
  if (!title) return null;

  const thumbnail = $("img.wp-post-image").first().attr("src") || $(".thumb img").first().attr("src") || "";
  const synopsis = $('div[itemprop="description"]').first().text().trim();
  let type = "", status = "", author = "";

  $("table.infotable tbody tr").each((_, el) => {
    const label = $(el).find("td").first().text().trim().toLowerCase();
    const value = $(el).find("td").eq(1).text().trim();
    if (label === "status") status = value;
    else if (label === "type") type = value;
    else if (label === "author" || label === "posted by") author = value;
  });

  const genres: string[] = [];
  $(".seriestugenre a, a[rel='tag']").each((_, el) => {
    const genre = $(el).text().trim();
    if (genre && !genres.includes(genre)) genres.push(genre);
  });

  const chapters: Chapter[] = [];
  $(".eplister#chapterlist ul.clstyle li").each((_, el) => {
    const link = $(el).find("a").first();
    const chapterHref = link.attr("href") || "";
    const chapterSlug = chapterHref.replace(/\/+$/, "").split("/").pop() || "";
    const chapterText = $(el).find(".chapternum").first().text().trim();
    const chapterNum = chapterText.split(" ")[1] || chapterText || "";
    const chapterDate = $(el).find(".chapterdate").first().text().trim();
    if (chapterSlug) {
      chapters.push({ slug: chapterSlug, number: chapterNum, title: chapterText || undefined, date: chapterDate || undefined });
    }
  });

  return { slug: rawSlug, title, thumbnail, type, status, rating: $(".num").first().text().trim() || "", synopsis, genres, author, chapters };
}

export async function getGenreH(genre: string, page: number = 1): Promise<KomikListResponse> {
  const domain = getDomainH();
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
}

export async function getChapterImagesH(rawSlug: string, chapterSlug: string): Promise<ChapterDetail | null> {
  const domain = getDomainH();
  const html = curl(`${domain}/${chapterSlug}/`);

  const match = html.match(/ts_reader\.run\(({[\s\S]*?})\)/);
  if (!match) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match[1].replace(/!0/g, 'true').replace(/!1/g, 'false'));
  } catch {
    return null;
  }

  const sources = data.sources as Array<{ source?: string; images?: string[] }> | undefined;
  const images = sources?.[0]?.images || [];
  if (images.length === 0) return null;

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
}
