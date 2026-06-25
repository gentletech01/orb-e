"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Step = "idle" | "code_sent";

export default function SettingsPage() {
  const supabase = createSupabaseBrowserClient();

  const [currentNumber, setCurrentNumber] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("whatsapp_number")
        .eq("auth_user_id", userData.user.id)
        .maybeSingle();

      setCurrentNumber(data?.whatsapp_number ?? null);
    }
    loadProfile();
  }, [supabase]);

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch("/api/profile/whatsapp/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    const body = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "No pude mandar el código");
      return;
    }

    setStep("code_sent");
    setMessage("Te mandamos un código por WhatsApp a ese número.");
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch("/api/profile/whatsapp/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, code }),
    });
    const body = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "No pude confirmar el código");
      return;
    }

    setCurrentNumber(phoneNumber);
    setStep("idle");
    setPhoneNumber("");
    setCode("");
    setMessage("Número vinculado correctamente.");
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-lg font-semibold text-black">Configuración</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-gray-600">
          Número de WhatsApp vinculado:{" "}
          <strong>{currentNumber ?? "ninguno"}</strong>
        </p>

        {step === "idle" ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-3">
            <input
              type="tel"
              placeholder="Ej: 5491130186064"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">Código enviado a {phoneNumber}</p>
            <input
              type="text"
              placeholder="Código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Confirmando..." : "Confirmar"}
            </button>
          </form>
        )}

        {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
