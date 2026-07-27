// ينسخ مخرجات بناء الويب إلى مجلد dist الذي يستخدمه Capacitor (ملفات محلية بالكامل).
import { cp, rm, mkdir, stat, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const candidates = [".output/public", "dist/client", ".nitro/dist/public"];

let source = null;
for (const dir of candidates) {
  try {
    const s = await stat(dir);
    if (s.isDirectory()) {
      source = dir;
      break;
    }
  } catch {
    // تجاهل
  }
}

if (!source) {
  console.error("لم يتم العثور على مخرجات البناء. نفّذ: npm run build أولًا.");
  process.exit(1);
}

// ننسخ إلى مجلد مؤقت أولًا حتى نتمكن من تنظيف dist بالكامل
const staging = join(tmpdir(), `cap-web-${Date.now()}`);
await cp(source, staging, { recursive: true });

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp(staging, "dist", { recursive: true });
await rm(staging, { recursive: true, force: true });

await stat("dist/index.html").catch(() => {
  console.error("تحذير: لم يتم العثور على dist/index.html");
});

console.log(`تم نسخ ${source} إلى dist (ملفات محلية للتطبيق)`);
void rename;
