import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Busca el profiles.id asociado a un número de WhatsApp. Si no existe
 * ninguno, crea un perfil nuevo sin auth_user_id (cuenta "huérfana" que
 * existe solo por haber escrito al bot) — no hay paso de rechazo, cualquier
 * número que escriba por primera vez queda funcionando al instante.
 */
export async function resolveOrCreateByPhone(phoneNumber: string): Promise<string> {
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("whatsapp_number", phoneNumber)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ whatsapp_number: phoneNumber })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`No pude crear el perfil para ${phoneNumber}: ${error?.message}`);
  }

  return created.id;
}
