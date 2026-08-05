/** مركز الإشعارات داخل التطبيق 🔔 */
import { dueReminders, type Reminder } from "@/lib/notify";
import type { Customer, Transaction } from "@/lib/storage";

const READ_KEY = "dainak-bisawtak.notify.read.v1";

export type InboxItem = Reminder & { read: boolean };

function readMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(READ_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeMap(v: Record<string, number>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READ_KEY, JSON.stringify(v));
}

/** قائمة التنبيهات الحالية مع حالة القراءة */
export function inbox(items: Transaction[], customers: Customer[]): InboxItem[] {
  const map = readMap();
  return dueReminders(items, customers).map((r) => ({
    ...r,
    read: !!map[r.id],
  }));
}

export function unreadCount(items: Transaction[], customers: Customer[]) {
  return inbox(items, customers).filter((r) => !r.read).length;
}

export function markRead(ids: number[]) {
  const map = readMap();
  const now = Date.now();
  for (const id of ids) map[id] = now;
  writeMap(map);
}

export function markAllRead(items: Transaction[], customers: Customer[]) {
  markRead(dueReminders(items, customers).map((r) => r.id));
}

export function clearRead() {
  writeMap({});
}
