import { describe, expect, test } from "vitest"

import { DEFAULT_ENGINE_CONFIG, STARTER_TEMPLATES, createDefaultWorkspace } from "@/lib/defaults"
import { isTruthy, renderTemplate, stringifyValue } from "@/lib/engine"
import { parseWorkspace } from "@/lib/workspace"

const config = DEFAULT_ENGINE_CONFIG

describe("stringifyValue", () => {
  test("turns nullish values into empty strings", () => {
    expect(stringifyValue(null)).toBe("")
    expect(stringifyValue(undefined)).toBe("")
  })

  test("keeps primitives readable", () => {
    expect(stringifyValue("studio")).toBe("studio")
    expect(stringifyValue(8)).toBe("8")
    expect(stringifyValue(true)).toBe("true")
  })
})

describe("isTruthy", () => {
  test("treats empty arrays as false", () => {
    expect(isTruthy([])).toBe(false)
    expect(isTruthy(["tag"])).toBe(true)
  })
})

describe("renderTemplate", () => {
  test("interpolates nested paths", () => {
    const result = renderTemplate("Hello {{site.name}}", { site: { name: "Nextrike" } }, config)
    expect(result).toEqual({ ok: true, html: "Hello Nextrike" })
  })

  test("escapes HTML when autoEscape is on", () => {
    const result = renderTemplate("<p>{{bio}}</p>", { bio: "<em>Hi</em>" }, config)
    expect(result).toEqual({ ok: true, html: "<p>&lt;em&gt;Hi&lt;/em&gt;</p>" })
  })

  test("triple braces skip escaping", () => {
    const result = renderTemplate("{{{bio}}}", { bio: "<em>Hi</em>" }, config)
    expect(result).toEqual({ ok: true, html: "<em>Hi</em>" })
  })

  test("renders if/else branches", () => {
    const source = "{{#if featured}}yes{{else}}no{{/if}}"
    expect(renderTemplate(source, { featured: true }, config)).toEqual({
      ok: true,
      html: "yes",
    })
    expect(renderTemplate(source, { featured: false }, config)).toEqual({
      ok: true,
      html: "no",
    })
  })

  test("loops arrays with this and @index", () => {
    const result = renderTemplate(
      "{{#each tags}}{{@index}}:{{this}} {{/each}}",
      { tags: ["seo", "og"] },
      config
    )
    expect(result).toEqual({ ok: true, html: "0:seo 1:og " })
  })

  test("ignores comments", () => {
    const result = renderTemplate("A{{! hidden }}B", {}, config)
    expect(result).toEqual({ ok: true, html: "AB" })
  })

  test("reports unmatched blocks", () => {
    const result = renderTemplate("{{#if ok}}still open", { ok: true }, config)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain("Unclosed")
    }
  })

  test("renders every starter template without errors", () => {
    for (const starter of STARTER_TEMPLATES) {
      const result = renderTemplate(starter.source, starter.sampleData, config)
      expect(result.ok, starter.id).toBe(true)
    }
  })
})

describe("workspace auto-init", () => {
  test("default workspace is version 3 with starter templates", () => {
    const workspace = createDefaultWorkspace()
    expect(workspace.config.version).toBe(3)
    expect(workspace.templates.length).toBeGreaterThan(0)
    expect(parseWorkspace(workspace)?.config.version).toBe(3)
  })
})
