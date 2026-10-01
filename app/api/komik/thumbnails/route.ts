import { mapWithConcurrency } from "@/src/lib/http";
import { getThumbnailH } from "@/src/lib/scrapper-h";

export async function POST(request: Request) {
  try {
    const { slugs } = (await request.json()) as { slugs?: string[] };
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return Response.json({ thumbnails: {} });
    }

    const limited = slugs.slice(0, 30);
    const entries = await mapWithConcurrency(limited, 5, async (slug) => {
      const thumb = await getThumbnailH(slug.replace(/^h-/, ""));
      return [slug, thumb] as const;
    });

    const thumbnails: Record<string, string> = {};
    for (const entry of entries) {
      if (entry) thumbnails[entry[0]] = entry[1];
    }

    return Response.json({ thumbnails });
  } catch {
    return Response.json({ thumbnails: {} });
  }
}
