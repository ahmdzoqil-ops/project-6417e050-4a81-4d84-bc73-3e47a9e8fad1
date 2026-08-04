import { Capacitor } from "@capacitor/core";
import { customerBalance, dayKey, type Customer, type Transaction } from "@/lib/storage";
import { loadSettings } from "@/lib/settings";

const DAY = 24 * 60 * 60 * 1000;
const SENT_KEY = "dainak-bisawtak.notify.sent.v1";

export type Reminder = {
  id: number;
  title: string;
  body: string;
};

function readSent(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeSent(v: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SENT_KEY, JSON.stringify(v));
}

function hashId(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483000;
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

/** يحسب التذكيرات المستحقة الآن حسب الإعدادات العامة وإعدادات كل عميل */
export function dueReminders(
  items: Transaction[],
  customers: Customer[],
): Reminder[] {
  const s = loadSettings().notify;
  const out: Reminder[] = [];

  if (s.customersOn) {
    for (const c of customers) {
      if (c.notifyMuted) continue;
      const bal = customerBalance(items, c.id);
      if (bal <= 0.009) continue;
      const rows = items.filter((t) => t.customerId === c.id);
      const lastPay = rows
        .filter((t) => t.type === "payment")
        .reduce((m, t) => (t.date > m ? t.date : m), "");
      const lastAny = rows.reduce((m, t) => (t.date > m ? t.date : m), "");
      const ref = lastPay || lastAny || c.createdAt;
      const limit = c.notifyDays ?? s.customersDays;
      if (daysSince(ref) >= limit) {
        out.push({
          id: hashId("c:" + c.id),
          title: "تذكير مطالبة",
          body: `مضى ${daysSince(ref)} يومًا بدون سداد من «${c.name}» — الرصيد المتبقي ${bal.toLocaleString("ar-EG")}`,
        });
      }
    }
  }

  if (s.dailyOn) {
    const open = items.filter(
      (t) => t.type === "debt" && !t.delivered && !t.customerId,
    );
    for (const t of open) {
      if (daysSince(t.date) >= s.dailyDays) {
        out.push({
          id: hashId("t:" + t.id),
          title: "دين بدون سداد",
          body: `دين «${t.name}» بمبلغ ${t.amount.toLocaleString("ar-EG")} مضى عليه ${daysSince(t.date)} يومًا`,
        });
      }
    }
  }

  return out;
}

/** يرسل التذكيرات مرة واحدة يوميًا لكل عنصر */
export async function runReminders(
  items: Transaction[],
  customers: Customer[],
) {
  const due = dueReminders(items, customers);
  if (!due.length) return 0;
  const today = dayKey(new Date().toISOString());
  const sent = readSent();
  const fresh = due.filter((r) => sent[r.id] !== today);
  if (!fresh.length) return 0;

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import(
        "@capacitor/local-notifications"
      );
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== "granted") return 0;
      }
      await LocalNotifications.schedule({
        notifications: fresh.map((r, i) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          schedule: { at: new Date(Date.now() + 2000 + i * 1500) },
        })),
      });
    } catch {
      return 0;
    }
  }

  for (const r of fresh) sent[r.id] = today;
  writeSent(sent);
  return fresh.length;
}
