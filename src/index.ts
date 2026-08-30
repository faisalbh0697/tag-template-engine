import { BUILTIN_CONFIGS, listAllConfigs } from "./configs"
import { normalizeEvent, retryOrLog, sendToPlatform } from "./dispatch"
import { landingHtml } from "./landing"
import type { JsonObject, PlatformConfig, QueueMessage } from "./types"

export interface Env {
  CONFIG?: KVNamespace
  RETRY_QUEUE?: Queue<QueueMessage>
  FB_ACCESS_TOKEN: string
  TIKTOK_ACCESS_TOKEN: string
  TIKTOK_PIXEL_CODE: string
  GOOGLE_ADS_DEVELOPER_TOKEN: string
  GOOGLE_ADS_OAUTH_TOKEN: string
  KLAVIYO_API_KEY: string
  KLAVIYO_PUBLIC_KEY: string
  PINTEREST_ACCESS_TOKEN: string
}

const ADMIN_KV_ERROR = {
  error: "KV namespace not bound. Add a KV namespace binding named 'CONFIG' to use admin API.",
}

const PLATFORM_VARS: Record<string, (keyof Env)[]> = {
  facebook: ["FB_ACCESS_TOKEN"],
  tiktok: ["TIKTOK_ACCESS_TOKEN", "TIKTOK_PIXEL_CODE"],
  google_ads: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_OAUTH_TOKEN"],
  klaviyo: ["KLAVIYO_API_KEY", "KLAVIYO_PUBLIC_KEY"],
  pinterest: ["PINTEREST_ACCESS_TOKEN"],
}

class EmptySecretError extends Error {
  constructor(secretName: string) {
    super(`Secret '${secretName}' is empty. Set it in Worker → Settings → Variables.`)
    this.name = "EmptySecretError"
  }
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  })
}

function isPlatformConfig(value: unknown): value is PlatformConfig {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.enabled === "boolean" &&
    typeof record.endpoint === "string" &&
    typeof record.bodyTemplate === "string"
  )
}

export async function ensureConfigs(env: Env): Promise<void> {
  if (!env.CONFIG) return
  const existing = await env.CONFIG.list()
  if (existing.keys.length > 0) return
  for (const [key, config] of Object.entries(BUILTIN_CONFIGS)) {
    await env.CONFIG.put(key, JSON.stringify(config))
  }
}

export async function getEnabledPlatforms(
  env: Env
): Promise<{ name: string; config: PlatformConfig }[]> {
  if (!env.CONFIG) {
    return Object.entries(BUILTIN_CONFIGS)
      .filter(([, config]) => config.enabled)
      .map(([name, config]) => ({ name, config }))
  }

  await ensureConfigs(env)
  const listed = await env.CONFIG.list()
  const loaded = await Promise.all(
    listed.keys.map(async (key) => {
      const raw = await env.CONFIG!.get(key.name)
      if (!raw) {
        return null
      }
      try {
        const parsed: unknown = JSON.parse(raw)
        if (!isPlatformConfig(parsed) || !parsed.enabled) {
          return null
        }
        return { name: key.name, config: parsed }
      } catch {
        return null
      }
    })
  )
  return loaded.filter((item): item is { name: string; config: PlatformConfig } => item !== null)
}

function requireSecret(env: Env, secretName: keyof Env): string {
  const value = env[secretName]
  if (typeof value !== "string" || value.trim() === "") {
    throw new EmptySecretError(String(secretName))
  }
  return value
}

async function forwardToPlatform(
  env: Env,
  name: string,
  config: PlatformConfig,
  event: JsonObject
): Promise<{ platform: string; status: "ok" | "skipped" | "failed"; error?: string; httpStatus?: number }> {
  const required = PLATFORM_VARS[name] ?? []
  for (const secretName of required) {
    requireSecret(env, secretName)
  }

  const result = await sendToPlatform(name, config, event, env)
  if (!result.ok) {
    await retryOrLog(env, { platform: name, event, attempt: 0 }, result.error)
    return {
      platform: name,
      status: "failed",
      error: result.error,
      httpStatus: result.status,
    }
  }
  return { platform: name, status: "ok", httpStatus: result.status }
}

async function readJson(request: Request): Promise<JsonObject | null> {
  try {
    const parsed: unknown = await request.json()
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null
    }
    return parsed as JsonObject
  } catch {
    return null
  }
}

async function handleEvent(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request)
  if (!body) {
    return jsonResponse({ error: "JSON object body required." }, 400)
  }
  const event = await normalizeEvent(body)
  const platforms = await getEnabledPlatforms(env)
  const settled = await Promise.allSettled(
    platforms.map(({ name, config }) => forwardToPlatform(env, name, config, event))
  )

  const results = settled.map((item, index) => {
    const platform = platforms[index]?.name ?? "unknown"
    if (item.status === "fulfilled") {
      return item.value
    }
    const error = item.reason instanceof Error ? item.reason.message : "Unknown error"
    if (item.reason instanceof EmptySecretError) {
      return { platform, status: "skipped" as const, error }
    }
    return { platform, status: "failed" as const, error }
  })

  return jsonResponse({
    event_id: event.event_id,
    results,
  })
}

async function handleAdmin(request: Request, env: Env, path: string): Promise<Response> {
  if (!env.CONFIG) {
    return jsonResponse(ADMIN_KV_ERROR, 501)
  }

  try {
    if (path === "/admin/configs" && request.method === "GET") {
      return jsonResponse(await listAllConfigs(env))
    }

    if (path === "/admin/config" && request.method === "GET") {
      const name = new URL(request.url).searchParams.get("name")
      if (!name) {
        return jsonResponse({ error: "Query param name is required." }, 400)
      }
      const raw = await env.CONFIG.get(name)
      if (!raw) {
        return jsonResponse({ error: "Config not found." }, 404)
      }
      return jsonResponse({ name, config: JSON.parse(raw) as JsonObject })
    }

    if (path === "/admin/config" && request.method === "POST") {
      const body = await readJson(request)
      const name = typeof body?.name === "string" ? body.name : ""
      if (!name || typeof body?.config !== "object" || body.config === null) {
        return jsonResponse({ error: "Body must include name and config." }, 400)
      }
      await env.CONFIG.put(name, JSON.stringify(body.config))
      return jsonResponse({ ok: true, name })
    }

    if (path === "/admin/toggle" && request.method === "POST") {
      const body = await readJson(request)
      const name = typeof body?.name === "string" ? body.name : ""
      if (!name) {
        return jsonResponse({ error: "Body must include name." }, 400)
      }
      const raw = await env.CONFIG.get(name)
      if (!raw) {
        return jsonResponse({ error: "Config not found." }, 404)
      }
      const config = JSON.parse(raw) as { enabled: boolean }
      config.enabled = typeof body?.enabled === "boolean" ? body.enabled : !config.enabled
      await env.CONFIG.put(name, JSON.stringify(config))
      return jsonResponse({ ok: true, name, enabled: config.enabled })
    }

    if (path === "/admin/reset" && request.method === "POST") {
      const listed = await env.CONFIG.list()
      await Promise.all(listed.keys.map((key) => env.CONFIG!.delete(key.name)))
      await Promise.all(
        Object.entries(BUILTIN_CONFIGS).map(([name, config]) =>
          env.CONFIG!.put(name, JSON.stringify(config))
        )
      )
      return jsonResponse({ ok: true, restored: Object.keys(BUILTIN_CONFIGS) })
    }

    return jsonResponse({ error: "Not found." }, 404)
  } catch (error) {
    const message = error instanceof Error ? error.message : "KV operation failed"
    console.error(message)
    return jsonResponse({ error: message }, 500)
  }
}

async function handleHealth(env: Env): Promise<Response> {
  const kvBound = Boolean(env.CONFIG)
  const queueBound = Boolean(env.RETRY_QUEUE)
  const mode = kvBound && queueBound ? "full" : kvBound ? "partial" : "minimal"

  let platformNames: string[]
  if (env.CONFIG) {
    const list = await env.CONFIG.list()
    platformNames = list.keys.map((key) => key.name)
  } else {
    platformNames = Object.keys(BUILTIN_CONFIGS)
  }

  return new Response(
    JSON.stringify(
      {
        status: "ok",
        mode,
        kv_bound: kvBound,
        queue_bound: queueBound,
        platforms: platformNames,
        secrets_configured: {
          FB_ACCESS_TOKEN: Boolean(env.FB_ACCESS_TOKEN),
          TIKTOK_ACCESS_TOKEN: Boolean(env.TIKTOK_ACCESS_TOKEN),
          TIKTOK_PIXEL_CODE: Boolean(env.TIKTOK_PIXEL_CODE),
          GOOGLE_ADS_DEVELOPER_TOKEN: Boolean(env.GOOGLE_ADS_DEVELOPER_TOKEN),
          GOOGLE_ADS_OAUTH_TOKEN: Boolean(env.GOOGLE_ADS_OAUTH_TOKEN),
          KLAVIYO_API_KEY: Boolean(env.KLAVIYO_API_KEY),
          KLAVIYO_PUBLIC_KEY: Boolean(env.KLAVIYO_PUBLIC_KEY),
          PINTEREST_ACCESS_TOKEN: Boolean(env.PINTEREST_ACCESS_TOKEN),
        },
      },
      null,
      2
    ),
    {
      headers: { "Content-Type": "application/json" },
    }
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, "") || "/"

    try {
      if (path === "/" && request.method === "GET") {
        return new Response(landingHtml(url.origin), {
          headers: { "content-type": "text/html; charset=utf-8" },
        })
      }
      if (path === "/health" && request.method === "GET") {
        return handleHealth(env)
      }
      if (path === "/event" && request.method === "POST") {
        return handleEvent(request, env)
      }
      if (path.startsWith("/admin")) {
        return handleAdmin(request, env, path)
      }
      return jsonResponse({ error: "Not found." }, 404)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error"
      console.error(message)
      return jsonResponse({ error: message }, 500)
    }
  },

  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    if (!env.CONFIG) {
      console.warn("Queue consumer: CONFIG KV is not bound; acking all messages.")
      for (const message of batch.messages) {
        message.ack()
      }
      return
    }

    for (const message of batch.messages) {
      try {
        const platforms = await getEnabledPlatforms(env)
        const match = platforms.find((item) => item.name === message.body.platform)
        if (!match) {
          message.ack()
          continue
        }
        const result = await forwardToPlatform(
          env,
          match.name,
          match.config,
          message.body.event
        )
        if (result.status === "failed") {
          await retryOrLog(env, message.body, result.error ?? "failed")
        }
        message.ack()
      } catch (error) {
        if (error instanceof EmptySecretError) {
          console.warn(error.message)
          message.ack()
          continue
        }
        const text = error instanceof Error ? error.message : "Queue handler failed"
        console.error(text)
        message.retry()
      }
    }
  },
}
