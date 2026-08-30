import { JSON_ENGINE_CONFIG, renderTemplate } from "./engine"
import { collectSecrets } from "./configs"
import type { Env, JsonObject, PlatformConfig, QueueMessage } from "./types"

const MAX_ATTEMPTS = 5

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase())
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function normalizeEvent(input: JsonObject): Promise<JsonObject> {
  const event: JsonObject = { ...input }
  const email = typeof event.email === "string" ? event.email : ""
  if (email && typeof event.email_hash !== "string") {
    event.email_hash = await sha256Hex(email)
  }
  if (typeof event.event_time !== "number") {
    event.event_time = Math.floor(Date.now() / 1000)
  }
  if (typeof event.event_id !== "string" || event.event_id === "") {
    event.event_id = crypto.randomUUID()
  }
  if (typeof event.event_name !== "string" || event.event_name === "") {
    event.event_name = "PageView"
  }
  return event
}

function renderMap(
  source: Record<string, string>,
  data: Record<string, unknown>
): Record<string, string> | { error: string } {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    const rendered = renderTemplate(value, data, JSON_ENGINE_CONFIG)
    if (!rendered.ok) {
      return { error: rendered.error.message }
    }
    result[key] = rendered.html
  }
  return result
}

export async function sendToPlatform(
  name: string,
  config: PlatformConfig,
  event: JsonObject,
  env: Env
): Promise<{ ok: true; status: number } | { ok: false; error: string; status?: number }> {
  const secrets = collectSecrets(env)
  const data = { event, secrets, config }
  const endpoint = renderTemplate(config.endpoint, data, JSON_ENGINE_CONFIG)
  if (!endpoint.ok) {
    return { ok: false, error: endpoint.error.message }
  }
  const headers = renderMap(config.headers, data)
  if ("error" in headers) {
    return { ok: false, error: headers.error }
  }
  const body = renderTemplate(config.bodyTemplate, data, JSON_ENGINE_CONFIG)
  if (!body.ok) {
    return { ok: false, error: body.error.message }
  }

  try {
    const response = await fetch(endpoint.html, {
      method: config.method,
      headers: headers,
      body: body.html,
    })
    if (!response.ok) {
      const text = await response.text()
      return {
        ok: false,
        status: response.status,
        error: text.slice(0, 500) || `HTTP ${response.status}`,
      }
    }
    return { ok: true, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error"
    return { ok: false, error: message }
  }
}

export async function retryOrLog(
  env: Env,
  message: QueueMessage,
  error: string
): Promise<void> {
  if (env.RETRY_QUEUE && message.attempt < MAX_ATTEMPTS) {
    await env.RETRY_QUEUE.send({
      ...message,
      attempt: message.attempt + 1,
    })
    return
  }
  console.error(
    JSON.stringify({
      platform: message.platform,
      attempt: message.attempt,
      error,
    })
  )
}
