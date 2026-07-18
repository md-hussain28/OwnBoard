import { cn } from "@/lib";
import type { ChatMessage as ChatMessageType } from "@/schemas";
import { Badge } from "@/ui";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-lg rounded-lg px-4 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.content}
      </div>
      {message.sourceCitation && (
        <Badge variant="secondary">
          {message.sourceCitation.commitSha
            ? `Commit ${message.sourceCitation.commitSha.slice(0, 7)}`
            : (message.sourceCitation.filePath ?? "Cited")}
        </Badge>
      )}
      {message.confidence === "low" && <Badge variant="destructive">Low confidence</Badge>}
    </div>
  );
}
