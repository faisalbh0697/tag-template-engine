import {
  BUILTIN_CONFIGS,
  KV_REQUIRED_ERROR,
  collectSecrets,
  ensureConfigs,
  getEnabledPlatforms,
  healthMode,
  jsonResponse,
  listAllConfigs,
  missingSecrets,
  secretsConfigured,
} from "./configs"
import { normalizeEvent, retryOrLog, sendToPlatform } from "./dispatch"
import { landingHtml } from "./landing"
import type { Env, JsonObject, QueueMessage } from "./types"

export { ensureConfigs, getEnabledPlatforms }

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  }
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
  const secrets = collectSecrets(env)
  const results = await Promise.all(
    platforms.map(async ({ name, config }) => {
      const missing = missingSecrets(name, secrets)
      if (missing.length > 0) {
        return {
          platform: name,
          ok: false,
          status: 0,
          error: `Missing secrets: ${missing.join(", ")}`,
          skipped: true,
        }
      }
      const result = await sendToPlatform(name, config, event, env)
      if (!result.ok) {
        await retryOrLog(env, { platform: name, event, attempt: 0 }, result.error)
      }
      return {
        platform: name,
        ok: result.ok,
        status: result.ok ? result.status : result.status ?? 0,
        error: result.ok ? undefined : result.error,
        skipped: false,
      }
    })
  )
  return jsonResponse({
    event_id: event.event_id,
    mode: healthMode(env),
    secrets_present: Object.keys(secrets).length,
    results,
  })
}

async function handleAdmin(request: Request, env: Env, path: string): Promise<Response> {
  if (!env.CONFIG) {
    return jsonResponse(KV_REQUIRED_ERROR, 501)
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
  const platforms = await getEnabledPlatforms(env)
  return jsonResponse({
    ok: true,
    version: 3,
    mode: healthMode(env),
    kv_bound: Boolean(env.CONFIG),
    queue_bound: Boolean(env.RETRY_QUEUE),
    platforms: platforms.map((item) => item.name),
    secrets_configured: secretsConfigured(env),
  })
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
    for (const message of batch.messages) {
      try {
        const platforms = await getEnabledPlatforms(env)
        const match = platforms.find((item) => item.name === message.body.platform)
        if (!match) {
          message.ack()
          continue
        }
        const missing = missingSecrets(match.name, collectSecrets(env))
        if (missing.length > 0) {
          console.error(`Queue skip ${match.name}: missing ${missing.join(", ")}`)
          message.ack()
          continue
        }
        const result = await sendToPlatform(
          match.name,
          match.config,
          message.body.event,
          env
        )
        if (!result.ok) {
          await retryOrLog(env, message.body, result.error)
        }
        message.ack()
      } catch (error) {
        const text = error instanceof Error ? error.message : "Queue handler failed"
        console.error(text)
        message.retry()
      }
    }
  },
}
