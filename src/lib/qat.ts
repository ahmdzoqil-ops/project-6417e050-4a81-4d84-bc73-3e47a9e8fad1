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

/** الاحتفاظ ببيانات الضمار والمصاريف لمدة 7 أيام عمل */
export const KEEP_DAYS = 7;

export function pruneQat(d: QatData): QatData {
  const limit =
    startOfDay().getTime() - (KEEP_DAYS - 1) * 24 * 60 * 60 * 1000;
  const keep = <T extends { date: string }>(rows: T[]) =>
    rows.filter((r) => startOfDay(r.date).getTime() >= limit);
  return {
    purchases: keep(d.purchases),
    expenses: keep(d.expenses),
    cashSales: keep(d.cashSales),
  };
}

/** تحميل مع تنظيف تلقائي */
export function loadQatPruned(): QatData {
  const pruned = pruneQat(loadQat());
  saveQat(pruned);
  return pruned;
}

/** مفاتيح آخر 7 أيام عمل (اليوم أولًا) */
export function recentDayKeys(n = KEEP_DAYS): string[] {
  const base = startOfDay().getTime();
  return Array.from({ length: n }, (_, i) =>
    dayKey(new Date(base - i * 24 * 60 * 60 * 1000).toISOString()),
  );
}

/** تسمية عربية مختصرة ليوم الأرشيف */
export function dayLabel(key: string, todayKey = recentDayKeys(1)[0]) {
  if (key === todayKey) return "اليوم";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const names = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];
  return `${names[date.getDay()]} ${d}/${m}`;
}

/* ---------------- رسائل تحفيزية ---------------- */

export type Mood = {
  tone: "great" | "good" | "flat" | "loss";
  title: string;
  text: string;
};

/** رسالة تحفيزية حسب نسبة الربح إلى رأس المال */
export function profitMood(profit: number, capital: number): Mood {
  if (capital <= 0 && profit === 0) {
    return {
      tone: "flat",
      title: "لا توجد بيانات بعد",
      text: "أضف الشروة والمصاريف لتظهر لك النتيجة اليومية.",
    };
  }
  const ratio = capital > 0 ? profit / capital : profit > 0 ? 1 : -1;
  if (ratio >= 0.25)
    return {
      tone: "great",
      title: "يوم ممتاز! 🎉",
      text: "ربح قوي اليوم — استمر على نفس الأسلوب.",
    };
  if (ratio > 0)
    return {
      tone: "good",
      title: "ربح جيد 👍",
      text: "النتيجة إيجابية، راجع المصاريف لزيادة الربح.",
    };
  if (ratio === 0)
    return {
      tone: "flat",
      title: "تعادل",
      text: "لا ربح ولا خسارة — حاول تقليل المصاريف غدًا.",
    };
  return {
    tone: "loss",
    title: "خسارة اليوم",
    text: "راجع سعر الشروة والمصاريف، وركّز على تحصيل الديون.",
  };
}
