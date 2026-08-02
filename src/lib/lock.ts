import { Capacitor } from "@capacitor/core";

const PIN_KEY = "dainak-bisawtak.lock.pin";
const BIO_KEY = "dainak-bisawtak.lock.bio";

async function sha256(text: string) {
  const buf = new TextEncoder().encode("dbs:" + text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isLockEnabled() {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(PIN_KEY);
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
}

export async function verifyPin(pin: string) {
  const stored = window.localStorage.getItem(PIN_KEY);
  if (!stored) return true;
  return stored === (await sha256(pin));
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
