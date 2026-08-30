import type { EngineConfig, JsonValue, RenderResult } from "./types"

type Token =
  | { type: "text"; value: string }
  | { type: "var"; path: string; escaped: boolean }
  | { type: "if"; path: string }
  | { type: "else" }
  | { type: "endif" }
  | { type: "each"; path: string }
  | { type: "endeach" }

type AstNode =
  | { type: "text"; value: string }
  | { type: "var"; path: string; escaped: boolean }
  | { type: "if"; path: string; consequent: AstNode[]; alternate: AstNode[] }
  | { type: "each"; path: string; body: AstNode[] }

type Frame = {
  value: unknown
  index?: number
  first?: boolean
  last?: boolean
}

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export const JSON_ENGINE_CONFIG: EngineConfig = {
  version: 3,
  delimiters: { open: "{{", close: "}}" },
  autoEscape: false,
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char)
}

export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false) {
    return false
  }
  if (value === 0 || value === "") {
    return false
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return true
}

export function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return ""
  }
}

function readPath(frame: Frame, path: string): unknown {
  const trimmed = path.trim()
  if (trimmed === "this" || trimmed === ".") {
    return frame.value
  }
  if (trimmed === "@index") {
    return frame.index ?? ""
  }
  if (trimmed === "@first") {
    return frame.first ?? false
  }
  if (trimmed === "@last") {
    return frame.last ?? false
  }

  const segments = trimmed.split(".").filter(Boolean)
  let current: unknown = frame.value
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function lookup(stack: Frame[], path: string): unknown {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const frame = stack[index]
    if (!frame) {
      continue
    }
    if (path.startsWith("@") || path === "this" || path === ".") {
      return readPath(frame, path)
    }
    const value = readPath(frame, path)
    if (value !== undefined) {
      return value
    }
  }
  return undefined
}

function tokenize(source: string, open: string, close: string): Token[] {
  if (!open || !close) {
    throw new Error("Delimiters cannot be empty.")
  }
  if (open === close) {
    throw new Error("Opening and closing delimiters must differ.")
  }

  const tokens: Token[] = []
  let cursor = 0

  while (cursor < source.length) {
    const start = source.indexOf(open, cursor)
    if (start === -1) {
      tokens.push({ type: "text", value: source.slice(cursor) })
      break
    }

    if (start > cursor) {
      tokens.push({ type: "text", value: source.slice(cursor, start) })
    }

    const triple = source.startsWith("{", start + open.length) && close.endsWith("}")
    const closer = triple ? `}${close}` : close
    const innerStart = start + open.length + (triple ? 1 : 0)
    const end = source.indexOf(closer, innerStart)
    if (end === -1) {
      throw new Error(`Unclosed tag starting at index ${start}.`)
    }

    const raw = source.slice(innerStart, end).trim()
    cursor = end + closer.length

    if (raw.startsWith("!")) {
      continue
    }
    if (raw === "else") {
      tokens.push({ type: "else" })
      continue
    }
    if (raw === "/if") {
      tokens.push({ type: "endif" })
      continue
    }
    if (raw === "/each") {
      tokens.push({ type: "endeach" })
      continue
    }
    if (raw.startsWith("#if ")) {
      tokens.push({ type: "if", path: raw.slice(4).trim() })
      continue
    }
    if (raw.startsWith("#each ")) {
      tokens.push({ type: "each", path: raw.slice(6).trim() })
      continue
    }
    if (!raw) {
      throw new Error("Empty interpolation tag.")
    }
    tokens.push({ type: "var", path: raw, escaped: !triple })
  }

  return tokens
}

type BlockFrame =
  | { kind: "if"; path: string; consequent: AstNode[]; alternate: AstNode[]; branch: "consequent" | "alternate" }
  | { kind: "each"; path: string; body: AstNode[] }

function currentNodes(root: AstNode[], blocks: BlockFrame[]): AstNode[] {
  const block = blocks[blocks.length - 1]
  if (!block) {
    return root
  }
  if (block.kind === "each") {
    return block.body
  }
  return block.branch === "consequent" ? block.consequent : block.alternate
}

function parse(tokens: Token[]): AstNode[] {
  const root: AstNode[] = []
  const blocks: BlockFrame[] = []

  for (const token of tokens) {
    if (token.type === "text") {
      currentNodes(root, blocks).push({ type: "text", value: token.value })
      continue
    }
    if (token.type === "var") {
      currentNodes(root, blocks).push({
        type: "var",
        path: token.path,
        escaped: token.escaped,
      })
      continue
    }
    if (token.type === "if") {
      blocks.push({
        kind: "if",
        path: token.path,
        consequent: [],
        alternate: [],
        branch: "consequent",
      })
      continue
    }
    if (token.type === "each") {
      blocks.push({ kind: "each", path: token.path, body: [] })
      continue
    }
    if (token.type === "else") {
      const block = blocks[blocks.length - 1]
      if (!block || block.kind !== "if") {
        throw new Error("{{else}} must appear inside {{#if}}.")
      }
      if (block.branch === "alternate") {
        throw new Error("Multiple {{else}} tags in the same {{#if}} block.")
      }
      block.branch = "alternate"
      continue
    }
    if (token.type === "endif") {
      const block = blocks.pop()
      if (!block || block.kind !== "if") {
        throw new Error("Unmatched {{/if}}.")
      }
      currentNodes(root, blocks).push({
        type: "if",
        path: block.path,
        consequent: block.consequent,
        alternate: block.alternate,
      })
      continue
    }
    if (token.type === "endeach") {
      const block = blocks.pop()
      if (!block || block.kind !== "each") {
        throw new Error("Unmatched {{/each}}.")
      }
      currentNodes(root, blocks).push({
        type: "each",
        path: block.path,
        body: block.body,
      })
    }
  }

  if (blocks.length > 0) {
    const open = blocks[blocks.length - 1]
    throw new Error(
      open?.kind === "if"
        ? `Unclosed {{#if ${open.path}}}.`
        : `Unclosed {{#each ${open?.path}}}.`
    )
  }

  return root
}

function renderNodes(nodes: AstNode[], stack: Frame[], config: EngineConfig): string {
  let output = ""

  for (const node of nodes) {
    if (node.type === "text") {
      output += node.value
      continue
    }
    if (node.type === "var") {
      const value = stringifyValue(lookup(stack, node.path))
      output += node.escaped && config.autoEscape ? escapeHtml(value) : value
      continue
    }
    if (node.type === "if") {
      const value = lookup(stack, node.path)
      const branch = isTruthy(value) ? node.consequent : node.alternate
      output += renderNodes(branch, stack, config)
      continue
    }

    const collection = lookup(stack, node.path)
    if (!Array.isArray(collection)) {
      continue
    }
    collection.forEach((item, index) => {
      output += renderNodes(node.body, [
        ...stack,
        {
          value: item,
          index,
          first: index === 0,
          last: index === collection.length - 1,
        },
      ], config)
    })
  }

  return output
}

export function renderTemplate(
  source: string,
  data: Record<string, JsonValue | unknown>,
  config: EngineConfig = JSON_ENGINE_CONFIG
): RenderResult {
  try {
    const tokens = tokenize(source, config.delimiters.open, config.delimiters.close)
    const ast = parse(tokens)
    const html = renderNodes(ast, [{ value: data }], config)
    return { ok: true, html }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render template."
    return { ok: false, error: { message } }
  }
}
