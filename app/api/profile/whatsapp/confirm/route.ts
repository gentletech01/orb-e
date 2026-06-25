import { NextRequest, NextResponse } from "next/server";
import { getOwnProfileId } from "@/lib/profiles/getOwnProfileId";
import { confirmWhatsAppLink } from "@/lib/profiles/linkWhatsAppNumber";

export async function POST(request: NextRequest) {
  const profileId = await getOwnProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  const { phoneNumber, code } = await request.json();
  if (!phoneNumber || !code) {
    return NextResponse.json({ error: "phoneNumber y code son requeridos" }, { status: 400 });
  }

  const result = await confirmWhatsAppLink(profileId, phoneNumber, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
