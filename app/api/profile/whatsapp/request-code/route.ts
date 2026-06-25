import { NextRequest, NextResponse } from "next/server";
import { getOwnProfileId } from "@/lib/profiles/getOwnProfileId";
import { requestWhatsAppCode } from "@/lib/profiles/linkWhatsAppNumber";

export async function POST(request: NextRequest) {
  const profileId = await getOwnProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  const { phoneNumber } = await request.json();
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return NextResponse.json({ error: "phoneNumber inválido" }, { status: 400 });
  }

  try {
    await requestWhatsAppCode(phoneNumber, profileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
