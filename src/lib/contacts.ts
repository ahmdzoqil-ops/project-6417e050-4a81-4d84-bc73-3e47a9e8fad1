/**
 * اختيار جهة اتصال:
 * - داخل تطبيق أندرويد: إضافة Capacitor الأصلية (تطلب إذن READ_CONTACTS).
 * - في المتصفح: Contact Picker API إن توفّرت.
 */
import { Capacitor } from "@capacitor/core";

export type PickedContact = { name?: string; phone?: string };

type ContactPickerNavigator = Navigator & {
  contacts: {
    select: (
      props: string[],
      opts?: { multiple?: boolean },
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

function hasWebPicker() {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof window !== "undefined" &&
    "ContactsManager" in window
  );
}

/** هل ميزة جهات الاتصال متاحة أصلًا على هذا الجهاز؟ */
export function contactsSupported() {
  return Capacitor.isNativePlatform() || hasWebPicker();
}

function cleanPhone(v?: string) {
  if (!v) return undefined;
  const t = v.replace(/[\s\-()]/g, "").trim();
  return t || undefined;
}

async function pickNative(): Promise<PickedContact | null> {
  const { Contacts } = await import("@capacitor-community/contacts");
  const perm = await Contacts.checkPermissions();
  if (perm.contacts !== "granted") {
    const req = await Contacts.requestPermissions();
    if (req.contacts !== "granted") {
      throw new Error("permission-denied");
    }
  }
  const res = await Contacts.pickContact({
    projection: { name: true, phones: true },
  });
  const c = res?.contact;
  if (!c) return null;
  return {
    name: c.name?.display?.trim() || undefined,
    phone: cleanPhone(c.phones?.[0]?.number ?? undefined),
  };
}

async function pickWeb(): Promise<PickedContact | null> {
  const nav = navigator as ContactPickerNavigator;
  const res = await nav.contacts.select(["name", "tel"], { multiple: false });
  const c = res?.[0];
  if (!c) return null;
  return { name: c.name?.[0]?.trim(), phone: cleanPhone(c.tel?.[0]) };
}

/**
 * يعيد جهة الاتصال المختارة، أو null عند الإلغاء.
 * يرمي Error("permission-denied") عند رفض الإذن،
 * وError("unsupported") عندما لا تتوفّر الميزة.
 */
export async function pickContact(): Promise<PickedContact | null> {
  if (Capacitor.isNativePlatform()) return pickNative();
  if (hasWebPicker()) return pickWeb();
  throw new Error("unsupported");
}
