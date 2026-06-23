import { resolveDate } from "./resolveDate";

export interface RawExtraction {
  action: "buy" | "sell" | "unknown";
  item: string;
  quantity: number;
  unit: string;
  date: string;
}

const SYSTEM_PROMPT = `Extraés datos de un movimiento de stock (compra o venta) a partir de texto en español hablado de forma natural, con relleno conversacional ("hay que", "necesito", etc).

Respondé ÚNICAMENTE con un JSON con esta forma exacta, sin texto adicional:
{"action": "buy" | "sell" | "unknown", "item": string, "quantity": number, "unit": string}

Campos:
- action: "buy" o "sell", o "unknown" si no se puede determinar.
- item: el nombre del producto, SIN la unidad de medida ni la cantidad (ej: "cemento", "vigas", "ladrillos").
- quantity: solo el número (ej: 5), nunca texto.
- unit: la unidad de medida SOLO si es una unidad real distinta del item (ej: "kg", "litros", "bolsas", "cajas"). Si el item ya es la unidad que se cuenta (ej: "5 vigas", "3 ladrillos") dejá unit como string vacío "".

Ejemplos:
"comprar 3 kilos de cemento" -> {"action": "buy", "item": "cemento", "quantity": 3, "unit": "kg"}
"necesitamos comprar cinco vigas el miércoles" -> {"action": "buy", "item": "vigas", "quantity": 5, "unit": ""}

Si no podés determinar un campo, usá "unknown" para action, string vacío para item/unit, o 0 para quantity.`;

function normalize(raw: Partial<RawExtraction>, date: string): RawExtraction {
  return {
    action: raw.action === "buy" || raw.action === "sell" ? raw.action : "unknown",
    item: typeof raw.item === "string" ? raw.item : "",
    quantity: typeof raw.quantity === "number" ? raw.quantity : 0,
    unit: typeof raw.unit === "string" ? raw.unit : "",
    date,
  };
}

export async function extractMovement(text: string): Promise<RawExtraction> {
  const response = await fetch(`${process.env.OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL ?? "qwen2.5:1.5b",
      format: "json",
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama respondió con error: ${await response.text()}`);
  }

  const { message } = await response.json();
  return normalize(JSON.parse(message.content), resolveDate(text));
}
