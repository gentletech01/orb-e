import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Devuelve true si este messageId ya fue procesado antes (Meta reintentó el
 * webhook). El unique constraint en message_id es lo que realmente evita la
 * carrera entre requests concurrentes/reintentados, no un check-then-insert.
 */
export async function isDuplicateMessage(messageId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("whatsapp_processed_messages")
    .insert({ message_id: messageId });

  if (!error) return false;

  // Postgres unique_violation
  if (error.code === "23505") return true;

  console.error("Error registrando whatsapp_processed_messages:", error.message);
  return false;
}
