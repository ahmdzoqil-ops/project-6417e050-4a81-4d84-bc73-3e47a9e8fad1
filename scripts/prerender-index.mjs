// ينتج dist/index.html ثابتًا عبر تشغيل مدخل SSR المبني محليًا، حتى يعمل تطبيق أندرويد من الملفات المحلية.
import { writeFile } from "node:fs/promises";

const mod = await import(new URL("../dist/server/index.mjs", import.meta.url).href);
const handler = mod.default ?? mod;
const res = await handler.fetch(new Request("http://localhost/"), {}, {});
const html = await res.text();
if (!res.ok || !html.includes("<html")) {
  console.error("فشل توليد index.html", res.status);
  process.exit(1);
}
await writeFile("dist/index.html", html, "utf8");
console.log("تم إنشاء dist/index.html للنسخة المحلية");
