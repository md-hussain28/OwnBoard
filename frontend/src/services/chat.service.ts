import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  type AnswerResponse,
  answerResponseSchema,
  type ChatResponse,
  chatResponseSchema,
} from "@/schemas/chat.schema";

export const chatService = {
  async sendMessage(input: { repoId: string; message: string }): Promise<ChatResponse> {
    const { data } = await getApiClient().post(API_ENDPOINTS.chat, input);
    return chatResponseSchema.parse(data);
  },

  /** Archaeology Q&A over a repo's code + git history (PRD §6.4). */
  async askQuestion(repoId: string, question: string): Promise<AnswerResponse> {
    const { data } = await getApiClient().post(API_ENDPOINTS.repoChatAsk(repoId), { question });
    return answerResponseSchema.parse(data);
  },
};
