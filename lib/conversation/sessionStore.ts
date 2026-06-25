import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SessionState } from "./types";

const GREETING = "Hola, contame qué gasto o ingreso querés registrar.";

export async function loadSession(sessionId: string): Promise<SessionState> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!data) {
    return {
      sessionId,
      status: "idle",
      pendingTransactions: null,
      rawText: null,
      messages: [{ id: 0, from: "bot", text: GREETING }],
    };
  }

  return {
    sessionId,
    status: data.status,
    pendingTransactions: data.pending_command,
    rawText: data.raw_text,
    messages: data.messages,
  };
}

export async function saveSession(state: SessionState): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("conversation_sessions").upsert({
    session_id: state.sessionId,
    status: state.status,
    pending_command: state.pendingTransactions,
    raw_text: state.rawText,
    messages: state.messages,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error guardando conversation_sessions:", error.message);
  }
}
