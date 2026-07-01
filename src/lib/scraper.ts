import axios from "axios";
import * as cheerio from "cheerio";
import { getDomain, computeRelevance } from "./utils";
import type {
  Komik,
  Chapter,
  ChapterDetail,
  KomikListResponse,
  Genre,
} from "@/src/types";

const CF_COOKIE = process.env.CF_COOKIE || "";

const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ...(CF_COOKIE ? { Cookie: CF_COOKIE } : {}),
  },
});

function parseKomikCards(html: string): Komik[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const komik: Komik[] = [];

  $("#project-list > div, #latest-list > div").each((_, el) => {
    const card = $(el);
    const link = card.find('a[color="primary"]').first();
    const href = link.attr("href") || "";
    const slug = href.split("/manga/")[1]?.replace(/\/$/, "") || "";
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title = card.find("h1.text-\\[15px\\]").first().text().trim();
    const thumbnail = card.find("img.wp-post-image").first().attr("src") || "";
    const rating = card.find("div.numscore").first().text().trim();
    const status = card
      .find("div.flex.items-center.gap-1.font-normal.text-xs > p")
      .first()
      .text()
      .trim();
    const chapterLink = card.find("a.link-self").first();
    const chapterUrl = chapterLink.attr("href") || "";
    const date = card.find("time").first().attr("datetime") || "";
    const rawType = card.find("span.absolute.z-1 img").first().attr("alt")?.trim() || "";
    const type = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : "";

    if (title) {
      komik.push({
        slug,
        title,
        thumbnail,
        type,
        rating,
        status,
        latestChapter: chapterUrl.split("/").filter(Boolean).pop() || "",
        date,
      });
    }
  });

  return komik;
}

export async function getHome(page: number = 1): Promise<KomikListResponse> {
  const domain = getDomain();
  const url = page === 1 ? domain : `${domain}/page/${page}/`;
  const { data } = await axiosInstance.get(url);
  const komik = parseKomikCards(data);

  const $ = cheerio.load(data);
  let totalPages = 1;
  const pageLinks = $("a.page-numbers:not(.next):not(.prev)");
  if (pageLinks.length > 0) {
    const nums = pageLinks
      .map((_, el) => parseInt($(el).text().trim()))
      .get()
      .filter((n) => !isNaN(n));
    if (nums.length > 0) totalPages = Math.max(...nums);
  }

  return { komik, totalPages, currentPage: page };
}

export async function getPopular(page: number = 1): Promise<KomikListResponse> {
  const domain = getDomain();
  const nonce = await getSearchNonce();

  const params = new URLSearchParams();
  params.append("nonce", nonce);
  params.append("page", String(page));
  params.append("order", "desc");
  params.append("orderby", "popular");

  const { data } = await axiosInstance.post(
    `${domain}/wp-admin/admin-ajax.php?action=advanced_search`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const $ = cheerio.load(data);
  const seen = new Set<string>();
  const komik: Komik[] = [];

  $("div.group-data-\\[mode\\=horizontal\\]\\:hidden").each((_, el) => {
    const card = $(el);
    const link = card.find('a[color="primary"]').first();
    const href = link.attr("href") || "";
    const slug = href.split("/manga/")[1]?.replace(/\/$/, "") || "";
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title = card.find("h1.text-\\[15px\\]").first().text().trim();
    const thumbnail = card.find("img.wp-post-image").first().attr("src") || "";
    const rating = card.find("div.numscore").first().text().trim();
    const rawType = card.find("span.absolute.z-1 img").first().attr("alt")?.trim() || "";
    const type = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : "";

    if (title) {
      komik.push({ slug, title, thumbnail, type, rating });
    }
  });

  return { komik, currentPage: page };
}

export async function getByType(
  type: string,
  page: number = 1,
): Promise<KomikListResponse> {
  const domain = getDomain();
  const nonce = await getSearchNonce();

  // Map type to the format expected by the API
  const typeMap: Record<string, string> = {
    manhwa: "Manhwa",
    manga: "Manga",
    manhua: "Manhua",
  };

  const searchType = typeMap[type.toLowerCase()] || type;

  const params = new URLSearchParams();
  params.append("nonce", nonce);
  params.append("type", JSON.stringify([searchType]));
  params.append("page", String(page));
  params.append("order", "desc");
  params.append("orderby", "popular");

  const { data } = await axiosInstance.post(
    `${domain}/wp-admin/admin-ajax.php?action=advanced_search`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const $ = cheerio.load(data);
  const seen = new Set<string>();
  const komik: Komik[] = [];

  $("div.group-data-\\[mode\\=horizontal\\]\\:hidden").each((_, el) => {
    const card = $(el);
    const link = card.find('a[color="primary"]').first();
    const href = link.attr("href") || "";
    const slug = href.split("/manga/")[1]?.replace(/\/$/, "") || "";
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title = card.find("h1.text-\\[15px\\]").first().text().trim();
    const thumbnail = card.find("img.wp-post-image").first().attr("src") || "";
    const rating = card.find("div.numscore").first().text().trim();
    const status = card.find("p.font-normal.text-xs").last().text().trim();
    const rawType = card.find("span.absolute.z-1 img").first().attr("alt")?.trim() || "";
    const itemType = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : "";

    if (title) {
      komik.push({ slug, title, thumbnail, type: itemType, rating, status });
    }
  });

  let totalPages = 1;
  const pageBtns = $('button[onclick*="addSingularFilter"]').filter((_, el) => {
    return /'addSingularFilter'\]\('page',\s*'(\d+)'/i.test(
      $(el).attr("onclick") || "",
    );
  });
  const nums = pageBtns
    .map((_, el) => {
      const m = $(el)
        .attr("onclick")
        ?.match(/'addSingularFilter'\]\('page',\s*'(\d+)'/i);
      return m ? parseInt(m[1]) : NaN;
    })
    .get()
    .filter((n) => !isNaN(n));
  if (nums.length > 0) totalPages = Math.max(...nums);

  return { komik, totalPages, currentPage: page };
}

// Fungsi spesifik untuk masing-masing tipe
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
  const domain = getDomain();
  const url = `${domain}/manga/${slug}/`;
  const { data } = await axiosInstance.get(url);
  const $ = cheerio.load(data);

  const title = $('h1[itemprop="name"]').first().text().trim();
  if (!title) return null;

  const thumbnail = $("img.wp-post-image").first().attr("src") || "";
  const synopsis = $('div[itemprop="description"][data-show="true"]')
    .first()
    .text()
    .trim();
  const rating = $('li:has([data-lucide="star"]) span.font-bold')
    .first()
    .text()
    .trim();

  const genres: string[] = [];
  $('a[itemprop="genre"]').each((_, el) => {
    const genre = $(el).find("span.flex-1").first().text().trim();
    if (genre) genres.push(genre);
  });

  let type = "";
  let status = "";
  let author = "";
  let released = "";
  $("div.flex.sm\\:justify-between.justify-start.items-center.gap-2").each(
    (_, el) => {
      const row = $(el);
      const label = row
        .find("span.font-semibold")
        .first()
        .text()
        .trim()
        .toLowerCase();
      const value = row.find("p.font-normal.text-sm").first().text().trim();
      if (label === "type") type = value;
      else if (label === "status") status = value;
      else if (label === "author") author = value;
      else if (label === "released") released = value;
    },
  );

  if (!status) {
    status = $("div.flex.items-center.gap-1.font-normal.text-xs > p")
      .first()
      .text()
      .trim();
  }

  let chapters: Chapter[] = [];
  const chapterListEl = $("#chapter-list");
  chapterListEl.find('div[data-chapter-number]').each((_, el) => {
    const chapterDiv = $(el);
    const number = chapterDiv.attr("data-chapter-number") || "";
    const link = chapterDiv.find("a[href*='/manga/']").first();
    const href = link.attr("href") || "";
    const slug = href.split("/").filter(Boolean).pop()?.replace(/\/$/, "") || "";
    const title = chapterDiv.find("span").first().text().trim() || undefined;
    const date = chapterDiv.find("time").first().attr("datetime") || undefined;

    if (slug && number) {
      chapters.push({ slug, number, title, date });
    }
  });

  if (chapters.length === 0) {
    const hxGet = chapterListEl.attr("hx-get");
    if (hxGet) {
      const params = new URLSearchParams(hxGet.split("?")[1]);
      const mangaId = params.get("manga_id") || "";
      if (mangaId) {
        try {
          chapters = await getChapterList(mangaId);
        } catch {
          chapters = [];
        }
      }
    }
  }

  return {
    slug,
    title,
    thumbnail,
    type,
    status,
    rating,
    synopsis,
    genres,
    author,
    chapters,
  };
}

// src/lib/scraper.ts

export async function getChapterList(mangaId: string): Promise<Chapter[]> {
  const domain = getDomain();
  const seenAll = new Set<string>();
  const allChapters: Chapter[] = [];
  const BATCH_SIZE = 5;
  const MAX_PAGES = 10;
  let page = 1;

  while (page <= MAX_PAGES) {
    const batchEnd = Math.min(page + BATCH_SIZE - 1, MAX_PAGES);
    const batch: Promise<{ page: number; chapters: Chapter[] }>[] = [];

    for (let p = page; p <= batchEnd; p++) {
      const url = `${domain}/wp-admin/admin-ajax.php?manga_id=${mangaId}&page=${p}&action=chapter_list&_=${Date.now()}`;
      batch.push(
        axiosInstance
          .get(url, {
            headers: {
              Referer: `${domain}/manga/`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          })
          .then(({ data }) => {
            const $ = cheerio.load(data);
            const chapters: Chapter[] = [];
            const seenLocal = new Set<string>();

            $("a").each((_, el) => {
              const href = $(el).attr("href") || "";
              const slug = href.split("/").filter(Boolean).pop() || "";
              const match = slug.match(/^chapter-([\d.]+)$/);
              if (match && !seenLocal.has(slug)) {
                seenLocal.add(slug);
                chapters.push({
                  slug,
                  number: match[1],
                  title: $(el).text().trim() || undefined,
                });
              }
            });

            return { page: p, chapters };
          })
          .catch(() => ({ page: p, chapters: [] as Chapter[] })),
      );
    }

    const results = await Promise.all(batch);
    let anyEmpty = false;

    for (const result of results) {
      if (result.chapters.length === 0) {
        anyEmpty = true;
        break;
      }
      let newCount = 0;
      for (const ch of result.chapters) {
        if (!seenAll.has(ch.slug)) {
          seenAll.add(ch.slug);
          newCount++;
          allChapters.push(ch);
        }
      }
      if (newCount === 0) {
        anyEmpty = true;
        break;
      }
    }

    if (anyEmpty) break;
    page = batchEnd + 1;
  }

  return allChapters;
}

export async function getChapterImages(
  slug: string,
  chapterSlug: string,
): Promise<ChapterDetail | null> {
  const domain = getDomain();
  const url = `${domain}/manga/${slug}/${chapterSlug}/`;
  const { data } = await axiosInstance.get(url);
  const $ = cheerio.load(data);

  const images: string[] = [];
  $('section[data-image-data="1"] img').each((_, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src);
  });

  if (images.length === 0) return null;

  let prev = "";
  let next = "";
  const prevBtn = $("#previous-chapter");
  const nextBtn = $("#next-chapter");
  const prevOnClick = prevBtn.attr("onclick") || "";
  const nextOnClick = nextBtn.attr("onclick") || "";
  const prevMatch = prevOnClick.match(/href='([^']+)'/);
  const nextMatch = nextOnClick.match(/href='([^']+)'/);
  if (prevMatch) prev = prevMatch[1].split("/").filter(Boolean).pop() || "";
  if (nextMatch) next = nextMatch[1].split("/").filter(Boolean).pop() || "";

  let chapters: Chapter[] = [];
  const chapterListEl = $("#chapter-list");
  const hxGet = chapterListEl.attr("hx-get");
  if (hxGet) {
    const params = new URLSearchParams(hxGet.split("?")[1]);
    const mangaId = params.get("manga_id") || "";
    if (mangaId) {
      try {
        chapters = await getChapterList(mangaId);
      } catch {
        chapters = [];
      }
    }
  }

  if (chapters.length === 0) {
    try {
      const detail = await getDetail(slug);
      if (detail?.chapters) {
        chapters = detail.chapters;
      }
    } catch {
      chapters = [];
    }
  }

  return { images, prev, next, chapters };
}

export async function searchKomik(
  query: string,
  page: number = 1,
): Promise<KomikListResponse> {
  const domain = getDomain();
  const nonce = await getSearchNonce();

  const params = new URLSearchParams();
  params.append("nonce", nonce);
  params.append("search_term", query);
  params.append("page", String(page));
  params.append("order", "desc");
  params.append("orderby", "relevance");

  const { data } = await axiosInstance.post(
    `${domain}/wp-admin/admin-ajax.php?action=advanced_search`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const $ = cheerio.load(data);
  const seen = new Set<string>();
  const komik: Komik[] = [];

  $("div.group-data-\\[mode\\=horizontal\\]\\:hidden").each((_, el) => {
    const card = $(el);
    const link = card.find('a[color="primary"]').first();
    const href = link.attr("href") || "";
    const slug = href.split("/manga/")[1]?.replace(/\/$/, "") || "";
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title = card.find("h1.text-\\[15px\\]").first().text().trim();
    const thumbnail = card.find("img.wp-post-image").first().attr("src") || "";
    const rating = card.find("div.numscore").first().text().trim();
    const status = card.find("p.font-normal.text-xs").last().text().trim();
    const rawType = card.find("span.absolute.z-1 img").first().attr("alt")?.trim() || "";
    const type = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : "";

    if (title) {
      komik.push({ slug, title, thumbnail, type, rating, status });
    }
  });

  komik.sort((a, b) => {
    const relA = computeRelevance(a.title, query);
    const relB = computeRelevance(b.title, query);
    if (relA !== relB) return relB - relA;
    return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
  });

  let totalPages = 1;
  const pageBtns = $('button[onclick*="addSingularFilter"]').filter((_, el) => {
    return /'addSingularFilter'\]\('page',\s*'(\d+)'/i.test(
      $(el).attr("onclick") || "",
    );
  });
  const nums = pageBtns
    .map((_, el) => {
      const m = $(el)
        .attr("onclick")
        ?.match(/'addSingularFilter'\]\('page',\s*'(\d+)'/i);
      return m ? parseInt(m[1]) : NaN;
    })
    .get()
    .filter((n) => !isNaN(n));
  if (nums.length > 0) totalPages = Math.max(...nums);

  return { komik, totalPages, currentPage: page };
}

let cachedNonce = "";

async function getSearchNonce(): Promise<string> {
  if (cachedNonce) return cachedNonce;
  const domain = getDomain();
  const { data } = await axiosInstance.get(domain);
  const match = data.match(/nonce=([a-f0-9]+)/);
  if (match) {
    cachedNonce = match[1];
    return cachedNonce;
  }
  return "";
}

export async function getGenreList(): Promise<Genre[]> {
  const domain = getDomain();
  const seen = new Set<string>();
  const genres: Genre[] = [];

  try {
    const homeData = await getHome(1);
    const slugs = homeData.komik.slice(0, 20).map((k) => k.slug);

    const results = await Promise.allSettled(
      slugs.map((slug) =>
        axiosInstance.get(`${domain}/manga/${slug}/`).then(({ data }) => {
          const $ = cheerio.load(data);
          const out: Genre[] = [];
          $('a[itemprop="genre"]').each((_, el) => {
            const href = $(el).attr("href") || "";
            const slug2 = href.split("/genre/")[1]?.replace(/\/$/, "") || "";
            const name =
              $(el).find("span.flex-1").first().text().trim() ||
              $(el).text().trim();
            if (slug2 && name && !seen.has(slug2)) {
              seen.add(slug2);
              out.push({ slug: slug2, name });
            }
          });
          return out;
        }),
      ),
    );

    for (const r of results) {
      if (r.status === "fulfilled") genres.push(...r.value);
    }
  } catch {
    // Return whatever genres were collected, or empty array
  }

  return genres;
}

export async function getGenre(
  genre: string,
  page: number = 1,
): Promise<KomikListResponse> {
  const domain = getDomain();
  const nonce = await getSearchNonce();

  const params = new URLSearchParams();
  params.append("nonce", nonce);
  params.append("genre", JSON.stringify([genre]));
  params.append("page", String(page));
  params.append("order", "desc");
  params.append("orderby", "popular");

  const { data } = await axiosInstance.post(
    `${domain}/wp-admin/admin-ajax.php?action=advanced_search`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  const $ = cheerio.load(data);
  const seen = new Set<string>();
  const komik: Komik[] = [];

  $("div.group-data-\\[mode\\=horizontal\\]\\:hidden").each((_, el) => {
    const card = $(el);
    const link = card.find('a[color="primary"]').first();
    const href = link.attr("href") || "";
    const slug = href.split("/manga/")[1]?.replace(/\/$/, "") || "";
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title = card.find("h1.text-\\[15px\\]").first().text().trim();
    const thumbnail = card.find("img.wp-post-image").first().attr("src") || "";
    const rating = card.find("div.numscore").first().text().trim();
    const status = card.find("p.font-normal.text-xs").last().text().trim();
    const rawType = card.find("span.absolute.z-1 img").first().attr("alt")?.trim() || "";
    const type = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : "";

      if (title) {
        komik.push({ slug, title, thumbnail, type, rating, status });
      }
    });

    let totalPages = 1;
    const pageBtns = $('button[onclick*="addSingularFilter"]').filter((_, el) => {
      return /'addSingularFilter'\]\('page',\s*'(\d+)'/i.test(
        $(el).attr("onclick") || "",
      );
    });
    const nums = pageBtns
      .map((_, el) => {
        const m = $(el)
          .attr("onclick")
          ?.match(/'addSingularFilter'\]\('page',\s*'(\d+)'/i);
        return m ? parseInt(m[1]) : NaN;
      })
      .get()
      .filter((n) => !isNaN(n));
    if (nums.length > 0) totalPages = Math.max(...nums);

    return { komik, totalPages, currentPage: page };
  }
