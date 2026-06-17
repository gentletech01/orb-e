import { NextRequest, NextResponse } from "next/server";
import { getSession, handleConfirm, handleReject, handleTextInput } from "@/lib/conversation/engine";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
  }

  return NextResponse.json(await getSession(sessionId));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, type } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
  }

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
