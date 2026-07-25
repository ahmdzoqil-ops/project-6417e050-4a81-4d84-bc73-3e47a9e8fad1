export type TxType = "debt" | "pocket";

export type Transaction = {
  id: string;
  type: TxType;
  name: string;
  amount: number;
  date: string; // ISO
};

const KEY = "dainak-bisawtak.transactions.v1";

export function loadAll(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Transaction[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveAll(list: Transaction[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

// Purge transactions older than 7 days from "past transactions" view — but we
// keep totals-affecting records? Spec says past transactions section shows last
// 7 days with auto-delete of older. Interpreting strictly: auto-delete older
// than 7 days entirely so totals also reflect only recent activity per user.
export function pruneOld(list: Transaction[]): Transaction[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return list.filter((t) => new Date(t.date).getTime() >= cutoff);
}

export function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
