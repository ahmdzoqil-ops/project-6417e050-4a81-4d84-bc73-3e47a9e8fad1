export type TxType = "debt" | "pocket" | "payment";

export type Transaction = {
  id: string;
  type: TxType;
  name: string;
  amount: number;
  date: string; // ISO
  note?: string;
  /** مرتبطة بعميل في سجل العملاء (للدين والسداد) */
  customerId?: string;
  /** سداد نقدي عابر لا علاقة له بالمديونيات */
  cash?: boolean;
  /** دين يومي تم تسليمه — يُخصم من إجمالي اليوم ويُحذف مع بداية اليوم التالي */
  delivered?: boolean;
  /** سداد مرتبط بعملية دين محددة */
  linkedTxId?: string;
  /** صور مرفقة (dataURL) */
  images?: string[];
};

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
};

export type Profile = {
  photo?: string; // dataURL
  userName?: string;
  shopName?: string;
  phone?: string;
  area?: string;
};

const KEY = "dainak-bisawtak.transactions.v1";
const CUSTOMERS_KEY = "dainak-bisawtak.customers.v1";
const PROFILE_KEY = "dainak-bisawtak.profile.v1";

const DAY = 24 * 60 * 60 * 1000;
const SIX_MONTHS = 182 * DAY;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/* ---------------- transactions ---------------- */

export function loadAll(): Transaction[] {
  const arr = read<Transaction[]>(KEY, []);
  if (!Array.isArray(arr)) return [];
  // توافق مع البيانات القديمة (كانت تحتوي على debt/pocket فقط)
  return arr.filter((t) => t && typeof t.amount === "number");
}

export function saveAll(list: Transaction[]) {
  write(KEY, list);
}

export function startOfDay(d: Date | string = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isToday(iso: string) {
  return new Date(iso).getTime() >= startOfDay().getTime();
}

export function dayKey(iso: string) {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * نظام بداية اليوم الجديد:
 * - الجيب: حركة يومية فقط، يُصفَّر مع بداية يوم جديد ولا يُحفظ في السجل.
 * - السداد النقدي العابر (غير المرتبط بعميل): يُحفظ 24 ساعة فقط.
 * - باقي المعاملات: تُحفظ 6 أشهر. المرتبطة بعميل لا تُحذف (كشف الحساب).
 */
export function pruneOld(list: Transaction[]): Transaction[] {
  const todayStart = startOfDay().getTime();
  const dayAgo = Date.now() - DAY;
  const sixMonthsAgo = Date.now() - SIX_MONTHS;
  return list.filter((t) => {
    const ts = new Date(t.date).getTime();
    if (t.type === "pocket") return ts >= todayStart;
    if (t.type === "payment" && t.cash && !t.customerId) return ts >= dayAgo;
    // دين يومي تم تسليمه: يبقى حتى نهاية يومه فقط
    if (t.type === "debt" && t.delivered && !t.customerId) return ts >= todayStart;
    if (t.customerId) return true;
    return ts >= sixMonthsAgo;
  });
}

/** المعاملات التي تدخل السجل التاريخي (الجيب حركة يومية فقط) */
export function historyItems(list: Transaction[]): Transaction[] {
  return list.filter((t) => t.type !== "pocket");
}

export function customerBalance(list: Transaction[], customerId: string) {
  let bal = 0;
  for (const t of list) {
    if (t.customerId !== customerId) continue;
    if (t.type === "debt") bal += t.amount;
    else if (t.type === "payment") bal -= t.amount;
  }
  return bal;
}

/* ---------------- customers ---------------- */

export function loadCustomers(): Customer[] {
  const arr = read<Customer[]>(CUSTOMERS_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveCustomers(list: Customer[]) {
  write(CUSTOMERS_KEY, list);
}

/* ---------------- profile ---------------- */

export function loadProfile(): Profile {
  return read<Profile>(PROFILE_KEY, {});
}

export function saveProfile(p: Profile) {
  write(PROFILE_KEY, p);
}

/* ---------------- backup ---------------- */

export type Backup = {
  app: "dainak-bisawtak";
  version: 1;
  createdAt: string;
  transactions: Transaction[];
  customers: Customer[];
  profile: Profile;
};

export function createBackup(): Backup {
  return {
    app: "dainak-bisawtak",
    version: 1,
    createdAt: new Date().toISOString(),
    transactions: loadAll(),
    customers: loadCustomers(),
    profile: loadProfile(),
  };
}

export function restoreBackup(data: unknown): {
  ok: boolean;
  error?: string;
} {
  try {
    const b = data as Backup;
    if (!b || b.app !== "dainak-bisawtak" || !Array.isArray(b.transactions)) {
      return { ok: false, error: "ملف النسخة الاحتياطية غير صالح" };
    }
    // دمج مع البيانات الحالية دون حذف
    const existing = loadAll();
    const byId = new Map(existing.map((t) => [t.id, t]));
    for (const t of b.transactions) if (t?.id) byId.set(t.id, t);
    saveAll([...byId.values()].sort((a, z) => z.date.localeCompare(a.date)));

    const cs = new Map(loadCustomers().map((c) => [c.id, c]));
    for (const c of b.customers ?? []) if (c?.id) cs.set(c.id, c);
    saveCustomers([...cs.values()]);

    if (b.profile) saveProfile({ ...loadProfile(), ...b.profile });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطأ غير معروف" };
  }
}

export function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
