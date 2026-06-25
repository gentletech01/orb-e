import { createClient } from "@supabase/supabase-js";

/**
 * Bypassa RLS con la service-role key. Solo para código de backend confiable
 * que actúa en nombre de un usuario ya resuelto fuera de su propia sesión de
 * navegador (el motor de conversación, el webhook de WhatsApp). Nunca
 * importar esto desde algo alcanzable por un Client Component.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
