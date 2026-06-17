import { extractMovement } from "@/lib/ai/extractMovement";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Action, ParsedCommand } from "@/types/movement";
import { loadSession, saveSession } from "./sessionStore";
import { ChatMessage, SessionState } from "./types";

const ACTION_LABEL: Record<Action, string> = { buy: "Comprar", sell: "Vender" };

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describeCommand(command: ParsedCommand): string {
  const action = command.action ? ACTION_LABEL[command.action] : "(no detectada)";
  const item = command.item ? capitalize(command.item) : "(no detectado)";
  const quantity =
    command.quantity != null ? `${command.quantity}${command.unit ?? ""}` : "(no detectada)";

  return [
    "Entendí:",
    `- Acción: ${action}`,
    `- Item: ${item}`,
    `- Cantidad: ${quantity}`,
    `- Fecha: ${command.date}`,
    "",
    "¿Es correcto?",
  ].join("\n");
}

function toIsoDate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function todayFormatted(): string {
  const today = new Date();
  return `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${today.getFullYear()}`;
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
    const raw = await extractMovement(text);
    const command: ParsedCommand = {
      action: raw.action === "unknown" ? null : raw.action,
      item: raw.item.trim() ? raw.item.trim() : null,
      quantity: raw.quantity > 0 ? raw.quantity : null,
      unit: raw.unit.trim() ? raw.unit.trim() : null,
      date: raw.date || todayFormatted(),
    };
    state = { ...state, pendingCommand: command, status: "awaiting_confirmation" };
    state = appendMessage(state, "bot", describeCommand(command));
  } catch (err) {
    state = { ...state, status: "idle" };
    state = appendMessage(state, "bot", `Hubo un error interpretando: ${(err as Error).message}`);
  }

  await saveSession(state);
  return state;
}

export async function handleConfirm(sessionId: string): Promise<SessionState> {
  let state = await loadSession(sessionId);
  const command = state.pendingCommand;

  if (!command || !command.action || !command.item || !command.quantity) {
    state = { ...state, status: "idle", pendingCommand: null };
    state = appendMessage(
      state,
      "bot",
      "No pude completar todos los datos (acción, item y cantidad). Probá repetirlo más claro."
    );
    await saveSession(state);
    return state;
  }

  state = { ...state, status: "saving" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("movements").insert({
    action: command.action,
    item: command.item,
    quantity: command.quantity,
    date: toIsoDate(command.date),
    raw_text: state.rawText,
  });

  state = { ...state, status: "idle", pendingCommand: null };
  state = error
    ? appendMessage(state, "bot", `No pude guardar: ${error.message}`)
    : appendMessage(state, "bot", "Guardado ✅");

  await saveSession(state);
  return state;
}

export async function handleReject(sessionId: string): Promise<SessionState> {
  let state = await loadSession(sessionId);
  state = { ...state, status: "idle", pendingCommand: null };
  state = appendMessage(state, "bot", "Ok, descarté ese registro. Probá grabar de nuevo.");
  await saveSession(state);
  return state;
}
