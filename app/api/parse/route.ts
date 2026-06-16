import { NextRequest, NextResponse } from "next/server";
import { extractMovement } from "@/lib/ai/extractMovement";
import { ParsedCommand } from "@/types/movement";

export async function POST(request: NextRequest) {
  const { text } = await request.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text inválido" }, { status: 400 });
  }

  const today = new Date();
  const todayFormatted = `${today.getDate().toString().padStart(2, "0")}/${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}/${today.getFullYear()}`;

  const raw = await extractMovement(text);

  const parsed: ParsedCommand = {
    action: raw.action === "unknown" ? null : raw.action,
    item: raw.item.trim() ? raw.item.trim() : null,
    quantity: raw.quantity > 0 ? raw.quantity : null,
    unit: raw.unit.trim() ? raw.unit.trim() : null,
    date: raw.date || todayFormatted,
  };

  return NextResponse.json(parsed);
}
