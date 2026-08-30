export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export type EngineConfig = {
  version: 3
  delimiters: { open: string; close: string }
  autoEscape: boolean
}

export type RenderResult =
  | { ok: true; html: string }
  | { ok: false; error: { message: string } }

export type PlatformConfig = {
  enabled: boolean
  label: string
  endpoint: string
  method: "POST" | "PUT"
  headers: Record<string, string>
  bodyTemplate: string
}

export type QueueMessage = {
  platform: string
  event: JsonObject
  attempt: number
}

export interface Env {
  CONFIG?: KVNamespace
  RETRY_QUEUE?: Queue<QueueMessage>
  FB_ACCESS_TOKEN?: string
  FB_PIXEL_ID?: string
  TIKTOK_ACCESS_TOKEN?: string
  TIKTOK_PIXEL_CODE?: string
  GOOGLE_ADS_DEVELOPER_TOKEN?: string
  GOOGLE_ADS_OAUTH_TOKEN?: string
  GOOGLE_ADS_CUSTOMER_ID?: string
  GOOGLE_ADS_CONVERSION_ACTION_ID?: string
  KLAVIYO_API_KEY?: string
  KLAVIYO_PUBLIC_KEY?: string
  PINTEREST_ACCESS_TOKEN?: string
  PINTEREST_AD_ACCOUNT_ID?: string
}

export type HealthMode = "full" | "partial" | "minimal"
