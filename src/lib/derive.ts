import {
  customerBalance,
  isToday,
  newId,
  type Customer,
  type Transaction,
} from "@/lib/storage";

/* ---------------- تطبيع الأسماء والبحث الذكي ---------------- */

export function normalizeName(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

/** بحث ذكي: يتجاهل التشكيل واختلاف الألف/الياء ويقبل الكلمات الجزئية بأي ترتيب */
export function matchesQuery(text: string, query: string) {
  const q = normalizeName(query);
  if (!q) return true;
  const t = normalizeName(text);
  return q.split(" ").every((w) => t.includes(w));
}

/* ---------------- اشتقاقات موحّدة ---------------- */

/** كل ديون اليوم (سواء كانت مرتبطة بعميل أو لا) */
export function dailyDebts(items: Transaction[]) {
  return items.filter((t) => t.type === "debt" && isToday(t.date));
}

/** إجمالي دين اليوم بعد استبعاد ما تم تسليمه */
export function dailyDebtTotal(items: Transaction[]) {
  return dailyDebts(items)
    .filter((t) => !t.delivered)
    .reduce((s, t) => s + t.amount, 0);
}

export type DebtGroup = {
  key: string;
  name: string;
  list: Transaction[];
  total: number;
  openTotal: number;
  delivered: boolean;
  lastDate: string;
};

/** تجميع ديون اليوم لكل عميل في بطاقة واحدة */
export function groupDailyDebts(items: Transaction[]): DebtGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of dailyDebts(items)) {
    const key = t.customerId ?? "n:" + normalizeName(t.name);
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, z) => z.date.localeCompare(a.date));
      return {
        key,
        name: sorted[0].name,
        list: sorted,
        total: sorted.reduce((s, t) => s + t.amount, 0),
        openTotal: sorted
          .filter((t) => !t.delivered)
          .reduce((s, t) => s + t.amount, 0),
        delivered: sorted.every((t) => t.delivered),
        lastDate: sorted[0].date,
      };
    })
    .sort((a, z) => {
      const d = Number(a.delivered) - Number(z.delivered);
      return d !== 0 ? d : z.lastDate.localeCompare(a.lastDate);
    });
}


export function pocketTotal(items: Transaction[]) {
  return items
    .filter((t) => t.type === "pocket" && isToday(t.date))
    .reduce((s, t) => s + t.amount, 0);
}

export function paymentTotalToday(items: Transaction[]) {
  return items
    .filter((t) => t.type === "payment" && isToday(t.date))
    .reduce((s, t) => s + t.amount, 0);
}

export type DebtorRow = {
  customer: Customer;
  balance: number;
  lastDate: string;
  openCount: number;
};

/** العملاء الذين عليهم حقوق متبقية فقط */
export function debtors(items: Transaction[], customers: Customer[]): DebtorRow[] {
  return customers
    .map((c) => {
      const rows = items.filter((t) => t.customerId === c.id);
      return {
        customer: c,
        balance: customerBalance(items, c.id),
        lastDate: rows.reduce((m, t) => (t.date > m ? t.date : m), ""),
        openCount: rows.filter((t) => t.type === "debt").length,
      };
    })
    .filter((r) => r.balance > 0.009)
    .sort((a, z) => z.balance - a.balance);
}

export function totalOutstanding(items: Transaction[], customers: Customer[]) {
  return debtors(items, customers).reduce((s, r) => s + r.balance, 0);
}

/* ---------------- إنشاء العملاء تلقائيًا ---------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * يُنشأ حساب عميل تلقائيًا فقط عند وجود عمليتَي دين لنفس الاسم
 * والفارق الزمني بين أقدم وأحدث عملية 24 ساعة على الأقل.
 * وتُربط جميع عملياته السابقة (دين/سداد) بنفس الحساب.
 */
export function syncAutoCustomers(
  items: Transaction[],
  customers: Customer[],
): { items: Transaction[]; customers: Customer[]; changed: boolean } {
  const byKey = new Map<string, Transaction[]>();
  for (const t of items) {
    if (t.customerId || t.type !== "debt" || t.delivered) continue;
    const key = normalizeName(t.name);
    if (!key) continue;
    const arr = byKey.get(key) ?? [];
    arr.push(t);
    byKey.set(key, arr);
  }

  let changed = false;
  const nextCustomers = [...customers];
  const nextItems = [...items];

  for (const [key, group] of byKey) {
    const existing = nextCustomers.find((c) => normalizeName(c.name) === key);
    if (!existing) {
      if (group.length < 2) continue;
      const times = group.map((t) => new Date(t.date).getTime());
      const span = Math.max(...times) - Math.min(...times);
      if (span < DAY_MS) continue;
    }


    let customer = existing;
    if (!customer) {
      customer = {
        id: newId(),
        name: group[0].name.trim(),
        createdAt: new Date().toISOString(),
      };
      nextCustomers.push(customer);
      changed = true;
    }

    for (let i = 0; i < nextItems.length; i++) {
      const t = nextItems[i];
      if (t.customerId || t.cash) continue;
      if (t.type !== "debt" && t.type !== "payment") continue;
      if (t.delivered) continue;
      if (normalizeName(t.name) !== key) continue;
      nextItems[i] = { ...t, customerId: customer.id };
      changed = true;
    }
  }

  return { items: nextItems, customers: nextCustomers, changed };
}
