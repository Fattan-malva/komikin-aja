import { createHmac } from "node:crypto";
import { resolvePrimarySource } from "@/src/lib/resolve";

interface SessionResponse {
  success?: boolean;
  data?: {
    sessionId?: string;
    axisKeys?: string[];
  };
}

function decodeHex(value: string): Buffer {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) {
    throw new Error("Invalid image session key");
  }
  return Buffer.from(value, "hex");
}

function makeImageUrl(
  apiBase: string,
  sessionId: string,
  axisKeys: string[],
  chapterSlug: string,
  pageIndex: number,
): string {
  if (axisKeys.length < 2) throw new Error("Incomplete image session keys");

  const [signKeyHex, maskKeyHex] = axisKeys;
  const signKey = decodeHex(signKeyHex);
  const maskKey = decodeHex(maskKeyHex);
  const payload = Buffer.from(
    `${chapterSlug}:${pageIndex}:${Date.now()}`,
    "utf8",
  );
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    masked[i] = payload[i] ^ maskKey[i % maskKey.length];
  }

  const encoded = masked.toString("base64url");
  const signature = createHmac("sha256", signKey).update(masked).digest("base64url");
  return `${apiBase}/v1/manga/img/r/${sessionId}.${signature}.${encoded}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; chapterId: string }> },
) {
  try {
    const { chapterId } = await params;
    const body = (await request.json()) as { turnstileToken?: string };
    const turnstileToken = body.turnstileToken?.trim();
    if (!turnstileToken || !chapterId) {
      return Response.json({ error: "Token verifikasi belum tersedia" }, { status: 400 });
    }

    const source = await resolvePrimarySource();
    const response = await fetch(`${source.apiBase}/v1/manga/img/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": process.env.DOMAIN_KOMIK ?? source.entry,
        "Referer": `${(process.env.DOMAIN_KOMIK ?? source.entry).replace(/\\/$/, "")}/`,
      },
      body: JSON.stringify({
        turnstile_token: turnstileToken,
        chapter_slug: chapterId,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: `Sumber gambar menolak sesi (HTTP ${response.status})` },
        { status: 502 },
      );
    }

    const result = (await response.json()) as SessionResponse;
    const session = result?.data;
    if (!session?.sessionId || !Array.isArray(session.axisKeys)) {
      return Response.json({ error: "Respons sesi gambar tidak valid" }, { status: 502 });
    }

    const reading = await fetch(
      `${source.apiBase}/v1/manga/readingPage/${encodeURIComponent(chapterId)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!reading.ok) {
      return Response.json({ error: "Gagal membaca jumlah halaman chapter" }, { status: 502 });
    }
    const readingPayload = (await reading.json()) as {
      data?: { pageCount?: number; redirect_link?: string | null };
    };
    const pageCount = Number(readingPayload?.data?.pageCount ?? 0);
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 500) {
      return Response.json({ error: "Jumlah halaman chapter tidak valid" }, { status: 502 });
    }

    const images = Array.from({ length: pageCount }, (_, index) =>
      makeImageUrl(source.apiBase, session.sessionId!, session.axisKeys!, chapterId, index),
    );
    return Response.json({ images, pageCount }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[cosmic-reader-session]", error);
    return Response.json({ error: "Gagal membuat sesi gambar Cosmic" }, { status: 500 });
  }
}
