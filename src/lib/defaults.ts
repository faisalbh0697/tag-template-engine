import type { EngineConfig, TagTemplate, TemplateKind, Workspace } from "@/lib/types"

export const ENGINE_VERSION = 3 as const
export const STORAGE_KEY = "tag-template-engine:v3"

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  version: ENGINE_VERSION,
  delimiters: {
    open: "{{",
    close: "}}",
  },
  autoEscape: true,
}

const now = "2026-08-30T00:00:00.000Z"

function template(input: {
  id: string
  name: string
  description: string
  kind: TemplateKind
  source: string
  sampleData: TagTemplate["sampleData"]
}): TagTemplate {
  return {
    ...input,
    updatedAt: now,
  }
}

export const STARTER_TEMPLATES: TagTemplate[] = [
  template({
    id: "seo-meta",
    name: "SEO meta tags",
    description: "Title, description, canonical, robots, and language tags.",
    kind: "meta",
    source: `<title>{{seo.title}}</title>
<meta name="description" content="{{seo.description}}" />
<link rel="canonical" href="{{seo.canonical}}" />
{{#if seo.noIndex}}
<meta name="robots" content="noindex,nofollow" />
{{else}}
<meta name="robots" content="index,follow" />
{{/if}}
<html lang="{{site.locale}}">
<meta name="author" content="{{site.author}}" />`,
    sampleData: {
      site: {
        locale: "en",
        author: "Faisal BH",
      },
      seo: {
        title: "Tag Template Engine — render HTML tags from data",
        description:
          "Browser-first tag templates for meta, Open Graph, Twitter, and JSON-LD. Configs auto-init. No terminal needed.",
        canonical: "https://example.com/",
        noIndex: false,
      },
    },
  }),
  template({
    id: "open-graph",
    name: "Open Graph",
    description: "Facebook/LinkedIn share tags with optional images.",
    kind: "open-graph",
    source: `<meta property="og:type" content="{{og.type}}" />
<meta property="og:site_name" content="{{site.name}}" />
<meta property="og:title" content="{{og.title}}" />
<meta property="og:description" content="{{og.description}}" />
<meta property="og:url" content="{{og.url}}" />
<meta property="og:locale" content="{{og.locale}}" />
{{#each og.images}}
<meta property="og:image" content="{{url}}" />
{{#if alt}}
<meta property="og:image:alt" content="{{alt}}" />
{{/if}}
{{/each}}`,
    sampleData: {
      site: { name: "Tag Template Engine" },
      og: {
        type: "website",
        title: "Tag Template Engine v3",
        description: "Auto-init configs. Render tags in the browser.",
        url: "https://example.com/",
        locale: "en_US",
        images: [
          {
            url: "https://example.com/og.png",
            alt: "Tag Template Engine preview",
          },
        ],
      },
    },
  }),
  template({
    id: "twitter-card",
    name: "Twitter card",
    description: "Summary large image card for X/Twitter.",
    kind: "twitter",
    source: `<meta name="twitter:card" content="{{twitter.card}}" />
<meta name="twitter:title" content="{{twitter.title}}" />
<meta name="twitter:description" content="{{twitter.description}}" />
{{#if twitter.image}}
<meta name="twitter:image" content="{{twitter.image}}" />
{{/if}}
{{#if twitter.site}}
<meta name="twitter:site" content="{{twitter.site}}" />
{{/if}}
{{#if twitter.creator}}
<meta name="twitter:creator" content="{{twitter.creator}}" />
{{/if}}`,
    sampleData: {
      twitter: {
        card: "summary_large_image",
        title: "Tag Template Engine v3",
        description: "HTML tag templates with auto-init configs.",
        image: "https://example.com/og.png",
        site: "@nextrike",
        creator: "@faisalbhxyz",
      },
    },
  }),
  template({
    id: "json-ld-local-business",
    name: "JSON-LD LocalBusiness",
    description: "Structured data for a local business landing page.",
    kind: "json-ld",
    source: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "{{business.type}}",
  "name": "{{business.name}}",
  "url": "{{business.url}}",
  "telephone": "{{business.phone}}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{{business.address.street}}",
    "addressLocality": "{{business.address.city}}",
    "addressCountry": "{{business.address.country}}"
  }{{#if business.sameAs}},
  "sameAs": [
{{#each business.sameAs}}
    "{{this}}"{{#if @last}}{{else}},{{/if}}
{{/each}}
  ]{{/if}}
}
</script>`,
    sampleData: {
      business: {
        type: "HomeAndConstructionBusiness",
        name: "Home Renovation AE",
        url: "https://example.com",
        phone: "+971500000000",
        address: {
          street: "Business Bay",
          city: "Dubai",
          country: "AE",
        },
        sameAs: [
          "https://www.instagram.com/example",
          "https://www.facebook.com/example",
        ],
      },
    },
  }),
  template({
    id: "product-html",
    name: "Product tag list",
    description: "HTML snippet that loops product tags with a featured flag.",
    kind: "html",
    source: `<article class="product">
  <h1>{{product.name}}</h1>
  <p>{{product.summary}}</p>
  {{#if product.featured}}
  <span class="badge">Featured</span>
  {{/if}}
  <ul class="tags">
  {{#each product.tags}}
    <li>{{this}}</li>
  {{/each}}
  </ul>
</article>`,
    sampleData: {
      product: {
        name: "Walnut dining table",
        summary: "Solid walnut, seats eight, made to order in Khamis Mushait.",
        featured: true,
        tags: ["walnut", "dining", "custom"],
      },
    },
  }),
]

export function createDefaultWorkspace(): Workspace {
  const first = STARTER_TEMPLATES[0]
  return {
    config: DEFAULT_ENGINE_CONFIG,
    templates: STARTER_TEMPLATES.map((item) => ({ ...item })),
    activeTemplateId: first?.id ?? null,
    autoInitAt: new Date().toISOString(),
  }
}
