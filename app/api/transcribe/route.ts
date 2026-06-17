import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcribeAudio";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "audio inválido" }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const base64Audio = buffer.toString("base64");
  const mimeType = audio.type || "audio/webm";

  try {
    const text = await transcribeAudio(base64Audio, mimeType);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "No pude transcribir el audio" }, { status: 502 });
  }
}
