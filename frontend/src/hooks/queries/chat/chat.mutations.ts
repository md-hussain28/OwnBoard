import { useMutation } from "@tanstack/react-query";
import { chatService } from "@/services";

export function useSendChatMessage() {
  return useMutation({
    mutationFn: (input: { repoId: string; message: string }) => chatService.sendMessage(input),
  });
}

export function useAskCodebase() {
  return useMutation({
    mutationFn: (input: { repoId: string; question: string }) =>
      chatService.askQuestion(input.repoId, input.question),
  });
}
