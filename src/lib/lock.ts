import { Capacitor } from "@capacitor/core";
import { loadSettings } from "@/lib/settings";

const PIN_KEY = "dainak-bisawtak.lock.pin";
const BIO_KEY = "dainak-bisawtak.lock.bio";
const SEEN_KEY = "dainak-bisawtak.lock.lastActive";

async function sha256(text: string) {
  const buf = new TextEncoder().encode("dbs:" + text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** هل يوجد رمز محفوظ؟ */
export function hasPin() {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(PIN_KEY);
}

/** القفل مفعّل فعليًا = يوجد رمز + مفعّل من الإعدادات */
export function isLockEnabled() {
  return hasPin() && loadSettings().security.appLock;
}

export function isBiometricEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(BIO_KEY) === "1";
}

export function setBiometricEnabled(on: boolean) {
  window.localStorage.setItem(BIO_KEY, on ? "1" : "0");
}

export async function setPin(pin: string) {
  window.localStorage.setItem(PIN_KEY, await sha256(pin));
}

export function clearLock() {
  window.localStorage.removeItem(PIN_KEY);
  window.localStorage.removeItem(BIO_KEY);
  window.localStorage.removeItem(SEEN_KEY);
}

export async function verifyPin(pin: string) {
  const stored = window.localStorage.getItem(PIN_KEY);
  if (!stored) return true;
  return stored === (await sha256(pin));
}

/* ---------------- مهلة القفل ---------------- */

/** تسجيل آخر نشاط (يُستدعى عند فتح القفل وعند مغادرة التطبيق) */
export function markActive() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_KEY, String(Date.now()));
}

/**
 * هل يجب إظهار شاشة القفل الآن؟
 * يحترم مهلة القفل المختارة في الإعدادات.
 */
export function shouldLockNow() {
  if (!isLockEnabled()) return false;
  const delay = loadSettings().security.lockDelayMinutes;
  if (delay <= 0) return true;
  const last = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
  if (!last) return true;
  return Date.now() - last >= delay * 60_000;
}

/** بصمة الإصبع — متاحة داخل تطبيق أندرويد فقط */
export async function biometricAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric");
    const res = await NativeBiometric.isAvailable();
    return !!res.isAvailable;
  } catch {
    return false;
  }
}

export async function biometricVerify(reason = "تأكيد الهوية") {
  if (!(await biometricAvailable())) return false;
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({
      reason,
      title: "دينك بصوتك",
      subtitle: reason,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * تأكيد عملية حساسة (حذف/تصفير).
 * يعيد true إذا كانت الحماية معطّلة أو نجح التحقق.
 */
export async function confirmSensitive(reason = "تأكيد عملية حساسة") {
  const s = loadSettings().security;
  if (!s.actionLock || !hasPin()) return true;
  if (await biometricVerify(reason)) return true;
  const entered = window.prompt(reason + "\nأدخل الرمز السري:");
  if (entered == null) return false;
  return verifyPin(entered);
}
