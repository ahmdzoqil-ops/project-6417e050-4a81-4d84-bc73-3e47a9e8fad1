// ينسخ مخرجات بناء الويب إلى مجلد dist الذي يستخدمه Capacitor.
import { cp, rm, mkdir, stat } from "node:fs/promises";

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
  console.error("لم يتم العثور على مخرجات البناء. نفّذ: bun run build أولًا.");
  process.exit(1);
}

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp(source, "dist", { recursive: true });
console.log(`تم نسخ ${source} إلى dist`);
