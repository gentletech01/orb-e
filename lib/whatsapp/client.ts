const GRAPH_API_VERSION = "v21.0";

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
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
      to,
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
