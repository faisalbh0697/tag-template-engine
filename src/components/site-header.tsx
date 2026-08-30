import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { SITE_NAME } from "@/lib/site"

const links = [
  { href: "/", label: "Playground" },
  { href: "/docs", label: "Syntax" },
]

export function SiteHeader({ active }: { active: "playground" | "docs" }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground font-mono text-xs font-semibold text-background">
            {"{ }"}
          </span>
          <span className="text-sm font-medium tracking-tight">{SITE_NAME}</span>
          <Badge variant="secondary">v3</Badge>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const isActive =
              (active === "playground" && link.href === "/") ||
              (active === "docs" && link.href === "/docs")
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
