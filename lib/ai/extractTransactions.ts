import { Category, CATEGORIES } from "@/types/transaction";

export interface RawTransaction {
  type: string;
  amountText: string;
  category: string;
  concept: string;
  dateText: string;
}

const SYSTEM_PROMPT = `Extraés movimientos de dinero (gastos o ingresos) a partir de texto en español hablado de forma natural. Un mensaje puede mencionar VARIOS movimientos a la vez — tenés que detectarlos todos.

Respondé ÚNICAMENTE con un JSON con esta forma exacta, sin texto adicional:
{"transactions": [{"type": "income" | "expense", "amountText": string, "category": string, "concept": string, "dateText": string}]}

Campos de cada transacción:
- type: "expense" si la persona gastó/pagó/compró algo. "income" si recibió/cobró/le llegó dinero.
- amountText: el monto TAL COMO SE DICE, sin convertirlo vos. Si está en palabras convertilo a dígitos + "mil"/"millones" (ej: "doscientos mil" -> "200 mil"), pero NUNCA hagas la cuenta final (no escribas "200000" a partir de "200 mil", escribí "200 mil" tal cual). Si ya viene en dígitos dejalo en dígitos (ej: "500000" -> "500000").
- category: una de estas EXACTO: ${CATEGORIES.join(", ")}. Si no es ninguna claramente, usá "Otros".
- concept: descripción corta de en qué fue (ej: "aire acondicionado", "térmicas"). String vacío si no se menciona.
- dateText: la frase de fecha TAL COMO SE DICE (ej: "ayer", "hoy", "el martes"). String vacío si esa transacción no menciona ninguna fecha Y no hay manera de inferirla de otra transacción en el mismo mensaje. IMPORTANTE: si una transacción no repite la fecha pero claramente continúa la misma fecha que la transacción anterior (ej: "ayer pagué X... y también Y"), repetí la MISMA dateText en esa transacción también — no la dejes vacía.

Ejemplos:
"ayer gasté 500 mil pesos en termicas" -> {"transactions": [{"type": "expense", "amountText": "500 mil", "category": "Materiales", "concept": "termicas", "dateText": "ayer"}]}

"ayer pagué 200 mil en el aire acondicionado y hoy me llegaron 300 mil" -> {"transactions": [{"type": "expense", "amountText": "200 mil", "category": "Servicios", "concept": "aire acondicionado", "dateText": "ayer"}, {"type": "income", "amountText": "300 mil", "category": "Otros", "concept": "", "dateText": "hoy"}]}

"ayer pagué 200 mil de aire acondicionado y también 50 mil de flete" -> {"transactions": [{"type": "expense", "amountText": "200 mil", "category": "Servicios", "concept": "aire acondicionado", "dateText": "ayer"}, {"type": "expense", "amountText": "50 mil", "category": "Otros", "concept": "flete", "dateText": "ayer"}]}

Si el mensaje no menciona ningún gasto o ingreso, respondé {"transactions": []}.`;

export async function extractTransactions(text: string): Promise<RawTransaction[]> {
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
  const parsed = JSON.parse(message.content);
  return Array.isArray(parsed.transactions) ? parsed.transactions : [];
}

export function normalizeCategory(category: string): Category {
  return (CATEGORIES as string[]).includes(category) ? (category as Category) : "Otros";
}
