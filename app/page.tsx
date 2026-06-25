import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 font-sans">
      <h1 className="text-2xl font-semibold text-black">Tus finanzas, por chat o WhatsApp</h1>
      <p className="max-w-md text-center text-sm text-gray-600">
        Registrá gastos e ingresos hablando o escribiendo, y mirá el resumen en un dashboard.
      </p>
      <Link href="/login" className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white">
        Entrar
      </Link>
    </div>
  );
}
