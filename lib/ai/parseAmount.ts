function toDecimal(token: string): number {
  return parseFloat(token.replace(",", ".")) || 0;
}

/**
 * Convierte la frase literal de un monto ("200 mil", "2 millones", "500000")
 * a un número, directamente en código en vez de confiarle la aritmética a un
 * modelo chico de Ollama — mismo motivo que resolveDate.ts: un error de fecha
 * corre un día, pero un error de monto corrompe el balance en un factor de
 * 1000 sin que se note a simple vista en una lista de pesos.
 */
export function parseAmount(amountText: string): number {
  const normalized = amountText.toLowerCase().replace(/pesos?/g, "").replace(/\$/g, "").trim();

  const millonMatch = normalized.match(/^([\d.,]+)\s*millon(?:es)?\b/);
  if (millonMatch) return toDecimal(millonMatch[1]) * 1_000_000;

  const milMatch = normalized.match(/^([\d.,]+)\s*mil\b/);
  if (milMatch) return toDecimal(milMatch[1]) * 1_000;

  const bareDigits = normalized.replace(/[^\d]/g, "");
  return bareDigits ? parseInt(bareDigits, 10) : 0;
}
