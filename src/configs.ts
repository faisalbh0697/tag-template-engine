import type { Env, JsonObject, PlatformConfig } from "./types"

export const BUILTIN_CONFIGS: Record<string, PlatformConfig> = {
  facebook: {
    enabled: true,
    label: "Meta Conversion API",
    endpoint:
      "https://graph.facebook.com/v21.0/{{secrets.FB_PIXEL_ID}}/events?access_token={{secrets.FB_ACCESS_TOKEN}}",
    method: "POST",
    headers: { "content-type": "application/json" },
    bodyTemplate: `{
  "data": [
    {
      "event_name": "{{event.event_name}}",
      "event_time": {{#if event.event_time}}{{event.event_time}}{{else}}0{{/if}},
      "event_id": "{{event.event_id}}",
      "action_source": "website",
      "user_data": {
        {{#if event.email_hash}}"em": ["{{event.email_hash}}"]{{/if}}
      },
      "custom_data": {
        "currency": "{{event.currency}}",
        "value": {{#if event.value}}{{event.value}}{{else}}0{{/if}}
      }
    }
  ]
}`,
  },
  tiktok: {
    enabled: true,
    label: "TikTok Events API",
    endpoint: "https://business-api.tiktok.com/open_api/v1.3/event/track/",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "access-token": "{{secrets.TIKTOK_ACCESS_TOKEN}}",
    },
    bodyTemplate: `{
  "event_source": "web",
  "event_source_id": "{{secrets.TIKTOK_PIXEL_CODE}}",
  "data": [
    {
      "event": "{{event.event_name}}",
      "event_time": {{#if event.event_time}}{{event.event_time}}{{else}}0{{/if}},
      "event_id": "{{event.event_id}}",
      "user": {
        "email": "{{event.email_hash}}"
      },
      "properties": {
        "currency": "{{event.currency}}",
        "value": {{#if event.value}}{{event.value}}{{else}}0{{/if}}
      }
    }
  ]
}`,
  },
  google_ads: {
    enabled: true,
    label: "Google Ads click conversions",
    endpoint:
      "https://googleads.googleapis.com/v17/customers/{{secrets.GOOGLE_ADS_CUSTOMER_ID}}:uploadClickConversions",
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer {{secrets.GOOGLE_ADS_OAUTH_TOKEN}}",
      "developer-token": "{{secrets.GOOGLE_ADS_DEVELOPER_TOKEN}}",
    },
    bodyTemplate: `{
  "conversions": [
    {
      "conversionAction": "customers/{{secrets.GOOGLE_ADS_CUSTOMER_ID}}/conversionActions/{{secrets.GOOGLE_ADS_CONVERSION_ACTION_ID}}",
      "conversionDateTime": "{{event.conversion_time}}",
      "conversionValue": {{#if event.value}}{{event.value}}{{else}}0{{/if}},
      "currencyCode": "{{event.currency}}"
    }
  ],
  "partialFailure": true
}`,
  },
  klaviyo: {
    enabled: true,
    label: "Klaviyo events",
    endpoint: "https://a.klaviyo.com/api/events/",
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/vnd.api+json",
      revision: "2024-10-15",
      authorization: "Klaviyo-API-Key {{secrets.KLAVIYO_API_KEY}}",
    },
    bodyTemplate: `{
  "data": {
    "type": "event",
    "attributes": {
      "metric": { "data": { "type": "metric", "attributes": { "name": "{{event.event_name}}" } } },
      "profile": { "data": { "type": "profile", "attributes": { "email": "{{event.email}}" } } },
      "properties": {
        "value": {{#if event.value}}{{event.value}}{{else}}0{{/if}},
        "currency": "{{event.currency}}"
      }
    }
  }
}`,
  },
  pinterest: {
    enabled: true,
    label: "Pinterest conversions",
    endpoint:
      "https://api.pinterest.com/v5/ad_accounts/{{secrets.PINTEREST_AD_ACCOUNT_ID}}/events",
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer {{secrets.PINTEREST_ACCESS_TOKEN}}",
    },
    bodyTemplate: `{
  "data": [
    {
      "event_name": "{{event.event_name}}",
      "event_time": {{#if event.event_time}}{{event.event_time}}{{else}}0{{/if}},
      "event_id": "{{event.event_id}}",
      "action_source": "web",
      "user_data": { "em": ["{{event.email_hash}}"] }
    }
  ]
}`,
  },
}

function isPlatformConfig(value: unknown): value is PlatformConfig {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.enabled === "boolean" &&
    typeof record.label === "string" &&
    typeof record.endpoint === "string" &&
    (record.method === "POST" || record.method === "PUT") &&
    typeof record.bodyTemplate === "string" &&
    typeof record.headers === "object" &&
    record.headers !== null
  )
}

export async function ensureConfigs(env: Env): Promise<void> {
  if (!env.CONFIG) {
    return
  }
  const existing = await env.CONFIG.list({ limit: 1 })
  if (existing.keys.length > 0) {
    return
  }
  await Promise.all(
    Object.entries(BUILTIN_CONFIGS).map(([name, config]) =>
      env.CONFIG!.put(name, JSON.stringify(config))
    )
  )
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

export async function listAllConfigs(
  env: Env
): Promise<Record<string, PlatformConfig>> {
  if (!env.CONFIG) {
    return { ...BUILTIN_CONFIGS }
  }
  await ensureConfigs(env)
  const listed = await env.CONFIG.list()
  const result: Record<string, PlatformConfig> = {}
  for (const key of listed.keys) {
    const raw = await env.CONFIG.get(key.name)
    if (!raw) {
      continue
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isPlatformConfig(parsed)) {
        result[key.name] = parsed
      }
    } catch {
      // skip broken keys
    }
  }
  return result
}

export const PLATFORM_SECRETS: Record<string, readonly string[]> = {
  facebook: ["FB_ACCESS_TOKEN", "FB_PIXEL_ID"],
  tiktok: ["TIKTOK_ACCESS_TOKEN", "TIKTOK_PIXEL_CODE"],
  google_ads: [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_OAUTH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
    "GOOGLE_ADS_CONVERSION_ACTION_ID",
  ],
  klaviyo: ["KLAVIYO_API_KEY"],
  pinterest: ["PINTEREST_ACCESS_TOKEN", "PINTEREST_AD_ACCOUNT_ID"],
}

export function missingSecrets(name: string, secrets: Record<string, string>): string[] {
  const required = PLATFORM_SECRETS[name] ?? []
  return required.filter((key) => !secrets[key])
}

export function collectSecrets(env: Env): Record<string, string> {
  const secrets: Record<string, string> = {}
  const keys = [
    "FB_ACCESS_TOKEN",
    "FB_PIXEL_ID",
    "TIKTOK_ACCESS_TOKEN",
    "TIKTOK_PIXEL_CODE",
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_OAUTH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
    "GOOGLE_ADS_CONVERSION_ACTION_ID",
    "KLAVIYO_API_KEY",
    "KLAVIYO_PUBLIC_KEY",
    "PINTEREST_ACCESS_TOKEN",
    "PINTEREST_AD_ACCOUNT_ID",
  ] as const
  for (const key of keys) {
    const value = env[key]
    if (value) {
      secrets[key] = value
    }
  }
  return secrets
}

export function secretsConfigured(env: Env): Record<string, boolean> {
  const secrets = collectSecrets(env)
  return {
    FB_ACCESS_TOKEN: Boolean(secrets.FB_ACCESS_TOKEN),
    FB_PIXEL_ID: Boolean(secrets.FB_PIXEL_ID),
    TIKTOK_ACCESS_TOKEN: Boolean(secrets.TIKTOK_ACCESS_TOKEN),
    TIKTOK_PIXEL_CODE: Boolean(secrets.TIKTOK_PIXEL_CODE),
    GOOGLE_ADS_DEVELOPER_TOKEN: Boolean(secrets.GOOGLE_ADS_DEVELOPER_TOKEN),
    GOOGLE_ADS_OAUTH_TOKEN: Boolean(secrets.GOOGLE_ADS_OAUTH_TOKEN),
    GOOGLE_ADS_CUSTOMER_ID: Boolean(secrets.GOOGLE_ADS_CUSTOMER_ID),
    GOOGLE_ADS_CONVERSION_ACTION_ID: Boolean(secrets.GOOGLE_ADS_CONVERSION_ACTION_ID),
    KLAVIYO_API_KEY: Boolean(secrets.KLAVIYO_API_KEY),
    KLAVIYO_PUBLIC_KEY: Boolean(secrets.KLAVIYO_PUBLIC_KEY),
    PINTEREST_ACCESS_TOKEN: Boolean(secrets.PINTEREST_ACCESS_TOKEN),
    PINTEREST_AD_ACCOUNT_ID: Boolean(secrets.PINTEREST_AD_ACCOUNT_ID),
  }
}

export function healthMode(env: Env): "full" | "partial" | "minimal" {
  const kv = Boolean(env.CONFIG)
  const queue = Boolean(env.RETRY_QUEUE)
  if (kv && queue) {
    return "full"
  }
  if (kv) {
    return "partial"
  }
  return "minimal"
}

export function jsonResponse(body: JsonObject | Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  })
}

export const KV_REQUIRED_ERROR = {
  error: "KV namespace not bound. Admin API requires KV.",
}
