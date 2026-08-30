import { createDefaultWorkspace, ENGINE_VERSION, STORAGE_KEY } from "@/lib/defaults"
import type { EngineConfig, TagTemplate, Workspace } from "@/lib/types"

export { ENGINE_VERSION, STORAGE_KEY, createDefaultWorkspace }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseEngineConfig(value: unknown): EngineConfig | null {
  if (!isRecord(value)) {
    return null
  }
  const delimiters = value.delimiters
  if (!isRecord(delimiters) || typeof delimiters.open !== "string" || typeof delimiters.close !== "string") {
    return null
  }
  if (typeof value.autoEscape !== "boolean") {
    return null
  }
  return {
    version: ENGINE_VERSION,
    delimiters: {
      open: delimiters.open,
      close: delimiters.close,
    },
    autoEscape: value.autoEscape,
  }
}

function parseTemplate(value: unknown): TagTemplate | null {
  if (!isRecord(value)) {
    return null
  }
  const kinds = ["html", "meta", "open-graph", "twitter", "json-ld", "custom"] as const
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    typeof value.source !== "string" ||
    typeof value.updatedAt !== "string" ||
    typeof value.kind !== "string" ||
    !kinds.includes(value.kind as TagTemplate["kind"]) ||
    !isRecord(value.sampleData)
  ) {
    return null
  }
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    kind: value.kind as TagTemplate["kind"],
    source: value.source,
    sampleData: value.sampleData as TagTemplate["sampleData"],
    updatedAt: value.updatedAt,
  }
}

export function parseWorkspace(value: unknown): Workspace | null {
  if (!isRecord(value)) {
    return null
  }
  const config = parseEngineConfig(value.config)
  if (!config || !Array.isArray(value.templates)) {
    return null
  }
  const templates = value.templates
    .map(parseTemplate)
    .filter((item): item is TagTemplate => item !== null)
  const activeTemplateId =
    typeof value.activeTemplateId === "string" || value.activeTemplateId === null
      ? value.activeTemplateId
      : templates[0]?.id ?? null
  const autoInitAt =
    typeof value.autoInitAt === "string" ? value.autoInitAt : new Date().toISOString()

  return {
    config,
    templates,
    activeTemplateId,
    autoInitAt,
  }
}

export type WorkspaceSnapshot = {
  workspace: Workspace
  didAutoInit: boolean
}

const listeners = new Set<() => void>()
let clientSnapshot: WorkspaceSnapshot | null = null
const serverSnapshot: WorkspaceSnapshot = {
  workspace: createDefaultWorkspace(),
  didAutoInit: false,
}

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function persistToStorage(workspace: Workspace) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}

export function readWorkspace(): { workspace: Workspace; didAutoInit: boolean } {
  if (typeof window === "undefined") {
    return { workspace: serverSnapshot.workspace, didAutoInit: false }
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const workspace = createDefaultWorkspace()
    persistToStorage(workspace)
    return { workspace, didAutoInit: true }
  }

  try {
    const parsed = parseWorkspace(JSON.parse(raw) as unknown)
    if (!parsed) {
      const workspace = createDefaultWorkspace()
      persistToStorage(workspace)
      return { workspace, didAutoInit: true }
    }
    return { workspace: parsed, didAutoInit: false }
  } catch {
    const workspace = createDefaultWorkspace()
    persistToStorage(workspace)
    return { workspace, didAutoInit: true }
  }
}

export function subscribeWorkspace(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function getWorkspaceSnapshot(): WorkspaceSnapshot {
  if (!clientSnapshot) {
    clientSnapshot = readWorkspace()
  }
  return clientSnapshot
}

export function getServerWorkspaceSnapshot(): WorkspaceSnapshot {
  return serverSnapshot
}

export function writeWorkspace(workspace: Workspace): void {
  if (typeof window === "undefined") {
    return
  }
  persistToStorage(workspace)
  clientSnapshot = {
    workspace,
    didAutoInit: clientSnapshot?.didAutoInit ?? false,
  }
  emit()
}

export function dismissAutoInitNotice(): void {
  if (!clientSnapshot) {
    return
  }
  clientSnapshot = { ...clientSnapshot, didAutoInit: false }
  emit()
}

export function exportWorkspace(workspace: Workspace): string {
  return `${JSON.stringify(workspace, null, 2)}\n`
}

export function importWorkspace(raw: string): Workspace {
  const parsed = parseWorkspace(JSON.parse(raw) as unknown)
  if (!parsed) {
    throw new Error("That file is not a valid Tag Template Engine workspace.")
  }
  return parsed
}

export function newTemplateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `tpl-${Date.now()}`
}
