import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resuelve el profiles.id del usuario autenticado actual (vía cookie de
 * sesión), no su auth.users.id directamente — sessionId en todo el motor de
 * conversación es siempre profiles.id, nunca auth.users.id.
 */
export async function getOwnProfileId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  return profile?.id ?? null;
}
