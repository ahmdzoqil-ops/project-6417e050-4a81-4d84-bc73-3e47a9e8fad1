import { createServerFn } from "@tanstack/react-start";
import { transcribeCore } from "./transcribe.core";

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
  .handler(async ({ data }) => transcribeCore(data.audioBase64, data.mime));
