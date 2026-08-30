export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export type TemplateKind =
  | "html"
  | "meta"
  | "open-graph"
  | "twitter"
  | "json-ld"
  | "custom"

export type EngineConfig = {
  version: 3
  delimiters: {
    open: string
    close: string
  }
  autoEscape: boolean
}

export type TagTemplate = {
  id: string
  name: string
  description: string
  kind: TemplateKind
  source: string
  sampleData: JsonObject
  updatedAt: string
}

export type Workspace = {
  config: EngineConfig
  templates: TagTemplate[]
  activeTemplateId: string | null
  autoInitAt: string
}

export type RenderSuccess = {
  ok: true
  html: string
}

export type RenderFailure = {
  ok: false
  error: {
    message: string
  }
}

export type RenderResult = RenderSuccess | RenderFailure
