<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Komikin-aja — manga reader (scraper-based)

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, v9)
- No test suite exists; no Prettier config.

## Architecture

**Next.js 16 canary** + **React 19** + **Tailwind v4** (`@import "tailwindcss"` in CSS, no `tailwind.config.*`).
App Router. Most pages are `async` server components.

**All data** is scraped at runtime from two **main-domain** env vars — never hardcode subdomains, they get banned.

| Var | Value | Kind |
|---|---|---|
| `DOMAIN_KOMIK` | `https://cosmictoon.to/` | Cosmic — SvelteKit SPA + public JSON API |
| `DOMAIN_KOMIK_H` | `https://manhwadesu.com/` | WordPress "mangareader" theme |

## Domain resolution (the important part)

The env vars hold **landing pages**, not the reader sites. `src/lib/resolve.ts` follows the "Baca Komik" / "Website Utama" link to find the live subdomain, caches it 30 min, and re-resolves on network errors. **Never hardcode `04.cosmicscans.to`, `manhwadesu.wiki`, or the API base.**

- Fingerprints: `/_app/immutable/` → `cosmic`; `listupd`/`eplister`/`ts_reader` → `wordpress`.
- The resolver takes an **expected kind** so a landing page's other menu entries (e.g. "Baca Novel") are rejected even when their fingerprint matches.
- Redirects are **explicit BFS hops**, not followed by axios — some shortlinks answer 302 in 60 ms but hang for 30 s if you follow the chain.
- `?redirect=` params are expanded at enqueue time, so a Cloudflare challenge page never has to respond.
- Cosmic's API base isn't in the HTML: it is found by walking the bounded SvelteKit bundle import graph and probing `/v1/manga/popularToday`.
- `RESOLVE_DEBUG=1` prints the whole traversal; `/api/resolve-debug` returns that same traversal as JSON for a deployed environment.
- Failures are absorbed, not thrown: a host that errors once is retried (`PROBE_RETRIES`), and the whole traversal is retried once (`RESOLVE_ATTEMPTS`) before giving up. Both are bounded by `RESOLVE_DEADLINE`. Note `sleep()` must **not** call `unref()` — an unref'd timer lets the process exit before the retry runs.
- If the host's egress IP is blocked, auto-discovery cannot read the SPA shell (and therefore cannot find the API base). Optional overrides `COSMIC_API_BASE` / `DOMAIN_KOMIK_H_ORIGIN` are a last resort — they are **liveness-probed before use** and logged via `console.warn`, never silently applied.

## No Cloudflare cookie

There is no `CF_COOKIE` / `FlareSolverr` anymore. `src/lib/scraper.ts` hits the JSON API on the API CDN host, which is not behind the challenge.

## Deploy

Vercel-serverless safe: no `child_process`/`curl` (the old `execSync('curl')` in the H scraper is gone — use `axios` from `src/lib/http.ts`). Data routes are all `ƒ` (on-demand), so `next build` never touches the network.

## Critical quirks (will cause errors if missed)

- **`params` and `searchParams` are Promises** — must be `await`ed in page components.
- **Path alias `@/` maps to project root** (`./*`), not `./src/*`. Use `@/src/components/...`, `@/src/lib/...`.
- **`connection()` from `next/server`** must be called in dynamic pages that fetch external data to prevent unwanted static generation.
- **Image proxy**: all external manga images go through `/api/proxy/image?url=...` (avoids CORS). Use `proxyImage()` from `src/lib/utils.ts`.
- **Client-side persistence**: bookmarks + history in `localStorage` via `src/lib/storage.ts` (only works in `'use client'` components).
- **Root layout is a server component** (`app/layout.tsx`) so it can export `metadata` + `viewport`. Do not add `'use client'` to it; put interactivity in child components.
- **iOS web app quirk**: Next 16 canary's `appleWebApp.capable` renders `mobile-web-app-capable` (missing the `apple-` prefix), which iOS ignores. `app/layout.tsx` injects the correct tag through `metadata.other` — don't remove it.
- **App icons** are generated from `app/favicon.ico` (which is actually an 873×873 PNG with transparent corners) and flattened onto `#0a0a0f`, because iOS renders transparency as black. `app/apple-icon.png` and `app/icon.png` use Next's file convention; `app/manifest.ts` serves the web app manifest.

## Key files

| Path | Role |
|---|---|
| `src/lib/resolve.ts` | Dynamic domain resolver (landing page → live subdomain → Cosmic API base) |
| `src/lib/http.ts` | Shared `axios` client: `getText` / `getJson` / `probe` (no-redirect), `mapWithConcurrency` |
| `src/lib/scraper.ts` | Cosmic JSON API scraper (`getHome`, `getDetail`, `getChapterImages`, `searchKomik`, `getGenre*`) |
| `src/lib/scrapper-h.ts` | WordPress/mangareader scraper (`searchKomikH`, `getDetailH`, `getChapterImagesH`, `getGenreH`) |
| `src/lib/utils.ts` | Slug helpers, image proxy URLs, `formatDate`, `computeRelevance` |
| `src/lib/storage.ts` | localStorage bookmarks/history |
| `src/types/index.ts` | Shared TypeScript interfaces (`Komik`, `Chapter`, `ChapterDetail`, …) |
| `app/api/` | API routes mirroring scraper functions |
| `app/api/proxy/image/route.ts` | Image proxy endpoint |
| `app/manifest.ts` | Web app manifest (`/manifest.webmanifest`) |
| `app/apple-icon.png`, `app/icon.png` | Next file-convention icons (auto-injected `<link>` tags) |
| `next.config.ts` | Image remote patterns only (env vars are read at runtime, not inlined) |
| `.env` | `DOMAIN_KOMIK` + `DOMAIN_KOMIK_H` (main domains — nothing else) |

## Known data quirks

- ~15% of Cosmic list entries have **no cover** (`cover: null`). `SafeImage` must never render `src=""` — React throws on it. It falls back to a placeholder div.
- `ChapterList` renders `chapter.title`, not `chapter.number`. The Cosmic scraper synthesises `title` as `Chapter <number>` because that endpoint sends no label.
- `mangaDetail` does **not** return `type`; only `filter`/`latest` results do.
- The Cosmic API is **cursor**-paged (`after=`/`before=`), not page-numbered. `scraper.ts` walks and caches the cursor chain per query.
- Cosmic `/v1/manga/search` matches phrases literally (`one piece` → 2 hits), so `searchKomik` falls back to per-token queries and ranks client-side.
- `genres_slug` with an unknown slug is silently ignored by the API, so `getGenre` validates page 1 actually contains the genre.
- WordPress lazy-loads covers: `src` is a placeholder SVG, the real URL is in `data-lazy-src`.
