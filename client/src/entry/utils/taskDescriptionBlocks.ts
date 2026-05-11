import type { BlockNoteEditor } from "@blocknote/core";
import type { PartialBlock } from "@blocknote/core";

export const emptyTaskDescriptionBlocks: PartialBlock[] = [
  { type: "paragraph", content: "" },
];

export function coerceTaskDescriptionString(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "string") {
    return raw;
  }
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return null;
    }
  }
  return String(raw);
}

function stripMarkdownFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/u, "")
      .trim();
  }
  return s;
}

export function parseTaskDescriptionJson(raw: string): unknown | null {
  const cleaned = stripMarkdownFence(raw.replace(/^\uFEFF/u, ""));
  try {
    let parsed: unknown = JSON.parse(cleaned);
    for (let depth = 0; depth < 5 && typeof parsed === "string"; depth++) {
      try {
        parsed = JSON.parse(parsed.trim());
      } catch {
        break;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function inlineNodesToPlainText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  const parts: string[] = [];
  for (const node of content) {
    if (typeof node !== "object" || node === null) {
      continue;
    }
    const o = node as Record<string, unknown>;
    if (o.type === "text" && typeof o.text === "string") {
      parts.push(o.text);
    }
    if (o.type === "link" && Array.isArray(o.content)) {
      parts.push(inlineNodesToPlainText(o.content));
    }
  }
  return parts.join("");
}

function blockNoteLikeBlockToMarkdownLines(
  block: unknown,
  indent: string,
): string[] {
  if (typeof block !== "object" || block === null) {
    return [];
  }
  const b = block as Record<string, unknown>;
  const type = typeof b.type === "string" ? b.type : "";
  const text = inlineNodesToPlainText(b.content);
  const lines: string[] = [];

  const headingLevel = (): number => {
    const props = b.props;
    if (typeof props === "object" && props !== null && "level" in props) {
      const n = Number((props as Record<string, unknown>).level);
      return Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 1), 6) : 1;
    }
    return 1;
  };

  switch (type) {
    case "paragraph":
      lines.push(indent + text);
      break;
    case "heading":
      lines.push(`${indent}${"#".repeat(headingLevel())} ${text}`);
      break;
    case "bulletListItem":
      lines.push(`${indent}- ${text}`);
      break;
    case "numberedListItem":
      lines.push(`${indent}1. ${text}`);
      break;
    case "checkListItem": {
      const props = b.props;
      let checked = false;
      if (typeof props === "object" && props !== null && "checked" in props) {
        checked = Boolean((props as Record<string, unknown>).checked);
      }
      lines.push(`${indent}- [${checked ? "x" : " "}] ${text}`);
      break;
    }
    case "quote":
      lines.push(`${indent}> ${text}`);
      break;
    case "codeBlock":
      lines.push(`${indent}\`\`\`\n${indent}${text}\n${indent}\`\`\``);
      break;
    default:
      if (text !== "") {
        lines.push(indent + text);
      }
  }

  if (Array.isArray(b.children)) {
    const nextIndent = indent + "  ";
    for (const child of b.children) {
      lines.push(...blockNoteLikeBlockToMarkdownLines(child, nextIndent));
    }
  }

  return lines;
}

function coerceDocContentToBlockArray(content: unknown): unknown[] | null {
  if (Array.isArray(content)) {
    return content;
  }
  if (typeof content === "object" && content !== null) {
    const vals = Object.values(content as Record<string, unknown>);
    if (
      vals.length > 0 &&
      vals.every((v) => isRecord(v) && typeof v.type === "string")
    ) {
      return vals;
    }
  }
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function blockNoteDocumentRootToBlocks(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (typeof parsed === "object" && parsed !== null) {
    const o = parsed as Record<string, unknown>;
    if (typeof o.type === "string" && o.type.toLowerCase() === "doc") {
      return coerceDocContentToBlockArray(o.content);
    }
  }
  return null;
}

const IMPORT_DEFAULT_BLOCK_PROPS = {
  backgroundColor: "default",
  textColor: "default",
  textAlignment: "left",
} as const;

function normalizeImportedBlockNode(raw: unknown): PartialBlock | null {
  if (!isRecord(raw)) {
    return null;
  }
  const typeRaw = raw.type;
  if (typeof typeRaw !== "string" || typeRaw === "") {
    return null;
  }
  const block = { ...raw } as Record<string, unknown>;
  let type = typeRaw === "blockquote" ? "quote" : typeRaw;
  block.type = type;

  if (!Array.isArray(block.children)) {
    block.children = [];
  }

  const prevProps =
    typeof block.props === "object" && block.props !== null
      ? { ...(block.props as Record<string, unknown>) }
      : {};

  if (
    type === "paragraph" ||
    type === "bulletListItem" ||
    type === "numberedListItem" ||
    type === "quote"
  ) {
    block.props = { ...IMPORT_DEFAULT_BLOCK_PROPS, ...prevProps };
    if (block.content === undefined) {
      block.content = "";
    }
  } else if (type === "heading") {
    const hp: Record<string, unknown> = {
      ...IMPORT_DEFAULT_BLOCK_PROPS,
      level: 1,
      ...prevProps,
    };
    if (typeof hp.level !== "number" || !Number.isFinite(hp.level)) {
      hp.level = 1;
    }
    block.props = hp;
    if (block.content === undefined) {
      block.content = "";
    }
  } else if (type === "checkListItem") {
    const clp: Record<string, unknown> = {
      ...IMPORT_DEFAULT_BLOCK_PROPS,
      checked: false,
      ...prevProps,
    };
    if (typeof clp.checked !== "boolean") {
      clp.checked = Boolean(clp.checked);
    }
    block.props = clp;
    if (block.content === undefined) {
      block.content = "";
    }
  } else if (type === "table") {
    block.props = {
      textColor: "default",
      ...prevProps,
    };
  } else if (type === "codeBlock") {
    block.props = {
      language: "text",
      ...prevProps,
    };
  } else if (type === "divider") {
    block.props = prevProps;
  }

  delete block.id;

  block.children = (block.children as unknown[])
    .map((ch) => normalizeImportedBlockNode(ch))
    .filter((x): x is PartialBlock => x !== null);

  return block as PartialBlock;
}

export function blockNoteLikeJsonToMarkdown(parsed: unknown[]): string {
  const lines: string[] = [];
  for (const block of parsed) {
    lines.push(...blockNoteLikeBlockToMarkdownLines(block, ""));
  }
  return lines.join("\n").trimEnd();
}

export function blocksFromStoredDescription(raw: unknown): PartialBlock[] {
  const str = coerceTaskDescriptionString(raw);
  if (!str || str.trim() === "") {
    return emptyTaskDescriptionBlocks;
  }

  const parsed = parseTaskDescriptionJson(str);
  const rootBlocks =
    parsed !== null ? blockNoteDocumentRootToBlocks(parsed) : null;
  if (rootBlocks !== null) {
    if (rootBlocks.length === 0) {
      return emptyTaskDescriptionBlocks;
    }
    try {
      return rootBlocks
        .map((raw) => normalizeImportedBlockNode(raw))
        .filter((x): x is PartialBlock => x !== null);
    } catch {}
  }

  return [
    {
      type: "paragraph",
      content: [{ type: "text", text: str, styles: {} }],
    },
  ];
}

export function applyTaskDescriptionToEditor(
  editor: BlockNoteEditor,
  raw: unknown,
): void {
  const str = coerceTaskDescriptionString(raw);
  const blocks = blocksFromStoredDescription(str);

  try {
    editor.replaceBlocks(editor.document, blocks);
    return;
  } catch {}

  const parsed =
    str !== null && str.trim() !== "" ? parseTaskDescriptionJson(str) : null;
  const recoveryBlocks =
    parsed !== null ? blockNoteDocumentRootToBlocks(parsed) : null;
  if (recoveryBlocks !== null && recoveryBlocks.length > 0) {
    const normalizedRecovery = recoveryBlocks
      .map((raw) => normalizeImportedBlockNode(raw))
      .filter((x): x is PartialBlock => x !== null);
    const md = blockNoteLikeJsonToMarkdown(normalizedRecovery);
    if (md.trim() !== "") {
      try {
        const fromMd = editor.tryParseMarkdownToBlocks(md);
        editor.replaceBlocks(editor.document, fromMd);
        return;
      } catch {}
    }
  }

  editor.replaceBlocks(editor.document, emptyTaskDescriptionBlocks);
}
