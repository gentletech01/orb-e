const GRAPH_API_VERSION = "v21.0";

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
}

// Meta's dev-mode test recipient list normalizes Argentine numbers to the
// domestic "15" mobile format (e.g. 54111530186064) instead of the "9"
// international format the webhook reports as `from` (e.g. 5491130186064).
// Sending to the wa_id form gets rejected as "not in allowed list" even
// though it's the same contact. This override only matters while the app is
// in development mode — once it's a verified business this restriction (and
// this mapping) goes away.
function toAllowedRecipientFormat(waId: string): string {
  const overrides = JSON.parse(process.env.WHATSAPP_TEST_RECIPIENT_OVERRIDES ?? "{}");
  return overrides[waId] ?? waId;
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const response = await fetch(graphUrl(`${process.env.PHONE_NUMBER_ID}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toAllowedRecipientFormat(to),
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`No pude mandar el mensaje de WhatsApp: ${body}`);
  }
}

export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<{ base64: string; mimeType: string }> {
  const metaResponse = await fetch(graphUrl(mediaId), {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!metaResponse.ok) {
    throw new Error("No pude obtener la URL del audio de WhatsApp");
  }
  const { url, mime_type: mimeType } = await metaResponse.json();

  const mediaResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!mediaResponse.ok) {
    throw new Error("No pude descargar el audio de WhatsApp");
  }

  const buffer = Buffer.from(await mediaResponse.arrayBuffer());
  return { base64: buffer.toString("base64"), mimeType };
}
