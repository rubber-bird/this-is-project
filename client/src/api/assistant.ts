import type { AssistantChatResponse, AssistantHistoryMessage } from "./types";
import { apiRequest } from "./http";

export const ASSISTANT_HISTORY_CAP = 20;

export function sendAssistantPrompt(
  projectId: string,
  prompt: string,
  history: AssistantHistoryMessage[] = [],
): Promise<AssistantChatResponse> {
  return apiRequest<AssistantChatResponse>(
    `/projects/${encodeURIComponent(projectId)}/assistant/chat`,
    {
      method: "POST",
      body: JSON.stringify({
        prompt,
        history: history.slice(-ASSISTANT_HISTORY_CAP),
      }),
    },
  );
}
