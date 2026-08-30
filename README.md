# Tag Template Engine

Browser-first engine for authoring HTML tag templates — SEO meta, Open Graph, Twitter cards, JSON-LD, and custom snippets. **v3 auto-initializes engine config and starter templates in the browser. No terminal, no `npx init`.**

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
npm install
npm run dev
```

Open [http://127.0.0.1:43181](http://127.0.0.1:43181). The first visit writes default config and five starter templates into the browser. No CLI step.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 43181 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Engine unit tests |
| `npm run build` | Production build |
| `npm start` | Serve the production build |

## Publish to GitHub

Create an empty repository named `tag-template-engine` at [github.com/new](https://github.com/new), then:

```bash
git remote add github https://github.com/YOUR_USERNAME/tag-template-engine.git
git add -A
git commit -m "v3: auto-init configs, no terminal needed"
git push -u github main
```

If this checkout already has an `origin` remote, use a second remote name (`github`) or replace `origin` after creating the GitHub repo.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui.

## License

Proprietary.
