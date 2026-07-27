import { createFileRoute } from "@tanstack/react-router";
import { transcribeCore } from "@/lib/transcribe.core";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/transcribe")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            audioBase64?: unknown;
            mime?: unknown;
          };
          if (typeof body.audioBase64 !== "string" || !body.audioBase64) {
            return Response.json(
              { error: "audioBase64 required" },
              { status: 400, headers: cors },
            );
          }
          const mime = typeof body.mime === "string" ? body.mime : "audio/webm";
          const result = await transcribeCore(body.audioBase64, mime);
          return Response.json(result, { headers: cors });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "failed" },
            { status: 500, headers: cors },
          );
        }
      },
    },
  },
});
