import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";

const CODE_TTL_MINUTES = 10;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestWhatsAppCode(phoneNumber: string, profileId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase.from("whatsapp_verification_codes").upsert({
    phone_number: phoneNumber,
    code,
    profile_id: profileId,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`No pude generar el código: ${error.message}`);
  }

  await sendWhatsAppMessage(phoneNumber, `Tu código de verificación es: ${code}`);
}

export async function confirmWhatsAppLink(
  profileId: string,
  phoneNumber: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();

  const { data: verification } = await supabase
    .from("whatsapp_verification_codes")
    .select("code, profile_id, expires_at")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (!verification || verification.code !== code) {
    return { ok: false, error: "Código inválido." };
  }
  if (new Date(verification.expires_at) < new Date()) {
    return { ok: false, error: "El código venció, pedí uno nuevo." };
  }
  if (verification.profile_id !== profileId) {
    return { ok: false, error: "Este código fue pedido desde otra sesión." };
  }

  await supabase.from("whatsapp_verification_codes").delete().eq("phone_number", phoneNumber);

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, auth_user_id")
    .eq("whatsapp_number", phoneNumber)
    .maybeSingle();

  if (!existingProfile || existingProfile.id === profileId) {
    await supabase.from("profiles").update({ whatsapp_number: phoneNumber }).eq("id", profileId);
    return { ok: true };
  }

  if (existingProfile.auth_user_id) {
    return { ok: false, error: "Ese número ya está vinculado a otra cuenta." };
  }

  // Perfil "huérfano" creado por WhatsApp con historial propio: fusionar todo
  // hacia la cuenta autenticada que está reclamando el número.
  await supabase.from("transactions").update({ user_id: profileId }).eq("user_id", existingProfile.id);
  await supabase
    .from("conversation_sessions")
    .update({ session_id: profileId })
    .eq("session_id", existingProfile.id);
  await supabase.from("profiles").delete().eq("id", existingProfile.id);
  await supabase.from("profiles").update({ whatsapp_number: phoneNumber }).eq("id", profileId);

  return { ok: true };
}
