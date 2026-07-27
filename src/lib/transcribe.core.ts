export const TRANSCRIBE_PROMPT =
  "تسجيل باللهجة العربية العامية لعمليات دين وجيب. أمثلة: علي عليه ألف وخمسمية، محمد صالح له ألفين ونص، سمير القحطاني 2500، زد محمد خمسمية، عبد الرحمن دين ثلاثة آلاف وثمانمية، فاطمة جيب ألف وسبعمية. الأسماء عربية كاملة مثل محمد، أحمد، علي، عبد الله، عبد الرحمن، فاطمة الزهراء، سمير القحطاني. الأرقام بالعامية: خمسمية، ستمية، سبعمية، تمانمية، تسعمية، متين، ألفين، نص. اكتب الأرقام بالكلمات العربية.";

export async function transcribeCore(audioBase64: string, mime: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const bin = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const ext = mime.includes("wav")
    ? "wav"
    : mime.includes("mp4")
      ? "mp4"
      : mime.includes("mpeg")
        ? "mp3"
        : "webm";
  const blob = new Blob([bin], { type: mime });

  const form = new FormData();
  form.append("file", blob, `recording.${ext}`);
  form.append("model", "openai/gpt-4o-mini-transcribe");
  form.append("language", "ar");
  form.append("prompt", TRANSCRIBE_PROMPT);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`transcription_failed:${res.status}:${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { text?: string };
  return { text: (json.text ?? "").trim() };
}
