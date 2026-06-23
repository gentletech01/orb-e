const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function formatDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Resuelve referencias de fecha relativa ("hoy", "ayer", "el martes", etc.)
 * directamente en código en vez de confiarle el cálculo a un modelo chico de
 * Ollama, que falla seguido con aritmética de fechas. Si no encuentra ninguna
 * referencia conocida, devuelve la fecha de hoy.
 */
export function resolveDate(text: string, today: Date = new Date()): string {
  const normalized = stripAccents(text.toLowerCase());

  if (/\bpasado\s+manana\b/.test(normalized)) return formatDate(addDays(today, 2));
  if (/\bmanana\b/.test(normalized)) return formatDate(addDays(today, 1));
  if (/\bante(s\s+de)?\s*ayer\b/.test(normalized)) return formatDate(addDays(today, -2));
  if (/\bayer\b/.test(normalized)) return formatDate(addDays(today, -1));
  if (/\bhoy\b/.test(normalized)) return formatDate(today);

  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(normalized)) {
      const diff = (today.getDay() - i + 7) % 7;
      return formatDate(addDays(today, -diff));
    }
  }

  return formatDate(today);
}
