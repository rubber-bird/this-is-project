import { Box } from "@mui/material";
import { MantineProvider } from "@mantine/core";
import type { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@mantine/core/styles.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

const heights = {
  page: { minHeight: 320, editorMinHeight: 280 },
  dialog: { minHeight: 280, editorMinHeight: 240 },
} as const;

type TaskDescriptionEditorProps = {
  editor: BlockNoteEditor;
  editable: boolean;
  variant?: keyof typeof heights;
};

export function TaskDescriptionEditor({
  editor,
  editable,
  variant = "page",
}: TaskDescriptionEditorProps) {
  const { minHeight, editorMinHeight } = heights[variant];

  return (
    <MantineProvider defaultColorScheme="light">
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          minHeight,
          "& .bn-editor": { minHeight: editorMinHeight },
        }}
      >
        <BlockNoteView editor={editor} editable={editable} />
      </Box>
    </MantineProvider>
  );
}
