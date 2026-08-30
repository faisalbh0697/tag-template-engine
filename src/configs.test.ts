import { describe, expect, test, vi } from "vitest"

import {
  BUILTIN_CONFIGS,
  KV_REQUIRED_ERROR,
  ensureConfigs,
  getEnabledPlatforms,
  healthMode,
} from "./configs"
import { retryOrLog } from "./dispatch"
import type { Env } from "./types"

describe("optional KV and Queue", () => {
  test("uses builtin configs when KV is not bound", async () => {
    const env = {} as Env
    const platforms = await getEnabledPlatforms(env)
    expect(platforms.map((item) => item.name).sort()).toEqual(
      Object.keys(BUILTIN_CONFIGS).sort()
    )
    expect(healthMode(env)).toBe("minimal")
  })

  test("ensureConfigs is a no-op without KV", async () => {
    await expect(ensureConfigs({} as Env)).resolves.toBeUndefined()
  })

  test("admin error copy is exact when KV is missing", () => {
    expect(KV_REQUIRED_ERROR).toEqual({
      error: "KV namespace not bound. Admin API requires KV.",
    })
  })

  test("reports partial mode when only KV is bound", () => {
    const env = { CONFIG: {} as KVNamespace } as Env
    expect(healthMode(env)).toBe("partial")
  })

  test("reports full mode when KV and Queue are bound", () => {
    const env = {
      CONFIG: {} as KVNamespace,
      RETRY_QUEUE: {} as Queue<import("./types").QueueMessage>,
    } as Env
    expect(healthMode(env)).toBe("full")
  })

  test("logs failures when Queue is not bound", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    await retryOrLog({} as Env, { platform: "facebook", event: {}, attempt: 0 }, "boom")
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
