import { ParsedCommand } from "@/types/movement";

export type Status = "idle" | "interpreting" | "awaiting_confirmation" | "saving";

export interface ChatMessage {
  id: number;
  from: "bot" | "user";
  text: string;
}

export interface SessionState {
  sessionId: string;
  status: Status;
  pendingCommand: ParsedCommand | null;
  rawText: string | null;
  messages: ChatMessage[];
}
