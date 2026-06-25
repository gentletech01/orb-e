"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CATEGORIES, Category, TransactionType } from "@/types/transaction";
import { ChatBot } from "@/components/ChatBot";

interface Row {
  id: string;
  type: TransactionType;
  amount: number;
  category: Category;
  concept: string | null;
  date: string;
}

const TYPE_LABEL: Record<TransactionType, string> = { income: "Ingreso", expense: "Gasto" };

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Otros");
  const [concept, setConcept] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (!profile) {
      setLoading(false);
      return;
    }
    setProfileId(profile.id);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("id, type, amount, category, concept, date")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setRows(transactions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial, no una suscripción a un store externo
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!profileId || !amount) return;

    await supabase.from("transactions").insert({
      user_id: profileId,
      type,
      amount: Number(amount),
      category,
      concept,
      date,
    });

    setAmount("");
    setConcept("");
    await loadData();
  }

  async function handleDelete(id: string) {
    await supabase.from("transactions").delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const totalIncome = rows.filter((r) => r.type === "income").reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = rows.filter((r) => r.type === "expense").reduce((sum, r) => sum + r.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-black">Mis finanzas</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard/settings" className="text-blue-600">
            Configuración
          </Link>
          <button onClick={handleLogout} className="text-gray-500">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Ingresos</p>
                <p className="text-lg font-semibold text-green-600">{formatMoney(totalIncome)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Gastos</p>
                <p className="text-lg font-semibold text-red-600">{formatMoney(totalExpense)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Balance</p>
                <p className={`text-lg font-semibold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(balance)}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleAdd}
              className="mb-6 flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm text-black"
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
              <input
                type="number"
                placeholder="Monto"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-28 rounded-lg border border-gray-300 px-2 py-2 text-sm text-black"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm text-black"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Concepto"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm text-black"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm text-black"
              />
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                Agregar
              </button>
            </form>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Categoría</th>
                    <th className="px-4 py-2">Concepto</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 text-black">
                      <td className="px-4 py-2">{row.date}</td>
                      <td className="px-4 py-2">
                        <span className={row.type === "income" ? "text-green-600" : "text-red-600"}>
                          {TYPE_LABEL[row.type]}
                        </span>
                      </td>
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2">{row.concept}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(row.amount)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDelete(row.id)}
                          aria-label="Borrar"
                          className="text-gray-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        Todavía no hay movimientos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <div className="fixed bottom-6 right-6">
        <ChatBot />
      </div>
    </div>
  );
}
