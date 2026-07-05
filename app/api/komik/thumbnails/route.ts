import { exec } from "child_process";
import * as cheerio from "cheerio";
import { getDomainH } from "@/src/lib/utils";

const CF_COOKIE_H = process.env.CF_COOKIE_H || "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

function curlAsync(url: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve) => {
    const cookieArg = CF_COOKIE_H ? `-H 'Cookie: cf_clearance=${CF_COOKIE_H}'` : "";
    const cmd = `curl -s --compressed --max-time ${Math.floor(timeoutMs / 1000)} -H 'User-Agent: ${UA}' ${cookieArg} '${url}'`;
    exec(cmd, { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) resolve("");
      else resolve(stdout);
    });
  });
}

function extractThumb(html: string): string {
  if (!html || html.includes("Just a moment")) return "";
  const $ = cheerio.load(html);
  return (
    $("img.wp-post-image").first().attr("src") ||
    $(".thumb img").first().attr("src") ||
    ""
  );
}

async function fetchThumbForSlug(domain: string, rawSlug: string): Promise<string> {
  const promises = ["/komik/", "/manga/"].map(async (prefix) => {
    const html = await curlAsync(`${domain}${prefix}${rawSlug}/`);
    return extractThumb(html);
  });
  const results = await Promise.all(promises);
  return results.find((t) => t.length > 0) || "";
}

export async function POST(request: Request) {
  try {
    const { slugs } = (await request.json()) as { slugs: string[] };
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return Response.json({ thumbnails: {} });
    }

    const domain = getDomainH();
    const limited = slugs.slice(0, 30);

    const entries = await Promise.all(
      limited.map(async (slug) => {
        const rawSlug = slug.replace(/^h-/, "");
        const thumb = await fetchThumbForSlug(domain, rawSlug);
        return [slug, thumb] as const;
      }),
    );

    const thumbnails: Record<string, string> = {};
    for (const [slug, thumb] of entries) {
      if (thumb) thumbnails[slug] = thumb;
    }

    return Response.json({ thumbnails });
  } catch {
    return Response.json({ thumbnails: {} });
  }
}
