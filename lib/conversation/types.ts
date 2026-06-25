import { ParsedTransaction } from "@/types/transaction";

export type Status = "idle" | "interpreting" | "awaiting_confirmation" | "saving";

export interface ChatMessage {
  id: number;
  from: "bot" | "user";
  text: string;
}

export interface SessionState {
  sessionId: string;
  status: Status;
  pendingTransactions: ParsedTransaction[] | null;
  rawText: string | null;
  messages: ChatMessage[];
}
