import { NextRequest, NextResponse } from "next/server";
import { getSession, handleConfirm, handleReject, handleTextInput } from "@/lib/conversation/engine";
import { getOwnProfileId } from "@/lib/profiles/getOwnProfileId";

export async function GET() {
  const sessionId = await getOwnProfileId();
  if (!sessionId) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  return NextResponse.json(await getSession(sessionId));
}

export async function POST(request: NextRequest) {
  const sessionId = await getOwnProfileId();
  if (!sessionId) {
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { type } = body;

  if (type === "text") {
    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json({ error: "text inválido" }, { status: 400 });
    }
    return NextResponse.json(await handleTextInput(sessionId, body.text));
  }

  if (type === "confirm") {
    return NextResponse.json(await handleConfirm(sessionId));
  }

  if (type === "reject") {
    return NextResponse.json(await handleReject(sessionId));
  }

  return NextResponse.json({ error: "type inválido" }, { status: 400 });
}
