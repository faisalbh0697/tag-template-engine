export const SITE_NAME = "Tag Template Engine"
export const SITE_DESCRIPTION =
  "Browser-first HTML tag templates for meta, Open Graph, Twitter, and JSON-LD. Version 3 auto-initializes configs — no terminal required."
export const GITHUB_USER = "faisalbhxyz"
export const GITHUB_REPO = "tag-template-engine"
export const GITHUB_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}`

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:43181"
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl().replace(/\/$/, "")
  if (path === "/") {
    return `${base}/`
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    codeRepository: GITHUB_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Faisal BH",
      url: "https://faisalbh.com",
    },
  }
}
