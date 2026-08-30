import type { Metadata } from "next"

import { SiteHeader } from "@/components/site-header"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Template syntax",
  description:
    "Mustache-style tags for HTML, meta, Open Graph, Twitter, and JSON-LD. Interpolation, conditionals, loops, and comments.",
  alternates: {
    canonical: absoluteUrl("/docs"),
  },
  openGraph: {
    title: "Template syntax · Tag Template Engine",
    description:
      "Mustache-style tags for HTML, meta, Open Graph, Twitter, and JSON-LD.",
    url: absoluteUrl("/docs"),
  },
}

const sections = [
  {
    heading: "Interpolation",
    body: "Use {{path.to.value}} to print a field. Nested objects use dots. Missing values render as empty strings. HTML is escaped by default.",
    code: "<title>{{seo.title}}</title>\n<meta name=\"author\" content=\"{{site.author}}\" />",
  },
  {
    heading: "Raw HTML",
    body: "Triple braces skip escaping. Only use this for values you already trust, such as a hand-authored script tag.",
    code: "{{{jsonLdBlock}}}",
  },
  {
    heading: "Conditionals",
    body: "{{#if path}} renders the block when the value is truthy. Empty strings, 0, false, null, and empty arrays are falsy. {{else}} is optional.",
    code: "{{#if seo.noIndex}}\n<meta name=\"robots\" content=\"noindex\" />\n{{else}}\n<meta name=\"robots\" content=\"index,follow\" />\n{{/if}}",
  },
  {
    heading: "Loops",
    body: "{{#each items}} repeats the block for every array item. Inside the loop, {{this}} is the item, {{@index}} is the zero-based index, and {{@first}} / {{@last}} are booleans.",
    code: "{{#each og.images}}\n<meta property=\"og:image\" content=\"{{url}}\" />\n{{/each}}",
  },
  {
    heading: "Comments",
    body: "Comments are stripped from the output and never reach the browser.",
    code: "{{! do not ship this note }}",
  },
]

export default function DocsPage() {
  return (
    <>
      <SiteHeader active="docs" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-muted-foreground">v3</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Template syntax</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          The engine ships with <code className="font-mono text-sm text-foreground">{"{{ }}"}</code>{" "}
          delimiters and writes a config into this browser on first load. Change
          delimiters from Engine settings if your tags already use another style.
        </p>
        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-medium tracking-tight">{section.heading}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
              <pre className="mt-3 overflow-x-auto rounded-xl border bg-card p-4 font-mono text-xs leading-5">
                {section.code}
              </pre>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
