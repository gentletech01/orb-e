export type TransactionType = "income" | "expense";

export type Category =
  | "Materiales"
  | "Servicios"
  | "Sueldos"
  | "Alquiler"
  | "Impuestos"
  | "Otros";

export const CATEGORIES: Category[] = [
  "Materiales",
  "Servicios",
  "Sueldos",
  "Alquiler",
  "Impuestos",
  "Otros",
];

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  category: Category;
  concept: string;
  date: string; // dd/mm/yyyy
}

export interface Transaction {
  type: TransactionType;
  amount: number;
  category: Category;
  concept: string;
  date: string; // yyyy-mm-dd, as stored in Postgres
  raw_text: string;
}
