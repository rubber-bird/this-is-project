import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SendIcon from "@mui/icons-material/Send";

import { sendAssistantPrompt, ASSISTANT_HISTORY_CAP } from "../../api";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  text: "Hi! I am your AI Project Management Assistant! How can I help you?",
};

export function ProjectAssistantChat({
  projectId,
  onActionsApplied,
}: {
  projectId: string;
  onActionsApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text || submitting) return;

    const historyRaw = messages
      .slice(1)
      .slice(-ASSISTANT_HISTORY_CAP)
      .map((m) => ({ role: m.role, text: m.text }));

    setPrompt("");
    setError("");
    setSubmitting(true);
    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      const res = await sendAssistantPrompt(projectId, text, historyRaw);
      const outputLines = [
        res.assistant_message,
        ...res.executed_actions,
        ...res.errors,
      ];
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: outputLines.filter(Boolean).join("\n") },
      ]);
      if (res.executed_actions.length > 0) {
        onActionsApplied();
      }
      if (res.errors.length > 0) {
        setError(res.errors.join(" | "));
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to contact assistant";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I couldn't run that request. Please try again.",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: open ? 460 : 220,
        zIndex: (theme) => theme.zIndex.modal + 1,
      }}
    >
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <SmartToyIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2">Project assistant</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setOpen((v) => !v)}>
            {open ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        </Stack>

        {open ? (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            <Box
              sx={{
                maxHeight: 240,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
                bgcolor: "background.default",
              }}
            >
              <Stack spacing={1}>
                {messages.map((m, idx) => (
                  <Paper
                    key={idx}
                    variant="outlined"
                    sx={{
                      px: 1,
                      py: 0.75,
                      bgcolor:
                        m.role === "user"
                          ? "primary.light"
                          : "background.paper",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ opacity: 0.75, display: "block", mb: 0.25 }}
                    >
                      {m.role === "user" ? "You" : "Assistant"}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {m.text}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              multiline
              minRows={2}
              maxRows={5}
              size="small"
              label="Goal or batch (e.g. split feature X into tasks, 15 items priority high)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={submitting}
            />
            <Button
              variant="contained"
              endIcon={
                submitting ? <CircularProgress size={14} /> : <SendIcon />
              }
              onClick={() => void handleSend()}
              disabled={submitting || prompt.trim() === ""}
            >
              Send
            </Button>
          </Stack>
        ) : null}
      </Paper>
    </Box>
  );
}
