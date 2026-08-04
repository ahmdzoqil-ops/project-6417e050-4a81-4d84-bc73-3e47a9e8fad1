/** إعدادات التطبيق: الإشعارات والحماية */

export type NotifySettings = {
  customersOn: boolean;
  dailyOn: boolean;
  /** عدد الأيام بدون سداد قبل بدء تنبيه المديونية */
  customersDays: number;
  /** عدد الأيام قبل تنبيه الدين اليومي غير المسدد */
  dailyDays: number;
};

export type SecuritySettings = {
  /** حماية فتح التطبيق */
  appLock: boolean;
  /** حماية العمليات الحساسة (حذف/تصفير) */
  actionLock: boolean;
};

export type AppSettings = {
  notify: NotifySettings;
  security: SecuritySettings;
};

const KEY = "dainak-bisawtak.settings.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  notify: { customersOn: true, dailyOn: true, customersDays: 7, dailyDays: 3 },
  security: { appLock: true, actionLock: true },
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw) as Partial<AppSettings>;
    return {
      notify: { ...DEFAULT_SETTINGS.notify, ...(p.notify ?? {}) },
      security: { ...DEFAULT_SETTINGS.security, ...(p.security ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export const DAY_PRESETS = [1, 3, 7, 14, 30];

export const APP_VERSION = "3.0";
export const APP_NAME = "دينك بصوتك";
export const APP_TAGLINE = "إدارة الديون والجيب محليًا على جهازك";
export const DEVELOPER = "تطوير: فريق دينك بصوتك";
