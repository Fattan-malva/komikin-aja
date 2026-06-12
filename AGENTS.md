<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kiryuu.id — manga reader (scraper-based)

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, v9)
- No test suite exists; no Prettier config.

## Architecture

**Next.js 16 canary** + **React 19** + **Tailwind v4** (`@import "tailwindcss"` in CSS, no `tailwind.config.*`).
App Router. Most pages are `async` server components.

**All data** is scraped from `DOMAIN_KIRYUU` env var (default: `https://v6.kiryuu.to/`) via `axios` + `cheerio` in `src/lib/scraper.ts`. No database, no CMS API.

## Cloudflare

`v6.kiryuu.to` is behind Cloudflare Managed Challenge (Turnstile). The scraper will get 403 errors unless you provide a valid `cf_clearance` cookie. To fix:

1. Open `https://v6.kiryuu.to/` in a regular browser, solve the Cloudflare challenge
2. Open DevTools → Application → Cookies → copy `cf_clearance` value
3. Set it in `.env`: `CF_COOKIE=cf_clearance=...`

Without this cookie, all pages will show empty data or error states at runtime (but the build still succeeds).

## Critical quirks (will cause errors if missed)

- **`params` and `searchParams` are Promises** — must be `await`ed in page components.
- **Path alias `@/` maps to project root** (`./*`), not `./src/*`. Use `@/src/components/...`, `@/src/lib/...`.
- **`connection()` from `next/server`** must be called in dynamic pages that fetch external data to prevent unwanted static generation.
- **Image proxy**: all external manga images go through `/api/proxy/image?url=...` (avoids CORS). Use `proxyImage()` from `src/lib/utils.ts`.
- **Client-side persistence**: bookmarks + history in `localStorage` via `src/lib/storage.ts` (only works in `'use client'` components).
- **Root layout** is `'use client'` (uses `usePathname`). Child pages remain server components by default.

## Key files

| Path | Role |
|---|---|
| `src/lib/scraper.ts` | All scraping logic (573 lines) |
| `src/lib/utils.ts` | Domain helper, proxy, slug utils |
| `src/lib/storage.ts` | localStorage bookmarks/history |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `app/api/` | API routes mirroring scraper functions |
| `app/api/proxy/image/route.ts` | Image proxy endpoint |
| `next.config.ts` | Image remote patterns + env vars |
| `.env` | `DOMAIN_KIRYUU` (target) + `CF_COOKIE` (Cloudflare bypass) |
