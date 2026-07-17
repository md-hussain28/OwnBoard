import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { type ChatResponse, chatResponseSchema } from "@/schemas/chat.schema";

export const chatService = {
  async sendMessage(input: { repoId: string; message: string }): Promise<ChatResponse> {
    const { data } = await getApiClient().post(API_ENDPOINTS.chat, input);
    return chatResponseSchema.parse(data);
  },
};
