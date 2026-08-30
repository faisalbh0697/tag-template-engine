# Tag Template Engine

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/faisalbhxyz/tag-template-engine)

Browser-first engine for authoring HTML tag templates — SEO meta, Open Graph, Twitter cards, JSON-LD, and custom snippets. **v3 auto-initializes engine config and starter templates in the browser. No terminal, no `npx init`.**

Repository: [github.com/faisalbhxyz/tag-template-engine](https://github.com/faisalbhxyz/tag-template-engine)

## What it does

- Live playground: edit a template and JSON data, see rendered tags immediately
- Mustache-style syntax: `{{path}}`, `{{#if}}`, `{{#each}}`, comments, triple-brace raw HTML
- Starter library: SEO meta, Open Graph, Twitter, JSON-LD LocalBusiness, product HTML
- Workspace stays in `localStorage` (`tag-template-engine:v3`)
- Export / import `tag-engine.config.json`

## Template syntax

```
<title>{{seo.title}}</title>
{{#if seo.noIndex}}
<meta name="robots" content="noindex" />
{{else}}
<meta name="robots" content="index,follow" />
{{/if}}
{{#each og.images}}
<meta property="og:image" content="{{url}}" />
{{/each}}
```

See `/docs` in the app for the full syntax.

## Requirements

- Node.js 22+
- npm 10+

## Run locally

```bash
git clone https://github.com/faisalbhxyz/tag-template-engine.git
cd tag-template-engine
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Open [http://127.0.0.1:43181](http://127.0.0.1:43181). The first visit writes default config and five starter templates into the browser. No CLI step.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on port 43181 |
| `npm run preview` | Build and preview in the Cloudflare Workers runtime |
| `npm run deploy` | Build and deploy to your Cloudflare account |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Engine unit tests |
| `npm run build` | Production Next.js build |

## Create the GitHub repository

If the repo does not exist yet:

1. Open [github.com/new](https://github.com/new)
2. Repository name: `tag-template-engine`
3. Public (required for the Deploy to Cloudflare button)
4. Do **not** add a README, `.gitignore`, or license (this project already has them)
5. Create repository

Then from this project:

```bash
git remote add github https://github.com/faisalbhxyz/tag-template-engine.git
git push -u github main
```

If `github` is already configured:

```bash
git remote set-url github https://github.com/faisalbhxyz/tag-template-engine.git
git push -u github main
```

## Deploy to Cloudflare

**One click:** use the button at the top of this README. Cloudflare clones [faisalbhxyz/tag-template-engine](https://github.com/faisalbhxyz/tag-template-engine), reads `wrangler.jsonc`, and deploys a Worker.

The button only works after the GitHub repo exists **and is public**.

**From the CLI** (after `npx wrangler login`):

```bash
npm run deploy
```

This runs OpenNext (`@opennextjs/cloudflare`) then Wrangler. Config lives in `wrangler.jsonc` and `open-next.config.ts`.

Optional production URL (rebuild after changing it):

```bash
# .env.local — not committed
NEXT_PUBLIC_SITE_URL=https://tag-template-engine.faisalbhxyz.workers.dev
```

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Cloudflare Workers via OpenNext.

## License

Proprietary.
