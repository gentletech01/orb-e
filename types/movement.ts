export type Action = "buy" | "sell";

export interface ParsedCommand {
  action: Action | null;
  item: string | null;
  quantity: number | null;
  unit: string | null;
  date: string; // dd/mm/yyyy
}

export interface Movement {
  action: Action;
  item: string;
  quantity: number;
  date: string; // yyyy-mm-dd, as stored in Postgres
  raw_text: string;
}
