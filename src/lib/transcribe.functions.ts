import { createServerFn } from "@tanstack/react-start";

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== "object") throw new Error("bad input");
    const d = data as { audioBase64?: unknown; mime?: unknown };
    if (typeof d.audioBase64 !== "string" || !d.audioBase64) {
      throw new Error("audioBase64 required");
    }
    const mime = typeof d.mime === "string" ? d.mime : "audio/webm";
    return { audioBase64: d.audioBase64, mime };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const bin = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    const ext =
      data.mime.includes("wav")
        ? "wav"
        : data.mime.includes("mp4")
          ? "mp4"
          : data.mime.includes("mpeg")
            ? "mp3"
            : "webm";
    const blob = new Blob([bin], { type: data.mime });

    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("language", "ar");
    form.append(
      "prompt",
      "تسجيل باللهجة العربية العامية لعمليات دين وجيب. أمثلة: علي عليه ألف وخمسمية، محمد صالح له ألفين ونص، سمير القحطاني 2500، زد محمد خمسمية، عبد الرحمن دين ثلاثة آلاف وثمانمية، فاطمة جيب ألف وسبعمية. الأسماء عربية كاملة مثل محمد، أحمد، علي، عبد الله، عبد الرحمن، فاطمة الزهراء، سمير القحطاني. الأرقام بالعامية: خمسمية، ستمية، سبعمية، تمانمية، تسعمية، متين، ألفين، نص. اكتب الأرقام بالكلمات العربية.",
    );


    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`transcription_failed:${res.status}:${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });
