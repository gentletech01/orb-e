import { NextResponse } from "next/server";

export function GET() {
  const raw = process.env.WHATSAPP_TEST_RECIPIENT_OVERRIDES;
  let parsed: unknown = null;
  let parseError: string | null = null;

  try {
    parsed = JSON.parse(raw ?? "{}");
  } catch (err) {
    parseError = (err as Error).message;
  }

  return NextResponse.json({
    hasOverridesVar: typeof raw === "string",
    rawLength: raw?.length ?? 0,
    parseError,
    parsedKeys: parsed && typeof parsed === "object" ? Object.keys(parsed) : null,
    hasToken: !!process.env.WHATSAPP_TOKEN,
    hasPhoneNumberId: !!process.env.PHONE_NUMBER_ID,
  });
}
