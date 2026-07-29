// عناوين خدمة التفريغ الصوتي عند تشغيل التطبيق كتطبيق أندرويد مستقل (ملفات محلية).
// نجرّب الرابط المنشور أولًا، ثم الرابط الثابت للمشروع (يعمل حتى قبل النشر).
const REMOTE_TRANSCRIBE_URLS = [
  "https://voice-debt-pocket.lovable.app/api/public/transcribe",
  "https://project--6417e050-4a81-4d84-bc73-3e47a9e8fad1.lovable.app/api/public/transcribe",
  "https://project--6417e050-4a81-4d84-bc73-3e47a9e8fad1-dev.lovable.app/api/public/transcribe",
];

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export async function transcribeViaRemote(audioBase64: string, mime: string) {
  const errors: string[] = [];

  for (const url of REMOTE_TRANSCRIBE_URLS) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audioBase64, mime }),
      });
    } catch (e) {
      // خطأ شبكة (لا إنترنت / DNS)
      errors.push(`${hostOf(url)}: شبكة — ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const raw = await res.text().catch(() => "");
    if (!res.ok) {
      errors.push(`${hostOf(url)}: HTTP ${res.status} — ${detail(raw)}`);
      continue;
    }

    try {
      return JSON.parse(raw) as { text?: string };
    } catch {
      errors.push(`${hostOf(url)}: رد غير صالح — ${detail(raw)}`);
    }
  }

  throw new Error(errors.join(" | "));
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function detail(raw: string): string {
  const body = raw.trim();
  if (!body) return "بدون تفاصيل";
  // صفحة HTML تعني أن نقطة النهاية غير موجودة على هذه النسخة
  if (body.startsWith("<")) return "نقطة النهاية غير منشورة على هذا الرابط";
  try {
    const j = JSON.parse(body) as { error?: unknown; message?: unknown };
    const msg = j.error ?? j.message;
    if (typeof msg === "string" && msg) return msg;
  } catch {
    /* نص عادي */
  }
  return body.slice(0, 300);
}

export { isNativeApp };
