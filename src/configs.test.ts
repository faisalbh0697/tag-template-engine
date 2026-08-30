import { describe, expect, test } from "vitest"

import { BUILTIN_CONFIGS, getEnabledPlatforms, healthMode } from "./configs"
import type { Env } from "./types"

describe("getEnabledPlatforms", () => {
  test("uses builtin configs when KV is not bound", async () => {
    const env = {} as Env
    const platforms = await getEnabledPlatforms(env)
    expect(platforms.map((item) => item.name).sort()).toEqual(
      Object.keys(BUILTIN_CONFIGS).sort()
    )
    expect(healthMode(env)).toBe("minimal")
  })

  test("reports partial mode when only KV is bound", () => {
    const env = { CONFIG: {} as KVNamespace } as Env
    expect(healthMode(env)).toBe("partial")
  })
})
