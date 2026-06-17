import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcribeAudio";
import { handleConfirm, handleReject, handleTextInput } from "@/lib/conversation/engine";
import { downloadWhatsAppMedia, sendWhatsAppMessage } from "@/lib/whatsapp/client";

export function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return new NextResponse(challenge);
  }

  return NextResponse.json({ error: "verificación inválida" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const from: string = message.from;

  try {
    let text: string;
    if (message.type === "audio") {
      const { base64, mimeType } = await downloadWhatsAppMedia(message.audio.id);
      text = await transcribeAudio(base64, mimeType);
    } else if (message.type === "text") {
      text = message.text.body;
    } else {
      await sendWhatsAppMessage(from, "Por ahora solo entiendo texto o audio.");
      return NextResponse.json({ ok: true });
    }

    const normalized = text.trim().toLowerCase();
    const state =
      normalized === "si" || normalized === "sí" || normalized === "yes"
        ? await handleConfirm(from)
        : normalized === "no"
          ? await handleReject(from)
          : await handleTextInput(from, text);

    const lastMessage = state.messages[state.messages.length - 1];
    await sendWhatsAppMessage(from, lastMessage.text);
  } catch (err) {
    await sendWhatsAppMessage(from, `Hubo un error: ${(err as Error).message}`);
  }

  return NextResponse.json({ ok: true });
}
