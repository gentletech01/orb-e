import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, item, quantity, date, raw_text } = body;

  if (!action || !["buy", "sell"].includes(action)) {
    return NextResponse.json({ error: "action inválido" }, { status: 400 });
  }
  if (!item || typeof item !== "string") {
    return NextResponse.json({ error: "item inválido" }, { status: 400 });
  }
  if (!quantity || typeof quantity !== "number") {
    return NextResponse.json({ error: "quantity inválido" }, { status: 400 });
  }
  if (!date || typeof date !== "string") {
    return NextResponse.json({ error: "date inválido" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("movements")
    .insert({ action, item, quantity, date, raw_text });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
