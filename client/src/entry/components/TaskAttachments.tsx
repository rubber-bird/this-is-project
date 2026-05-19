import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import {
  deleteTaskAttachment,
  listTaskAttachments,
  taskAttachmentDownloadUrl,
  uploadTaskAttachment,
  type TaskAttachment,
} from "../../api";

const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TaskAttachmentsProps = {
  projectId: string;
  taskId: string;
  disabled?: boolean;
};

export function TaskAttachments({
  projectId,
  taskId,
  disabled = false,
}: TaskAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listTaskAttachments(projectId, taskId);
      setAttachments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments");
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled || uploading) return;
      const list = Array.from(files);
      if (list.length === 0) return;

      setError("");
      setUploading(true);
      try {
        for (const file of list) {
          if (file.size > MAX_BYTES) {
            throw new Error(`"${file.name}" exceeds the 10 MB limit`);
          }
          const saved = await uploadTaskAttachment(projectId, taskId, file);
          setAttachments((prev) => [...prev, saved]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
        setDragOver(false);
      }
    },
    [disabled, uploading, projectId, taskId],
  );

  const handleDelete = async (attachmentId: string) => {
    if (disabled || deletingId) return;
    setError("");
    setDeletingId(attachmentId);
    try {
      await deleteTaskAttachment(projectId, taskId, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const busy = disabled || uploading || deletingId !== null;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Attachments
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!busy) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (busy) return;
          void uploadFiles(e.dataTransfer.files);
        }}
        sx={{
          border: "2px dashed",
          borderColor: dragOver ? "primary.main" : "divider",
          borderRadius: 1,
          bgcolor: dragOver ? "action.hover" : "background.paper",
          py: 1.25,
          px: 1.5,
          textAlign: "center",
          transition: "border-color 120ms ease, background-color 120ms ease",
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
        onClick={() => {
          if (!busy) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          disabled={busy}
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Stack spacing={0.5} alignItems="center">
          {uploading ? (
            <CircularProgress size={20} />
          ) : (
            <CloudUploadOutlinedIcon color="action" sx={{ fontSize: 24 }} />
          )}
          <Typography variant="caption" color="text.secondary">
            Drag and drop files here, or{" "}
            <Box
              component="span"
              sx={{ color: "primary.main", fontWeight: 600 }}
            >
              browse
            </Box>
            {" · "}Up to 10 MB per file
          </Typography>
          <Button
            size="small"
            variant="outlined"
            sx={{ mt: 0.25, py: 0.25, minHeight: 28 }}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Choose files
          </Button>
        </Stack>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <CircularProgress size={22} />
        </Box>
      ) : attachments.length > 0 ? (
        <List dense disablePadding>
          {attachments.map((a) => (
            <ListItem
              key={a.id}
              disableGutters
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  aria-label={`Remove ${a.original_filename}`}
                  disabled={busy}
                  onClick={() => void handleDelete(a.id)}
                >
                  {deletingId === a.id ? (
                    <CircularProgress size={18} />
                  ) : (
                    <DeleteOutlineIcon fontSize="small" />
                  )}
                </IconButton>
              }
            >
              <AttachFileIcon
                fontSize="small"
                color="action"
                sx={{ mr: 1, flexShrink: 0 }}
              />
              <ListItemText
                primary={
                  <Link
                    href={taskAttachmentDownloadUrl(
                      projectId,
                      taskId,
                      a.id,
                    )}
                    underline="hover"
                    download={a.original_filename}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.original_filename}
                  </Link>
                }
                secondary={formatBytes(a.size_bytes)}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No files attached yet.
        </Typography>
      )}
    </Stack>
  );
}
