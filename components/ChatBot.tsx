"use client";

import { useEffect, useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { AudioWaveform } from "./AudioWaveform";
import { ChatMessage, SessionState, Status } from "@/lib/conversation/types";

async function postConversation(body: Record<string, unknown>): Promise<SessionState> {
  const response = await fetch("/api/conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("No pude comunicarme con el asistente");
  }

  return response.json();
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    fetch("/api/conversation")
      .then((response) => response.json())
      .then((state: SessionState) => {
        setMessages(state.messages);
        setStatus(state.status);
      })
      .catch(() => {});
  }, []);

  function applyState(state: SessionState) {
    setMessages(state.messages);
    setStatus(state.status);
  }

  function handleStart() {
    setListening(true);
  }

  async function sendText(text: string) {
    setSending(true);
    try {
      const state = await postConversation({ type: "text", text });
      applyState(state);
    } catch (err) {
      setStatus("idle");
      setMessages((prev) => [
        ...prev,
        { id: prev.length, from: "bot", text: `Hubo un error: ${(err as Error).message}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleResult(text: string) {
    sendText(text);
  }

  function handleSubmitText(event: React.FormEvent) {
    event.preventDefault();
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    sendText(text);
  }

  function handleError(error: string) {
    setListening(false);
    setMessages((prev) => [
      ...prev,
      { id: prev.length, from: "bot", text: `Hubo un error escuchando: ${error}` },
    ]);
  }

  function handleEnd() {
    setListening(false);
  }

  async function handleReject() {
    setSending(true);
    try {
      const state = await postConversation({ type: "reject" });
      applyState(state);
    } finally {
      setSending(false);
    }
  }

  async function handleConfirm() {
    setSending(true);
    try {
      const state = await postConversation({ type: "confirm" });
      applyState(state);
    } finally {
      setSending(false);
    }
  }

  const isBusy = sending || status === "interpreting" || status === "saving";

  return (
    <div className="flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex h-[700px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
              🤖
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-black">Asistente financiero</p>
              <p className="text-xs text-gray-500">Registrá gastos e ingresos por voz</p>
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
              {isBusy && (
                <div className="flex justify-start">
                  <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-sm text-gray-400">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-3">
            {isBusy ? (
              <div className="flex justify-center">
                <button type="button" disabled className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white opacity-50">
                  {status === "saving" ? "Guardando..." : "Pensando..."}
                </button>
              </div>
            ) : status === "awaiting_confirmation" ? (
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
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AudioWaveform active={listening} />
                <form onSubmit={handleSubmitText} className="flex w-full items-center gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(event) => setTextInput(event.target.value)}
                    placeholder="Escribí el gasto o ingreso..."
                    disabled={listening}
                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <VoiceRecorder
                    listening={listening}
                    onStart={handleStart}
                    onResult={handleResult}
                    onError={handleError}
                    onEnd={handleEnd}
                  />
                  <button
                    type="submit"
                    disabled={listening || !textInput.trim()}
                    aria-label="Enviar mensaje"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50"
                  >
                    ➤
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Cerrar asistente financiero" : "Abrir asistente financiero"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg transition-transform hover:scale-105"
      >
        {isOpen ? "✕" : "🤖"}
      </button>
    </div>
  );
}
