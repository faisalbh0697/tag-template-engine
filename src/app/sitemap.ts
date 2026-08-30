import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date("2026-08-30"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/docs"),
      lastModified: new Date("2026-08-30"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ]
}
