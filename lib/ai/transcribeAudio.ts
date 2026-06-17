import { GoogleGenerativeAI } from "@google/generative-ai";

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    {
      text:
        "Transcribí este audio a texto en español tal cual se dice, sin agregar ni traducir nada. Devolvé solo la transcripción, sin comillas ni texto adicional.",
    },
    { inlineData: { data: base64Audio, mimeType } },
  ]);

  return result.response.text().trim();
}
