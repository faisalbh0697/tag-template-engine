import { describe, expect, test } from "vitest"

import { BUILTIN_CONFIGS } from "./configs"
import { JSON_ENGINE_CONFIG, isTruthy, renderTemplate, stringifyValue } from "./engine"

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
    const result = renderTemplate("Hello {{site.name}}", { site: { name: "Nextrike" } })
    expect(result).toEqual({ ok: true, html: "Hello Nextrike" })
  })

  test("does not escape JSON payloads by default", () => {
    const result = renderTemplate('{"bio":"{{bio}}"}', { bio: "a\"b" }, JSON_ENGINE_CONFIG)
    expect(result).toEqual({ ok: true, html: '{"bio":"a"b"}' })
  })

  test("renders if/else branches", () => {
    const source = "{{#if featured}}yes{{else}}no{{/if}}"
    expect(renderTemplate(source, { featured: true })).toEqual({ ok: true, html: "yes" })
    expect(renderTemplate(source, { featured: false })).toEqual({ ok: true, html: "no" })
  })

  test("loops arrays with this and @index", () => {
    const result = renderTemplate("{{#each tags}}{{@index}}:{{this}} {{/each}}", {
      tags: ["seo", "og"],
    })
    expect(result).toEqual({ ok: true, html: "0:seo 1:og " })
  })

  test("reports unmatched blocks", () => {
    const result = renderTemplate("{{#if ok}}still open", { ok: true })
    expect(result.ok).toBe(false)
  })

  test("renders every builtin platform template", () => {
    const sample = {
      event: {
        event_name: "Purchase",
        event_time: 1_700_000_000,
        event_id: "evt_1",
        email: "buyer@example.com",
        email_hash: "abc",
        currency: "USD",
        value: 10,
        conversion_time: "2026-08-30 12:00:00+00:00",
      },
      secrets: {
        FB_PIXEL_ID: "123",
        FB_ACCESS_TOKEN: "token",
        TIKTOK_ACCESS_TOKEN: "tt",
        TIKTOK_PIXEL_CODE: "CDE",
        GOOGLE_ADS_CUSTOMER_ID: "1",
        GOOGLE_ADS_OAUTH_TOKEN: "ya29",
        GOOGLE_ADS_DEVELOPER_TOKEN: "dev",
        GOOGLE_ADS_CONVERSION_ACTION_ID: "9",
        KLAVIYO_API_KEY: "pk",
        PINTEREST_ACCESS_TOKEN: "pin",
        PINTEREST_AD_ACCOUNT_ID: "acct",
      },
    }
    for (const [name, config] of Object.entries(BUILTIN_CONFIGS)) {
      const endpoint = renderTemplate(config.endpoint, sample)
      const body = renderTemplate(config.bodyTemplate, sample)
      expect(endpoint.ok, `${name} endpoint`).toBe(true)
      expect(body.ok, `${name} body`).toBe(true)
      if (body.ok) {
        expect(() => JSON.parse(body.html), `${name} body json`).not.toThrow()
      }
    }
  })
})
