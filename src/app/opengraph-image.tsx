import { ImageResponse } from "next/og"

export const alt = "Tag Template Engine"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fafafa",
          color: "#111",
          padding: 72,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#111",
              color: "#fafafa",
              borderRadius: 10,
              fontFamily: "ui-monospace, monospace",
              fontSize: 18,
            }}
          >
            {"{ }"}
          </div>
          Tag Template Engine
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 650, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Auto-init configs.
            <br />
            No terminal needed.
          </div>
          <div style={{ fontSize: 28, color: "#525252", maxWidth: 780 }}>
            Render SEO, Open Graph, Twitter, and JSON-LD tags from templates in the browser.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#737373" }}>v3</div>
      </div>
    ),
    size
  )
}
