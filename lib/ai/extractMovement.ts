import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export interface RawExtraction {
  action: "buy" | "sell" | "unknown";
  item: string;
  quantity: number;
  unit: string;
  date: string;
}

const JSON_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["buy", "sell", "unknown"] },
    item: { type: "string" },
    quantity: { type: "number" },
    unit: { type: "string" },
    date: {
      type: "string",
      description: "Date in dd/mm/yyyy format, resolved from any relative reference in the text",
    },
  },
  required: ["action", "item", "quantity", "unit", "date"],
  additionalProperties: false,
} as const;

const GEMINI_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    action: { type: SchemaType.STRING, format: "enum", enum: ["buy", "sell", "unknown"] },
    item: { type: SchemaType.STRING },
    quantity: { type: SchemaType.NUMBER },
    unit: { type: SchemaType.STRING },
    date: {
      type: SchemaType.STRING,
      description: "Date in dd/mm/yyyy format, resolved from any relative reference in the text",
    },
  },
  required: ["action", "item", "quantity", "unit", "date"],
};

function buildSystemPrompt(todayFormatted: string): string {
  return `Extraés datos de un movimiento de stock (compra o venta) a partir de texto en español hablado de forma natural, con relleno conversacional ("hay que", "necesito", etc). Hoy es ${todayFormatted}. Resolvé fechas relativas ("mañana", "el martes", "hoy") a una fecha concreta en formato dd/mm/yyyy usando hoy como referencia.

Campos:
- action: "buy" o "sell", o "unknown" si no se puede determinar.
- item: el nombre del producto, SIN la unidad de medida ni la cantidad (ej: "cemento", "vigas", "ladrillos").
- quantity: solo el número (ej: 5), nunca texto.
- unit: la unidad de medida SOLO si es una unidad real distinta del item (ej: "kg", "litros", "bolsas", "cajas"). Si el item ya es la unidad que se cuenta (ej: "5 vigas", "3 ladrillos") dejá unit como string vacío "".
- date: formato dd/mm/yyyy.

Ejemplos:
"comprar 3 kilos de cemento" -> action: buy, item: "cemento", quantity: 3, unit: "kg"
"necesitamos comprar cinco vigas el miércoles" -> action: buy, item: "vigas", quantity: 5, unit: ""

Si no podés determinar un campo, usá "unknown" para action, string vacío para item/unit, o 0 para quantity.`;
}

async function extractWithClaude(text: string, todayFormatted: string): Promise<RawExtraction> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    system: buildSystemPrompt(todayFormatted),
    messages: [{ role: "user", content: text }],
    output_config: {
      format: { type: "json_schema", schema: JSON_SCHEMA },
    },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude no devolvió texto interpretable");
  }

  return JSON.parse(block.text);
}

async function extractWithGemini(text: string, todayFormatted: string): Promise<RawExtraction> {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(todayFormatted),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_SCHEMA,
    },
  });

  const result = await model.generateContent(text);
  return JSON.parse(result.response.text());
}

export async function extractMovement(text: string): Promise<RawExtraction> {
  const today = new Date();
  const todayFormatted = `${today.getDate().toString().padStart(2, "0")}/${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}/${today.getFullYear()}`;

  const provider = process.env.AI_PROVIDER === "gemini" ? "gemini" : "claude";

  return provider === "gemini"
    ? extractWithGemini(text, todayFormatted)
    : extractWithClaude(text, todayFormatted);
}
