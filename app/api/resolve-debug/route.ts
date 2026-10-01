import { debugResolve } from "@/src/lib/resolve";
import { getJson, probe } from "@/src/lib/http";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Diagnosa kenapa sebuah sumber tidak bisa ditemukan di environment ini.
 * Buka `/api/resolve-debug` setelah deploy dan baca hasilnya.
 *
 * Tambahkan `?probe=<url>` (boleh berulang) untuk menguji URL bebas dari
 * server ini - berguna untuk memastikan apakah host API sumber utama masih
 * bisa dijangkau padahal SPA-nya diblokir.
 */
export async function GET(request: NextRequest) {
  const results = [];

  for (const envKey of ["DOMAIN_KOMIK", "DOMAIN_KOMIK_H"]) {
    const started = Date.now();
    try {
      const res = await debugResolve(envKey);
      results.push({ ...res, ms: Date.now() - started });
    } catch (err) {
      results.push({
        envKey,
        error: err instanceof Error ? err.message : String(err),
        log: [],
        ms: Date.now() - started,
      });
    }
  }

  // Kalau sumber utama gagal, cek apakah host API-nya sendiri bisa dijangkau
  // dari server ini (memakai apiBase hasil cache kalau ada).
  const apiReachability: {
    url: string;
    ok: boolean;
    sample?: string;
    error?: string;
  }[] = [];
  const primary = results[0] as { resolved?: { apiBase?: string } } | undefined;
  const known = primary?.resolved?.apiBase ?? process.env.COSMIC_API_BASE;

  if (known) {
    const url = `${known}/v1/manga/popularToday`;
    const t = Date.now();
    try {
      const body = await getJson<{ success?: unknown; data?: unknown }>(url, 15000);
      apiReachability.push({
        url,
        ok: body?.success === true && Array.isArray(body?.data),
        sample: `items=${Array.isArray(body?.data) ? body.data.length : "?"} ms=${Date.now() - t}`,
      });
    } catch (err) {
      apiReachability.push({
        url,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Probe bebas: ?probe=<url>&probe=<url>
  const freeProbe = await Promise.all(
    request.nextUrl.searchParams
      .getAll("probe")
      .filter(Boolean)
      .map(async (url) => {
        const t = Date.now();
        try {
          const res = await probe(url, 15000);
          return {
            url,
            status: res.status,
            ms: Date.now() - t,
            location: res.location ?? null,
            server: res.headers["server"] || null,
            "cf-mitigated": res.headers["cf-mitigated"] || null,
            "cf-ray": res.headers["cf-ray"] ? "yes" : null,
            len: res.body.length,
            snippet: res.body.slice(0, 300),
          };
        } catch (err) {
          return {
            url,
            status: 0,
            ms: Date.now() - t,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
  );

  return Response.json({
    runtime: {
      node: process.version,
      region: process.env.VERCEL_REGION ?? "(bukan vercel)",
    },
    env: {
      DOMAIN_KOMIK: process.env.DOMAIN_KOMIK ?? "(kosong)",
      DOMAIN_KOMIK_H: process.env.DOMAIN_KOMIK_H ?? "(kosong)",
      COSMIC_API_BASE: process.env.COSMIC_API_BASE ?? "(kosong)",
      DOMAIN_KOMIK_H_ORIGIN: process.env.DOMAIN_KOMIK_H_ORIGIN ?? "(kosong)",
    },
    apiReachability,
    freeProbe,
    results,
  });
}