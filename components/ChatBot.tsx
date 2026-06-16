"use client";

import { useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { AudioWaveform } from "./AudioWaveform";
import { ParsedCommand, Action } from "@/types/movement";

type Status = "idle" | "listening" | "interpreting" | "awaiting_confirmation" | "saving";

interface ChatMessage {
  id: number;
  from: "bot" | "user";
  text: string;
}

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

export function ChatBot() {
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, from: "bot", text: "Hola, presioná grabar y decime qué movimiento querés registrar." },
  ]);
  const [pendingCommand, setPendingCommand] = useState<ParsedCommand | null>(null);
  const [rawText, setRawText] = useState("");
  const [textInput, setTextInput] = useState("");

  function addMessage(from: ChatMessage["from"], text: string) {
    setMessages((prev) => [...prev, { id: prev.length, from, text }]);
  }

  function handleStart() {
    setStatus("listening");
  }

  async function interpretText(text: string) {
    setRawText(text);
    addMessage("user", text);
    setStatus("interpreting");

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("No pude interpretar el texto");
      }

      const command: ParsedCommand = await response.json();
      setPendingCommand(command);
      setStatus("awaiting_confirmation");
      addMessage("bot", describeCommand(command));
    } catch (err) {
      setStatus("idle");
      addMessage("bot", `Hubo un error interpretando: ${(err as Error).message}`);
    }
  }

  function handleResult(text: string) {
    interpretText(text);
  }

  function handleSubmitText(event: React.FormEvent) {
    event.preventDefault();
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    interpretText(text);
  }

  function handleError(error: string) {
    setStatus("idle");
    addMessage("bot", `Hubo un error escuchando: ${error}`);
  }

  function handleEnd() {
    setStatus((current) => (current === "listening" ? "idle" : current));
  }

  function handleReject() {
    setPendingCommand(null);
    setStatus("idle");
    addMessage("bot", "Ok, descarté ese registro. Probá grabar de nuevo.");
  }

  async function handleConfirm() {
    if (!pendingCommand || !pendingCommand.action || !pendingCommand.item || !pendingCommand.quantity) {
      addMessage("bot", "No pude completar todos los datos (acción, item y cantidad). Probá repetirlo más claro.");
      setStatus("idle");
      setPendingCommand(null);
      return;
    }

    setStatus("saving");
    try {
      const response = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingCommand.action,
          item: pendingCommand.item,
          quantity: pendingCommand.quantity,
          date: toIsoDate(pendingCommand.date),
          raw_text: rawText,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Error guardando el movimiento");
      }

      addMessage("bot", "Guardado ✅");
    } catch (err) {
      addMessage("bot", `No pude guardar: ${(err as Error).message}`);
    } finally {
      setPendingCommand(null);
      setStatus("idle");
    }
  }

  return (
    <div className="flex h-[700px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
          🤖
        </div>
        <div>
          <p className="text-sm font-semibold text-black">Asistente de stock</p>
          <p className="text-xs text-gray-500">Registrá movimientos por voz</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.from === "bot" ? "justify-start" : "justify-end"}`}
            >
              <span
                className={
                  message.from === "bot"
                    ? "max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-sm text-black"
                    : "max-w-[80%] whitespace-pre-line rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2 text-sm text-white"
                }
              >
                {message.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-3">
        {status === "awaiting_confirmation" ? (
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-green-600 px-4 py-2 text-sm text-white"
            >
              Sí, guardar
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="rounded-full bg-red-600 px-4 py-2 text-sm text-white"
            >
              No, descartar
            </button>
          </div>
        ) : status === "saving" ? (
          <div className="flex justify-center">
            <button type="button" disabled className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white opacity-50">
              Guardando...
            </button>
          </div>
        ) : status === "interpreting" ? (
          <div className="flex justify-center">
            <button type="button" disabled className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white opacity-50">
              Interpretando...
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <AudioWaveform active={status === "listening"} />
            <form onSubmit={handleSubmitText} className="flex w-full items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                placeholder="Escribí el movimiento..."
                disabled={status === "listening"}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <VoiceRecorder
                listening={status === "listening"}
                onStart={handleStart}
                onResult={handleResult}
                onError={handleError}
                onEnd={handleEnd}
              />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
