# next-starter

The template of a new website on this platform: Next.js with SEO, a strict CSP, English and Russian, health probes, tests, Dockerfile and CI. Two sample pages (`/` and `/about`) show how a page gets its text and metadata; replace them.

Data from an API (the `/api` proxy, TanStack Query, typed client, toasts) is not here. A site that talks to a backend copies it from [`next-example`](https://github.com/nick-lukashik/next-example), the full reference where it runs against the notes API and is tested end to end. "Add the API" below lists the steps. The shared files (`src/proxy.ts`, `src/lib/{seo,env,security}/`, `src/i18n/`, `src/components/`) are the same in both repos, with the API parts left out here.

## What is inside

- Next.js 16.4 (App Router, `output: 'standalone'`, React Compiler, typed routes), React 19.3, TypeScript 7 strict, Node 26, pnpm 12.
- SEO: title/description in both languages, canonical, hreflang, Open Graph and Twitter, `robots.txt`, `sitemap.xml`, OG image, icons, manifest, JSON-LD.
- Security: per-request nonce CSP (no `unsafe-inline` for scripts or styles in production) and security headers.
- EN and RU without a locale in the URL.
- UI: shadcn/ui (Radix base, neutral palette, one light theme): Button, Card; more with `pnpm exec shadcn add <name>`. AA contrast, checked by axe.
- Env through Zod, Pino JSON logs with request id, `/health/live` and `/health/ready` probes, 404 and error pages.
- Biome, Vitest, Playwright with axe, Dockerfile, CI, Renovate.
- Agent rules: [AGENTS.md](AGENTS.md) and [.claude/rules/](.claude/rules/).

## Getting started

Requires Node 26 and pnpm 12.

```bash
pnpm install
pnpm env:local          # .env.local from .env.example
pnpm dev                # http://localhost:3000
```

Production build locally: `pnpm build && pnpm start` (the same `server.js` as in the container).

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | dev server on `:3000` |
| `pnpm build` / `pnpm start` | standalone build and running it |
| `pnpm verify` | Biome + `next typegen && tsc` + Vitest + build |
| `pnpm test:e2e` | Playwright against the build (run `pnpm build` first; browser: `pnpm exec playwright install chromium`) |
| `pnpm test` | unit tests |
| `pnpm lint` / `pnpm format` | Biome check / fix |
| `pnpm env:local` | create or update `.env.local` |
| `pnpm exec shadcn add <name>` | add a shadcn/ui component (CLI pinned in `devDependencies`) |

## Start a site from this template

1. Create the repo from the template (GitHub "Use this template"); its CI publishes images, the template's own does not.
2. Rename: `name` in `package.json`, `service` in `src/lib/logger.ts`, the image title in `Dockerfile`, `meta.siteName` in `src/i18n/messages/*.json`.
3. Replace `src/app/page.tsx` and `src/app/about/` with the site's pages ("Adding a page"), and the e2e paths that name them (`e2e/a11y.spec.ts`, `e2e/seo.spec.ts`, `e2e/i18n.spec.ts`).
4. gitops: `apps/<svc>/prod/` with `components/service` and `components/web`, the ConfigMap with `SITE_URL` and `ROBOTS` (gitops `apps/README.md`).

## Adding a page

1. `src/app/<path>/page.tsx`, a Server Component.
2. Text in `src/i18n/messages/en.json` and `ru.json` (same keys; a test checks it). Russian copy is written by hand.
3. `generateMetadata` returns only `title` and `description` through `getTranslations`. The root layout adds canonical, hreflang and Open Graph.
4. Public page: add it to `src/app/sitemap.ts`.
5. Test: its path in `e2e/a11y.spec.ts` (axe) and, for a key page, in `e2e/seo.spec.ts`.

## Add the API

Only for a site that calls a backend. Copy from `next-example`, with its tests:

| What | Files |
|---|---|
| `/api/*` → `API_URL` proxy: body cap, deadlines, header allow-list | `src/app/api/[...path]/route.ts`, `src/lib/http/`, `docs/auth.md`, `e2e/proxy.spec.ts` |
| Typed client and TanStack Query | `src/lib/api/`, `src/lib/query/`, `src/app/providers.tsx` (and its use in `layout.tsx`), `scripts/api-types.mjs`, `.claude/rules/{tanstack-query,openapi-typescript}.md` |
| Env | `API_URL`, `API_REQUEST_TIMEOUT_MS`, `API_BODY_TIMEOUT_MS` in `src/lib/env/server.ts` and `.env.example` |
| Readiness reporting the API (not requiring it) | `src/app/health/ready/route.ts` and its test, `e2e/api-down.spec.ts` |
| Mock API for dev and e2e | `e2e/mock-api/`, the mock and API-down servers in `playwright.config.ts`, `e2e/servers.ts`, `e2e/fixtures.ts` |
| Toasts (Sonner) | `src/components/ui/sonner.tsx`, the style hashes in `src/lib/security/csp.ts` and their test |

Dependencies: `@tanstack/react-query`, `@tanstack/react-query-devtools`, `sonner`. In gitops, `components/web` already labels the pods as API clients; the ConfigMap gets `API_URL=http://<api>.prod.svc`.

## How it works

**Locale.** `?lang=en|ru` > `locale` cookie > `Accept-Language` > `en`. `?lang=` rewrites the cookie. `src/proxy.ts` picks the locale and the server renders `<html lang>`. Canonical is `/path?lang=<locale>`, hreflang lists both, `x-default` is the path without the parameter.

**Proxy.** `src/proxy.ts` gives every request a request id and `x-app-version`; pages also get the nonce CSP, the locale and `x-pathname` for metadata. It skips `/api`, where the API proxy goes once added (next-example explains why).

**UI and theme.** Components are shadcn/ui source in `src/components/ui/` (Radix primitives, `cn` from the `cn` package). One light palette: shadcn neutral tokens as CSS variables in `src/app/globals.css`. No theme switch, no `dark:` classes (a unit test rejects them, since components added later bring their own).

**CSP and styles.** Production `style-src` is `'self' 'nonce-…'`, without `unsafe-inline`. A library that injects a `<style>` element at runtime cannot carry the nonce; its exact stylesheet is then allowed by SHA-256 in `STYLE_HASHES` (`src/lib/security/csp.ts`), with a test that recomputes it from `node_modules` (next-example does this for Sonner). The e2e suite fails on any CSP violation.

**404.** A route that can answer 404 must not have a `loading.tsx` above it: a stream that has started has already sent 200.

## Health semantics

| Probe | Answers | Body |
|---|---|---|
| `GET /health/live` | `200` while the process answers; reads no dependency | `{ status: 'ok', version }` |
| `GET /health/ready` | `200` when this server can render (it answered, its config parsed) | `{ status: 'ok', version }` |

Both return `x-app-version`, which the post-deploy smoke check waits for. A backend added later is reported in the readiness body, never required (contract, kind web). The Docker `HEALTHCHECK` uses `/health/ready`.

## Environment variables

| Variable | Default | Read |
|---|---|---|
| `SITE_URL` | `http://localhost:3000` | at startup |
| `APP_VERSION` | `dev` | at startup (`x-app-version` header) |
| `LOG_LEVEL` | `info` | at startup |
| `ROBOTS` | `index` | per request; `noindex` blocks indexing (stage) |
| `GTM_ID` | none | per request; Google Tag Manager container (`GTM-ABC1234`). Unset: no tag manager, and the CSP stays on this origin. It loads only after the person agrees in the banner; the answer is `nl_consent`, on the whole domain |

## Docker

```bash
docker build --build-arg APP_VERSION=$(git rev-parse HEAD) -t next-starter .
docker run --rm -p 3000:3000 -e SITE_URL=http://localhost:3000 next-starter
# as in Kubernetes: read-only root filesystem, no capabilities
docker run --rm -p 3000:3000 --read-only --tmpfs /tmp --tmpfs /app/.next/cache \
  --cap-drop ALL --security-opt no-new-privileges --user 10001:10001 \
  -e ROBOTS=noindex next-starter
```

Stages: `base` (Node image) → `deps` (pnpm, `pnpm install` with a cache mount) → `build` (`pnpm build`) → `runtime` (standalone output only). `APP_VERSION` is the only build arg: nothing environment-specific is baked in, so one image runs on stage and prod. App files are owned by root, the app runs as uid `10001` and may write only `/tmp` and `.next/cache`. `node server.js` is PID 1 and exits on `SIGTERM` after in-flight requests finish.

## Dependency updates

Versions are pinned exactly. [Renovate](https://docs.renovatebot.com/) (`renovate.json`, the same policy in every repo) opens PRs on Monday early morning (`Asia/Tbilisi`): one PR for all non-major updates, one per major, weekly lockfile maintenance. Releases younger than 3 days are skipped, the same as pnpm's `minimumReleaseAge` in `pnpm-workspace.yaml`.

## CI

`.github/workflows/ci.yml` calls the org reusable workflows from `nick-lukashik/.github` by the moving major tag `@v1`, never `@master`:

- job `ci`: `build.yml@v1` with `kind: web`. In one job it runs `pnpm verify`, then `pnpm test:e2e` on that same build (Playwright, two servers: `ROBOTS=index` and `noindex`), then builds the image with `APP_VERSION=<full SHA>`; on `master` it pushes the image to GHCR and outputs its digest. A change to docs only (`docs/`, `.claude/`, `*.md` at the root) skips all of it. The required check is `ci / verify`. `publish` is off while the repository is a template.
- job `deploy`: on `master`, when an image was pushed: `deploy-pr.yml@v1` opens the gitops PR with the new digest. Secrets are passed explicitly, never `secrets: inherit`.

## Deploy

The image follows the [service runtime contract](https://github.com/nick-lukashik/.github/blob/master/docs/service-contract.md) (kind **web**); it is the source of truth for everything below.

- Image: `ghcr.io/nick-lukashik/<repo-name>`, tags `sha-<7 chars>` and the full SHA, deployed by digest only. The same image goes to stage and then to prod.
- gitops: `apps/<svc>/prod/kustomization.yaml` includes `components/service` and `components/web`, sets the host, and has one `images:` entry `ghcr.io/nick-lukashik/<svc>` with a `digest`. The deploy PR changes only that digest.
- ConfigMap `<svc>-config` (via `envFrom`): `SITE_URL` (the public origin), `ROBOTS` (`index` on prod, `noindex` on stage), optionally `LOG_LEVEL`. `PORT=3000` comes from gitops; `APP_VERSION` from the image.
- Probes: `/health/live` and `/health/ready`, both with `x-app-version`.
- `components/web` adds the `/app/.next/cache` `emptyDir` (next to `/tmp`).

## Limitations

- One OG image, in English: link previews arrive without the locale cookie.
