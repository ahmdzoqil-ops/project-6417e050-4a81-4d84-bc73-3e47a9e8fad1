import { formatAmount, formatDate } from "@/lib/format";
import { customerBalance, type Customer, type Profile, type Transaction } from "@/lib/storage";
import { APP_NAME, APP_TAGLINE, DEVELOPER, APP_VERSION } from "@/lib/settings";

export function esc(s: string) {
  return String(s ?? "").replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

/* ---------------- ألوان الهوية ---------------- */

const TONES: Record<string, { bg: string; fg: string; border: string }> = {
  rose: { bg: "#fff1f2", fg: "#be123c", border: "#fecdd3" },
  emerald: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" },
  sky: { bg: "#f0f9ff", fg: "#0369a1", border: "#bae6fd" },
  amber: { bg: "#fffbeb", fg: "#b45309", border: "#fde68a" },
  slate: { bg: "#f8fafc", fg: "#334155", border: "#e2e8f0" },
};

/* ---------------- شعار احتياطي (SVG) ---------------- */

function monogram(text: string) {
  const letter = esc((text || "د").trim().charAt(0) || "د");
  return `<div style="width:72px;height:72px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#fff;font-size:28px;font-weight:800;box-shadow:0 4px 10px rgba(79,70,229,.25)">${letter}</div>`;
}

/* ---------------- غلاف موحّد ---------------- */

export function reportShell(title: string, profile: Profile, inner: string) {
  const logo = profile.photo
    ? `<img src="${profile.photo}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 10px;display:block;border:3px solid #fff;box-shadow:0 4px 10px rgba(15,23,42,.12)" />`
    : monogram(profile.shopName || profile.userName || APP_NAME);

  const metaLine = [profile.userName, profile.phone, profile.area]
    .filter(Boolean)
    .map((v) => esc(String(v)))
    .join(" &nbsp;•&nbsp; ");

  return `<div style="width:794px;background:#f8fafc;color:#0f172a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;line-height:1.7">
    <div style="background:linear-gradient(135deg,#eef2ff,#f0f9ff);padding:36px 36px 24px;text-align:center;border-bottom:1px solid #e2e8f0">
      ${logo}
      <div style="font-size:26px;font-weight:800;color:#1e293b">${esc(profile.shopName || APP_NAME)}</div>
      ${metaLine ? `<div style="margin-top:4px;font-size:13px;color:#64748b">${metaLine}</div>` : ""}
      <div style="margin-top:14px;display:inline-block;background:#4f46e5;color:#fff;font-size:15px;font-weight:700;padding:7px 22px;border-radius:999px">${esc(title)}</div>
      <div style="margin-top:10px;font-size:12px;color:#94a3b8">تاريخ الإنشاء: ${formatDate(new Date().toISOString())}</div>
    </div>

    <div style="padding:28px 36px 36px">
      ${inner}
    </div>

    <div style="padding:20px 36px 30px">
      <div style="border-top:1px solid #e2e8f0;padding-top:16px;display:flex;align-items:center;justify-content:center;gap:12px;text-align:center">
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#0ea5e9);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:800">د</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#334155">${esc(APP_NAME)}</div>
          <div style="font-size:11px;color:#94a3b8">${esc(APP_TAGLINE)} — ${esc(DEVELOPER)} — الإصدار ${esc(APP_VERSION)}</div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- بطاقات ملخّص ---------------- */

export function summaryCards(
  cards: { label: string; value: string; tone?: "rose" | "emerald" | "sky" | "amber" | "slate" }[],
) {
  return `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:22px">
    ${cards
      .map((c) => {
        const t = TONES[c.tone ?? "slate"];
        return `<div style="flex:1;min-width:150px;background:${t.bg};border:1px solid ${t.border};border-radius:14px;padding:14px 16px;text-align:center">
          <div style="font-size:12px;color:${t.fg};opacity:.85;font-weight:600">${esc(c.label)}</div>
          <div style="margin-top:6px;font-size:19px;font-weight:800;color:${t.fg}">${esc(c.value)}</div>
        </div>`;
      })
      .join("")}
  </div>`;
}

/* ---------------- عنوان قسم ---------------- */

export function sectionTitle(text: string) {
  return `<div style="font-size:16px;font-weight:800;color:#1e293b;margin:22px 0 10px;padding-right:10px;border-right:4px solid #4f46e5">${esc(text)}</div>`;
}

/* ---------------- جدول بيانات ---------------- */

export function dataTable(headers: string[], rows: string[][]) {
  const head = headers
    .map(
      (h, i) =>
        `<th style="padding:10px;background:#4f46e5;color:#fff;font-size:13px;font-weight:700;text-align:right;white-space:normal;word-break:break-word;${i === 0 ? "border-top-right-radius:10px" : ""}${i === headers.length - 1 ? "border-top-left-radius:10px" : ""}">${esc(h)}</th>`,
    )
    .join("");

  const body = rows
    .map(
      (r, ri) =>
        `<tr style="background:${ri % 2 === 0 ? "#ffffff" : "#f8fafc"}">${r
          .map(
            (c) =>
              `<td style="padding:10px;font-size:13px;color:#334155;text-align:right;white-space:normal;word-break:break-word;border-bottom:1px solid #eef2f7">${esc(c)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<table style="width:100%;border-collapse:separate;border-spacing:0;margin-top:6px;overflow:hidden;border-radius:10px;box-shadow:0 1px 3px rgba(15,23,42,.06)">
    <thead><tr>${head}</tr></thead>
    <tbody>${body || `<tr><td colspan="${headers.length}" style="padding:18px;text-align:center;color:#94a3b8;font-size:13px">لا توجد بيانات</td></tr>`}</tbody>
  </table>`;
}

/* ---------------- تحويل HTML إلى PDF (يتفادى مشاكل oklch) ---------------- */

/** ذاكرة مؤقتة: نفس التقرير لا يُبنى مرتين (مشاركة/حفظ) */
let cache: { html: string; blob: Blob } | null = null;

async function htmlToPdfBlob(html: string) {
  if (cache && cache.html === html) return cache.blob;

  const { jsPDF } = await import("jspdf");
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;";
  host.innerHTML = html;
  document.body.appendChild(host);
  const height = Math.ceil((host.firstElementChild as HTMLElement).scrollHeight) + 20;
  host.remove();

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">${html}</div>` +
    `</foreignObject></svg>`;
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("render error"));
    img.src = url;
  });

  // دقة متوازنة: واضحة للقراءة وأسرع بكثير من 2x على الهواتف
  const scale = height > 3000 ? 1.25 : 1.6;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(794 * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const w = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const h = (canvas.height * w) / canvas.width;
  const data = canvas.toDataURL("image/jpeg", 0.82);
  pdf.addImage(data, "JPEG", 0, 0, w, h, undefined, "FAST");
  let offset = pageH;
  while (h - offset > 0) {
    pdf.addPage();
    pdf.addImage(data, "JPEG", 0, -offset, w, h, undefined, "FAST");
    offset += pageH;
  }
  // تحرير الذاكرة
  canvas.width = 0;
  canvas.height = 0;

  const blob = pdf.output("blob") as Blob;
  cache = { html, blob };
  return blob;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read error"));
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.readAsDataURL(blob);
  });
}

function webDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/** حفظ الملف في مجلد المستندات ويعيد المسار */
async function savePdf(blob: Blob, fileName: string): Promise<string | null> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    webDownload(blob, fileName);
    return null;
  }
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const res = await Filesystem.writeFile({
    path: fileName,
    data: await blobToBase64(blob),
    directory: Directory.Documents,
    recursive: true,
  });
  return res.uri;
}

async function sharePdf(blob: Blob, fileName: string) {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    webDownload(blob, fileName);
    return;
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const res = await Filesystem.writeFile({
    path: fileName,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });
  await Share.share({ title: fileName, url: res.uri });
}

function printHtml(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
    <title>طباعة التقرير</title></head><body style="margin:0">${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}

/** تنفيذ فعلي: مشاركة/حفظ PDF أو الطباعة. يعيد مسار الحفظ إن وُجد. */
export async function deliverReport(
  html: string,
  fileName: string,
  mode: "share" | "save" | "print",
): Promise<string | null> {
  if (mode === "print") {
    printHtml(html);
    return null;
  }
  const blob = await htmlToPdfBlob(html);
  if (mode === "save") return savePdf(blob, fileName);
  await sharePdf(blob, fileName);
  return null;
}

/** يبني التقرير ثم يطلب من واجهة المستخدم عرضه (بدل التنزيل الفوري) */
export async function shareHtmlReport(html: string, fileName: string) {
  window.dispatchEvent(new CustomEvent("report:preview", { detail: { html, fileName } }));
}

/** إنشاء تقرير عميل احترافي وعرضه للمعاينة قبل المشاركة/الطباعة */
export async function shareCustomerReport(
  customer: Customer,
  items: Transaction[],
  profile: Profile,
) {
  const rows = items
    .filter((t) => t.customerId === customer.id)
    .sort((a, z) => a.date.localeCompare(z.date));

  const totalDebt = rows.filter((t) => t.type === "debt").reduce((s, t) => s + t.amount, 0);
  const totalPayment = rows.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
  const balance = customerBalance(items, customer.id);

  const cards = summaryCards([
    { label: "إجمالي الديون", value: formatAmount(totalDebt), tone: "rose" },
    { label: "إجمالي السداد", value: formatAmount(totalPayment), tone: "emerald" },
    { label: "الرصيد المتبقي", value: formatAmount(balance), tone: "sky" },
    { label: "عدد العمليات", value: String(rows.length), tone: "amber" },
  ]);

  const customerPhoto = customer.photo
    ? `<img src="${customer.photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover" />`
    : `<div style="width:56px;height:56px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#64748b">${esc(customer.name.charAt(0) || "ع")}</div>`;

  const customerInfo = `<div style="display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;margin-bottom:18px">
    ${customerPhoto}
    <div>
      <div style="font-size:16px;font-weight:800;color:#1e293b">${esc(customer.name)}</div>
      ${customer.phone ? `<div style="font-size:12px;color:#64748b">${esc(customer.phone)}</div>` : ""}
    </div>
  </div>`;

  let running = 0;
  const tableRows = rows.map((t) => {
    running += t.type === "debt" ? t.amount : -t.amount;
    return [
      formatDate(t.date),
      t.type === "debt" ? "دين" : "سداد",
      formatAmount(t.amount),
      t.note ?? "",
      formatAmount(running),
    ];
  });

  const inner = `
    ${cards}
    ${customerInfo}
    ${sectionTitle("سجل العمليات")}
    ${dataTable(["التاريخ", "النوع", "المبلغ", "ملاحظة", "الرصيد"], tableRows)}
  `;

  const html = reportShell(`كشف حساب: ${customer.name}`, profile, inner);
  const fileName = `تقرير-${customer.name.replace(/\s+/g, "-")}.pdf`;
  window.dispatchEvent(new CustomEvent("report:preview", { detail: { html, fileName } }));
}
