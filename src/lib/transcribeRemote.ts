// عنوان خدمة التفريغ الصوتي عند تشغيل التطبيق كتطبيق أندرويد مستقل (ملفات محلية).
const REMOTE_TRANSCRIBE_URL =
  "https://voice-debt-pocket.lovable.app/api/public/transcribe";

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export async function transcribeViaRemote(audioBase64: string, mime: string) {
  const res = await fetch(REMOTE_TRANSCRIBE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audioBase64, mime }),
  });
  if (!res.ok) throw new Error(`transcription_failed:${res.status}`);
  return (await res.json()) as { text?: string };
}

export { isNativeApp };
