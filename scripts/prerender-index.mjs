// ينتج ملف HTML ثابتًا عبر تشغيل مدخل SSR المبني محليًا، ليستخدمه تطبيق أندرويد من الملفات المحلية.
import { writeFile } from "node:fs/promises";

const mod = await import(new URL("../dist/server/index.mjs", import.meta.url).href);
const handler = mod.default ?? mod;
const res = await handler.fetch(new Request("http://localhost/"), {}, {});
const html = await res.text();
if (!res.ok || !html.includes("<html")) {
  console.error("فشل توليد الصفحة الثابتة:", res.status);
  process.exit(1);
}
await writeFile(".cap-index.html", html, "utf8");
console.log("تم توليد .cap-index.html للنسخة المحلية");
