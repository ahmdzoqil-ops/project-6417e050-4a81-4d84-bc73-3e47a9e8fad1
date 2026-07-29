// محرك التعرف على الكلام المحلي في أندرويد (SpeechRecognizer) عبر Capacitor.
// لا يحتاج إنترنت إذا كانت حزمة اللغة العربية مثبتة على الجهاز (تنزيل دون اتصال في إعدادات Google).

type SR = typeof import("@capacitor-community/speech-recognition").SpeechRecognition;

let cached: SR | null = null;

async function getSR(): Promise<SR> {
  if (cached) return cached;
  const mod = await import("@capacitor-community/speech-recognition");
  cached = mod.SpeechRecognition;
  return cached;
}

export async function isNativeSpeechAvailable(): Promise<boolean> {
  try {
    const SpeechRecognition = await getSR();
    const { available } = await SpeechRecognition.available();
    return Boolean(available);
  } catch {
    return false;
  }
}

export async function ensureSpeechPermission(): Promise<boolean> {
  const SpeechRecognition = await getSR();
  try {
    const cur = await SpeechRecognition.checkPermissions();
    if (cur.speechRecognition === "granted") return true;
  } catch {
    /* بعض الإصدارات لا تدعم الفحص */
  }
  const req = await SpeechRecognition.requestPermissions();
  return req.speechRecognition === "granted";
}

/** يبدأ الاستماع ويجمع النتائج الجزئية. يعيد دالة إيقاف تُرجع النص النهائي. */
export async function startNativeListening(
  onPartial?: (text: string) => void,
): Promise<() => Promise<string>> {
  const SpeechRecognition = await getSR();
  let latest = "";

  await SpeechRecognition.removeAllListeners();
  await SpeechRecognition.addListener("partialResults", (data: { matches?: string[] }) => {
    const t = data?.matches?.[0];
    if (typeof t === "string" && t.trim()) {
      latest = t.trim();
      onPartial?.(latest);
    }
  });

  const finalFromStart = SpeechRecognition.start({
    language: "ar-SA",
    maxResults: 1,
    partialResults: true,
    popup: false,
  })
    .then((res: { matches?: string[] } | undefined) => {
      const t = res?.matches?.[0];
      if (typeof t === "string" && t.trim()) latest = t.trim();
    })
    .catch(() => {
      /* الإيقاف اليدوي قد يرفض الوعد */
    });

  return async () => {
    try {
      await SpeechRecognition.stop();
    } catch {
      /* تم الإيقاف مسبقًا */
    }
    // مهلة قصيرة لالتقاط آخر نتيجة من المحرك
    await Promise.race([finalFromStart, new Promise((r) => setTimeout(r, 1500))]);
    await SpeechRecognition.removeAllListeners().catch(() => {});
    return latest;
  };
}
