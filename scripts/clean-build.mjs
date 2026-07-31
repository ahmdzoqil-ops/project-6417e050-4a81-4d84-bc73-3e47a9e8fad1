// ينظّف مخرجات البناء القديمة قبل بناء جديد، حتى لا يلتقط Capacitor ملفات قديمة (Cache).
import { rm } from "node:fs/promises";

for (const dir of ["dist", ".output", ".nitro", ".cap-index.html", "android/app/src/main/assets/public"]) {
  await rm(dir, { recursive: true, force: true });
}

console.log("تم تنظيف مخرجات البناء القديمة (dist / .output / .nitro / أصول أندرويد)");
