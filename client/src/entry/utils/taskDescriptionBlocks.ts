import type { PartialBlock } from "@blocknote/core";

/** Empty document for new tasks or reset dialogs. */
export const emptyTaskDescriptionBlocks: PartialBlock[] = [
  { type: "paragraph", content: "" },
];

export function blocksFromStoredDescription(
  raw: string | null,
): PartialBlock[] {
  if (!raw || raw.trim() === "") {
    return emptyTaskDescriptionBlocks;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as PartialBlock[];
    }
  } catch {}
  return [
    {
      type: "paragraph",
      content: [{ type: "text", text: raw, styles: {} }],
    },
  ];
}
