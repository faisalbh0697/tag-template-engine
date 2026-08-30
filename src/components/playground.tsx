"use client"

import { useMemo, useRef, useState } from "react"
import {
  CopyIcon,
  DownloadIcon,
  FilePlusIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { renderTemplate } from "@/lib/engine"
import { useWorkspace } from "@/hooks/use-workspace"
import type { JsonObject, TemplateKind } from "@/lib/types"

const KIND_LABEL: Record<TemplateKind, string> = {
  html: "HTML",
  meta: "Meta",
  "open-graph": "Open Graph",
  twitter: "Twitter",
  "json-ld": "JSON-LD",
  custom: "Custom",
}

function kindBadge(kind: TemplateKind) {
  return KIND_LABEL[kind]
}

function parseDataJson(raw: string): { data: JsonObject | null; error: string | null } {
  if (!raw.trim()) {
    return { data: {}, error: null }
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { data: null, error: "Data must be a JSON object." }
    }
    return { data: parsed as JsonObject, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON."
    return { data: null, error: message }
  }
}

export function Playground() {
  const workspaceState = useWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dataDraft, setDataDraft] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newName, setNewName] = useState("Untitled template")
  const [newDescription, setNewDescription] = useState("Custom tag template")
  const [newKind, setNewKind] = useState<TemplateKind>("custom")
  const [openDelim, setOpenDelim] = useState("{{")
  const [closeDelim, setCloseDelim] = useState("}}")

  const {
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
    dismissAutoInit,
  } = workspaceState

  const dataRaw =
    dataDraft ?? JSON.stringify(activeTemplate?.sampleData ?? {}, null, 2)
  const parsedData = useMemo(() => parseDataJson(dataRaw), [dataRaw])
  const renderResult = useMemo(() => {
    if (!activeTemplate) {
      return null
    }
    if (parsedData.error || !parsedData.data) {
      return null
    }
    return renderTemplate(activeTemplate.source, parsedData.data, workspace.config)
  }, [activeTemplate, parsedData, workspace.config])

  function commitData() {
    if (!parsedData.data || parsedData.error) {
      toast.error(parsedData.error ?? "Fix JSON before saving.")
      return
    }
    updateActiveData(parsedData.data)
    setDataDraft(null)
    toast.success("Sample data saved")
  }

  function openSettings() {
    setOpenDelim(workspace.config.delimiters.open)
    setCloseDelim(workspace.config.delimiters.close)
    setSettingsOpen(true)
  }

  async function copyOutput() {
    if (!renderResult || !renderResult.ok) {
      toast.error("Nothing valid to copy yet.")
      return
    }
    await navigator.clipboard.writeText(renderResult.html)
    toast.success("Rendered tags copied")
  }

  if (!ready) {
    return (
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="h-[70vh] animate-pulse rounded-xl bg-muted" />
        <div className="h-[70vh] animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
      {didAutoInit ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <SparklesIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
            <div>
              <p className="text-sm font-medium">Configs auto-initialized</p>
              <p className="text-sm text-muted-foreground">
                Engine settings and five starter templates were written to this
                browser. No terminal, no <code className="font-mono text-xs">npx init</code>.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={dismissAutoInit}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="grid flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-[420px] flex-col rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Templates</p>
              <p className="text-xs text-muted-foreground">
                {workspace.templates.length} in this browser
              </p>
            </div>
            <Button size="icon-sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <FilePlusIcon />
              <span className="sr-only">New template</span>
            </Button>
          </div>
          {workspace.templates.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm font-medium">No templates yet</p>
              <p className="text-sm text-muted-foreground">
                Create one, or restore the v3 starter set.
              </p>
              <Button size="sm" onClick={resetDefaults}>
                Restore starters
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <ul className="flex flex-col p-2">
                {workspace.templates.map((template) => {
                  const selected = template.id === activeTemplate?.id
                  return (
                    <li key={template.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDataDraft(null)
                          setActiveTemplateId(template.id)
                        }}
                        className={`flex w-full flex-col items-start gap-1 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          selected ? "bg-muted" : "hover:bg-muted/60"
                        }`}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {template.name}
                          </span>
                          <Badge variant="outline">{kindBadge(template.kind)}</Badge>
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          )}
          <div className="flex flex-wrap gap-2 border-t p-2">
            <Button variant="outline" size="sm" onClick={downloadWorkspace}>
              <DownloadIcon />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <UploadIcon />
              Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void loadWorkspaceFile(file)
                }
                event.target.value = ""
              }}
            />
          </div>
        </aside>

        <section className="flex min-h-[520px] flex-col rounded-xl border bg-card">
          {!activeTemplate ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <h1 className="text-lg font-medium">Select a template</h1>
              <p className="max-w-sm text-sm text-muted-foreground">
                Starter templates are created automatically the first time this
                page loads.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-base font-medium">
                      {activeTemplate.name}
                    </h1>
                    <Badge variant="secondary">{kindBadge(activeTemplate.kind)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeTemplate.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" onClick={() => void copyOutput()}>
                    <CopyIcon />
                    Copy output
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" size="icon-sm" />}
                    >
                      <MoreHorizontalIcon />
                      <span className="sr-only">Template actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={duplicateActive}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={openSettings}>
                        Engine settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={resetDefaults}>
                        <RotateCcwIcon />
                        Restore starters
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={deleteActive}>
                        <Trash2Icon />
                        Delete template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid flex-1 gap-0 lg:grid-cols-2">
                <div className="flex min-h-[360px] flex-col border-b lg:border-r lg:border-b-0">
                  <Tabs defaultValue="source" className="flex h-full flex-col gap-0">
                    <div className="border-b px-3 py-2">
                      <TabsList>
                        <TabsTrigger value="source">Template</TabsTrigger>
                        <TabsTrigger value="data">JSON data</TabsTrigger>
                        <TabsTrigger value="meta">Details</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="source" className="flex min-h-0 flex-1 flex-col p-0">
                      <Textarea
                        value={activeTemplate.source}
                        onChange={(event) => updateActiveSource(event.target.value)}
                        spellCheck={false}
                        className="min-h-[320px] flex-1 resize-none rounded-none border-0 font-mono text-xs leading-5 md:text-xs"
                      />
                    </TabsContent>
                    <TabsContent value="data" className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                      <Textarea
                        value={dataRaw}
                        onChange={(event) => setDataDraft(event.target.value)}
                        spellCheck={false}
                        aria-invalid={Boolean(parsedData.error)}
                        className="min-h-[260px] flex-1 resize-none font-mono text-xs leading-5 md:text-xs"
                      />
                      {parsedData.error ? (
                        <p className="text-xs text-destructive">{parsedData.error}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Valid JSON object. Used as the render context.
                        </p>
                      )}
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={commitData}
                          disabled={Boolean(parsedData.error)}
                        >
                          Save data into template
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="meta" className="space-y-3 p-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="template-name">Name</Label>
                        <Input
                          id="template-name"
                          value={activeTemplate.name}
                          onChange={(event) =>
                            renameActive(event.target.value, activeTemplate.description)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="template-description">Description</Label>
                        <Textarea
                          id="template-description"
                          value={activeTemplate.description}
                          onChange={(event) =>
                            renameActive(activeTemplate.name, event.target.value)
                          }
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex min-h-[360px] flex-col">
                  <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <p className="text-sm font-medium">Rendered tags</p>
                    {renderResult?.ok ? (
                      <Badge variant="outline">Live</Badge>
                    ) : (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    {parsedData.error ? (
                      <p className="text-sm text-destructive">
                        Fix the JSON data to preview output.
                      </p>
                    ) : renderResult && !renderResult.ok ? (
                      <p className="text-sm text-destructive">{renderResult.error.message}</p>
                    ) : renderResult?.ok && renderResult.html.trim() === "" ? (
                      <p className="text-sm text-muted-foreground">
                        Rendered output is empty. Add tags or check your conditionals.
                      </p>
                    ) : (
                      <pre className="font-mono text-xs leading-5 whitespace-pre-wrap text-foreground">
                        {renderResult?.ok ? renderResult.html : ""}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>
              Stored in this browser with the rest of the auto-init workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-description">Description</Label>
              <Input
                id="new-description"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={newKind}
                onValueChange={(value) => {
                  if (value) {
                    setNewKind(value as TemplateKind)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABEL) as TemplateKind[]).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {KIND_LABEL[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!newName.trim()) {
                  toast.error("Give the template a name.")
                  return
                }
                createTemplate({
                  name: newName.trim(),
                  description: newDescription.trim() || "Custom tag template",
                  kind: newKind,
                })
                setCreateOpen(false)
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Engine settings</DialogTitle>
            <DialogDescription>
              These live in <code className="font-mono text-xs">tag-engine.config.json</code>{" "}
              inside localStorage. Change them here — no CLI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="open-delim">Open</Label>
                <Input
                  id="open-delim"
                  value={openDelim}
                  onChange={(event) => setOpenDelim(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="close-delim">Close</Label>
                <Input
                  id="close-delim"
                  value={closeDelim}
                  onChange={(event) => setCloseDelim(event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">HTML auto-escape</p>
                <p className="text-xs text-muted-foreground">
                  Escape <code className="font-mono">{"{{value}}"}</code>. Use{" "}
                  <code className="font-mono">{"{{{value}}}"}</code> for raw HTML.
                </p>
              </div>
              <Switch
                checked={workspace.config.autoEscape}
                onCheckedChange={(checked) =>
                  updateConfig({ ...workspace.config, autoEscape: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!openDelim || !closeDelim || openDelim === closeDelim) {
                  toast.error("Delimiters must be non-empty and different.")
                  return
                }
                updateConfig({
                  ...workspace.config,
                  delimiters: { open: openDelim, close: closeDelim },
                })
                setSettingsOpen(false)
                toast.success("Engine config saved")
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
