import { extractTransactions, normalizeCategory } from "@/lib/ai/extractTransactions";
import { parseAmount } from "@/lib/ai/parseAmount";
import { resolveDate } from "@/lib/ai/resolveDate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ParsedTransaction, TransactionType } from "@/types/transaction";
import { loadSession, saveSession } from "./sessionStore";
import { ChatMessage, SessionState } from "./types";

const TYPE_LABEL: Record<TransactionType, string> = { income: "Ingreso", expense: "Gasto" };

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describeTransactions(transactions: ParsedTransaction[]): string {
  const lines = transactions.map((t, i) => {
    const concept = t.concept ? ` - ${capitalize(t.concept)}` : "";
    return `${i + 1}. ${TYPE_LABEL[t.type]} - $${t.amount.toLocaleString("es-AR")}${concept} (${t.category}) - ${t.date}`;
  });

  return ["Entendí:", ...lines, "", "¿Es correcto?"].join("\n");
}

function toIsoDate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function appendMessage(state: SessionState, from: ChatMessage["from"], text: string): SessionState {
  return { ...state, messages: [...state.messages, { id: state.messages.length, from, text }] };
}

export async function getSession(sessionId: string): Promise<SessionState> {
  return loadSession(sessionId);
}

export async function handleTextInput(sessionId: string, text: string): Promise<SessionState> {
  let state = await loadSession(sessionId);
  state = appendMessage(state, "user", text);
  state = { ...state, status: "interpreting", rawText: text };

  try {
    const raw = await extractTransactions(text);

    if (raw.length === 0) {
      state = { ...state, status: "idle", pendingTransactions: null };
      state = appendMessage(
        state,
        "bot",
        "No entendí ningún gasto o ingreso en tu mensaje. Probá repetirlo más claro."
      );
      await saveSession(state);
      return state;
    }

    const transactions: ParsedTransaction[] = raw.map((t) => ({
      type: t.type === "income" ? "income" : "expense",
      amount: parseAmount(t.amountText),
      category: normalizeCategory(t.category),
      concept: t.concept?.trim() ?? "",
      date: resolveDate(t.dateText ?? ""),
    }));

    state = { ...state, pendingTransactions: transactions, status: "awaiting_confirmation" };
    state = appendMessage(state, "bot", describeTransactions(transactions));
  } catch (err) {
    state = { ...state, status: "idle" };
    state = appendMessage(state, "bot", `Hubo un error interpretando: ${(err as Error).message}`);
  }

  await saveSession(state);
  return state;
}

export async function handleConfirm(sessionId: string): Promise<SessionState> {
  let state = await loadSession(sessionId);
  const transactions = state.pendingTransactions;

  if (!transactions || transactions.length === 0) {
    state = { ...state, status: "idle", pendingTransactions: null };
    state = appendMessage(state, "bot", "No tengo ningún movimiento pendiente para guardar.");
    await saveSession(state);
    return state;
  }

  state = { ...state, status: "saving" };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("transactions").insert(
    transactions.map((t) => ({
      user_id: sessionId,
      type: t.type,
      amount: t.amount,
      category: t.category,
      concept: t.concept,
      date: toIsoDate(t.date),
      raw_text: state.rawText,
    }))
  );

  state = { ...state, status: "idle", pendingTransactions: null };
  state = error
    ? appendMessage(state, "bot", `No pude guardar: ${error.message}`)
    : appendMessage(state, "bot", "Guardado ✅");

  await saveSession(state);
  return state;
}

export async function handleReject(sessionId: string): Promise<SessionState> {
  let state = await loadSession(sessionId);
  state = { ...state, status: "idle", pendingTransactions: null };
  state = appendMessage(state, "bot", "Ok, descarté esos movimientos. Probá de nuevo.");
  await saveSession(state);
  return state;
}
