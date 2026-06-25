"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStep("code");
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError || !data.user) {
      setLoading(false);
      setError(verifyError?.message ?? "Código inválido");
      return;
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from("profiles").insert({ auth_user_id: data.user.id });
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-lg font-semibold text-black">Entrar</h1>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">Te mandamos un código a tu email, sin contraseña.</p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Te mandamos un código a <strong>{email}</strong>.
            </p>
            <input
              type="text"
              placeholder="Código"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
