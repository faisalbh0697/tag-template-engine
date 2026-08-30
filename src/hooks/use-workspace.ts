"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"

import type { EngineConfig, JsonObject, TagTemplate, Workspace } from "@/lib/types"
import { createDefaultWorkspace } from "@/lib/defaults"
import {
  dismissAutoInitNotice,
  exportWorkspace,
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  importWorkspace,
  newTemplateId,
  subscribeWorkspace,
  writeWorkspace,
} from "@/lib/workspace"

type UseWorkspaceResult = {
  ready: boolean
  didAutoInit: boolean
  workspace: Workspace
  activeTemplate: TagTemplate | null
  setActiveTemplateId: (id: string) => void
  updateActiveSource: (source: string) => void
  updateActiveData: (sampleData: JsonObject) => void
  renameActive: (name: string, description: string) => void
  updateConfig: (config: EngineConfig) => void
  createTemplate: (input: { name: string; description: string; kind: TagTemplate["kind"] }) => void
  duplicateActive: () => void
  deleteActive: () => void
  resetDefaults: () => void
  downloadWorkspace: () => void
  loadWorkspaceFile: (file: File) => Promise<void>
  dismissAutoInit: () => void
}

function persist(next: Workspace): Workspace {
  writeWorkspace(next)
  return next
}

export function useWorkspace(): UseWorkspaceResult {
  const snapshot = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  )
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
  const workspace = snapshot.workspace
  const didAutoInit = snapshot.didAutoInit

  const activeTemplate = useMemo(() => {
    return (
      workspace.templates.find((item) => item.id === workspace.activeTemplateId) ??
      workspace.templates[0] ??
      null
    )
  }, [workspace])

  const patch = useCallback((updater: (current: Workspace) => Workspace) => {
    persist(updater(getWorkspaceSnapshot().workspace))
  }, [])

  const setActiveTemplateId = useCallback(
    (id: string) => {
      patch((current) => ({ ...current, activeTemplateId: id }))
    },
    [patch]
  )

  const updateActive = useCallback(
    (mutate: (template: TagTemplate) => TagTemplate) => {
      patch((current) => ({
        ...current,
        templates: current.templates.map((item) =>
          item.id === current.activeTemplateId
            ? mutate({ ...item, updatedAt: new Date().toISOString() })
            : item
        ),
      }))
    },
    [patch]
  )

  const updateActiveSource = useCallback(
    (source: string) => {
      updateActive((template) => ({ ...template, source }))
    },
    [updateActive]
  )

  const updateActiveData = useCallback(
    (sampleData: JsonObject) => {
      updateActive((template) => ({ ...template, sampleData }))
    },
    [updateActive]
  )

  const renameActive = useCallback(
    (name: string, description: string) => {
      updateActive((template) => ({ ...template, name, description }))
    },
    [updateActive]
  )

  const updateConfig = useCallback(
    (config: EngineConfig) => {
      patch((current) => ({ ...current, config }))
    },
    [patch]
  )

  const createTemplate = useCallback(
    (input: { name: string; description: string; kind: TagTemplate["kind"] }) => {
      const id = newTemplateId()
      const next: TagTemplate = {
        id,
        name: input.name,
        description: input.description,
        kind: input.kind,
        source: "<!-- {{title}} -->\n",
        sampleData: { title: "Untitled" },
        updatedAt: new Date().toISOString(),
      }
      patch((current) => ({
        ...current,
        templates: [next, ...current.templates],
        activeTemplateId: id,
      }))
      toast.success("Template created")
    },
    [patch]
  )

  const duplicateActive = useCallback(() => {
    const current = getWorkspaceSnapshot().workspace
    const active =
      current.templates.find((item) => item.id === current.activeTemplateId) ??
      current.templates[0]
    if (!active) {
      return
    }
    const id = newTemplateId()
    const copy: TagTemplate = {
      ...active,
      id,
      name: `${active.name} copy`,
      updatedAt: new Date().toISOString(),
    }
    patch((state) => ({
      ...state,
      templates: [copy, ...state.templates],
      activeTemplateId: id,
    }))
    toast.success("Template duplicated")
  }, [patch])

  const deleteActive = useCallback(() => {
    const current = getWorkspaceSnapshot().workspace
    const activeId = current.activeTemplateId
    if (!activeId) {
      return
    }
    patch((state) => {
      const templates = state.templates.filter((item) => item.id !== activeId)
      return {
        ...state,
        templates,
        activeTemplateId: templates[0]?.id ?? null,
      }
    })
    toast.success("Template deleted")
  }, [patch])

  const resetDefaults = useCallback(() => {
    persist(createDefaultWorkspace())
    toast.success("Restored starter configs")
  }, [])

  const downloadWorkspace = useCallback(() => {
    const blob = new Blob([exportWorkspace(workspace)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "tag-engine.config.json"
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Downloaded tag-engine.config.json")
  }, [workspace])

  const loadWorkspaceFile = useCallback(async (file: File) => {
    const raw = await file.text()
    try {
      persist(importWorkspace(raw))
      toast.success("Workspace imported")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not import that file."
      toast.error(message)
    }
  }, [])

  return {
    ready,
    didAutoInit,
    workspace,
    activeTemplate,
    setActiveTemplateId,
    updateActiveSource,
    updateActiveData,
    renameActive,
    updateConfig,
    createTemplate,
    duplicateActive,
    deleteActive,
    resetDefaults,
    downloadWorkspace,
    loadWorkspaceFile,
    dismissAutoInit: dismissAutoInitNotice,
  }
}
