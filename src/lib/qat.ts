import { dayKey, newId, startOfDay } from "@/lib/storage";

/** شروة (مشتريات) */
export type Purchase = {
  id: string;
  date: string; // ISO
  kind: string; // نوع الضمار
  amount: number; // مبلغ الشراء
  bundles: number; // عدد العلاقي
  note?: string;
};

/** مصروف: شحن / ضريبة / أخرى */
export type ExpenseKind = "shipping" | "tax" | "other";

export type Expense = {
  id: string;
  date: string;
  kind: ExpenseKind;
  amount: number;
  note?: string;
};

/** بيع نقدي يدوي (لا يُخصم من الدين أو الجيب) */
export type CashSale = {
  id: string;
  date: string;
  amount: number;
  note?: string;
};

export type QatData = {
  purchases: Purchase[];
  expenses: Expense[];
  cashSales: CashSale[];
};

export const expenseLabel: Record<ExpenseKind, string> = {
  shipping: "شحن",
  tax: "ضريبة",
  other: "أخرى",
};

const KEY = "dainak-bisawtak.qat.v1";
const EMPTY: QatData = { purchases: [], expenses: [], cashSales: [] };

export function loadQat(): QatData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<QatData>;
    return {
      purchases: Array.isArray(p.purchases) ? p.purchases : [],
      expenses: Array.isArray(p.expenses) ? p.expenses : [],
      cashSales: Array.isArray(p.cashSales) ? p.cashSales : [],
    };
  } catch {
    return EMPTY;
  }
}

export function saveQat(d: QatData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(d));
}

export function newQatId() {
  return newId();
}

export function isSameDay(iso: string, key = dayKey(startOfDay().toISOString())) {
  return dayKey(iso) === key;
}

export function ofDay<T extends { date: string }>(rows: T[], key: string) {
  return rows.filter((r) => dayKey(r.date) === key);
}

export type PurchaseCost = {
  purchase: Purchase;
  /** نصيبها من المصاريف حسب نسبة قيمتها */
  expenseShare: number;
  /** التكلفة الكلية = الشراء + نصيب المصاريف */
  totalCost: number;
  /** سعر العلاقة قبل المصاريف */
  basePerBundle: number;
  /** السعر الحقيقي للعلاقة بعد المصاريف */
  realPerBundle: number;
};

/** توزيع المصاريف على الشروات حسب نسبة قيمة كل نوع */
export function distributeExpenses(
  purchases: Purchase[],
  expensesTotal: number,
): PurchaseCost[] {
  const base = purchases.reduce((s, p) => s + p.amount, 0);
  return purchases.map((p) => {
    const share = base > 0 ? (p.amount / base) * expensesTotal : 0;
    const totalCost = p.amount + share;
    return {
      purchase: p,
      expenseShare: share,
      totalCost,
      basePerBundle: p.bundles > 0 ? p.amount / p.bundles : 0,
      realPerBundle: p.bundles > 0 ? totalCost / p.bundles : 0,
    };
  });
}

export type DaySummary = {
  key: string;
  purchasesTotal: number;
  expensesTotal: number;
  capital: number;
  cashSales: number;
  debtSales: number;
  pocketSales: number;
  salesTotal: number;
  profit: number;
  costs: PurchaseCost[];
};

export function daySummary(
  data: QatData,
  key: string,
  debtSales: number,
  pocketSales: number,
): DaySummary {
  const purchases = ofDay(data.purchases, key);
  const expenses = ofDay(data.expenses, key);
  const cash = ofDay(data.cashSales, key);
  const purchasesTotal = purchases.reduce((s, p) => s + p.amount, 0);
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const cashSales = cash.reduce((s, c) => s + c.amount, 0);
  const salesTotal = cashSales + debtSales + pocketSales;
  const capital = purchasesTotal + expensesTotal;
  return {
    key,
    purchasesTotal,
    expensesTotal,
    capital,
    cashSales,
    debtSales,
    pocketSales,
    salesTotal,
    profit: salesTotal - capital,
    costs: distributeExpenses(purchases, expensesTotal),
  };
}
