import { formatAmount, formatDate } from "@/lib/format";
import { customerBalance, type Customer, type Profile, type Transaction } from "@/lib/storage";

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

function reportHtml(
  customer: Customer,
  rows: Transaction[],
  balance: number,
  profile: Profile,
) {
  const logo = profile.photo
    ? `<img src="${profile.photo}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block" />`
    : "";
  const body = rows
    .map(
      (t) => `<tr>
        <td>${formatDate(t.date)}</td>
        <td>${t.type === "debt" ? "دين" : "سداد"}</td>
        <td>${formatAmount(t.amount)}</td>
        <td>${esc(t.note ?? "")}</td>
      </tr>`,
    )
    .join("");

  return `<div style="width:794px;padding:32px;background:#fff;color:#111;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl">
    <div style="text-align:center;border-bottom:2px solid #e11d48;padding-bottom:12px">
      ${logo}
      <div style="font-size:24px;font-weight:800">${esc(profile.shopName || "دينك بصوتك")}</div>
      <div style="font-size:13px;color:#555">${esc(profile.userName || "")}${profile.phone ? " • " + esc(profile.phone) : ""}${profile.area ? " • " + esc(profile.area) : ""}</div>
    </div>

    <div style="margin-top:18px;display:flex;justify-content:space-between;font-size:15px">
      <div>
        <div style="font-weight:700;font-size:18px">${esc(customer.name)}</div>
        ${customer.phone ? `<div style="color:#555">${esc(customer.phone)}</div>` : ""}
        <div style="color:#555">عدد العمليات: ${rows.length}</div>
      </div>
      <div style="text-align:left">
        <div style="color:#555">تاريخ التقرير</div>
        <div>${formatDate(new Date().toISOString())}</div>
        <div style="margin-top:6px;color:#555">الرصيد المتبقي</div>
        <div style="font-size:22px;font-weight:800;color:#e11d48">${formatAmount(balance)}</div>
      </div>
    </div>

    <table style="width:100%;margin-top:18px;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="border:1px solid #ddd;padding:8px">التاريخ</th>
          <th style="border:1px solid #ddd;padding:8px">النوع</th>
          <th style="border:1px solid #ddd;padding:8px">المبلغ</th>
          <th style="border:1px solid #ddd;padding:8px">ملاحظة</th>
        </tr>
      </thead>
      <tbody style="text-align:center">${body}</tbody>
    </table>

    <div style="margin-top:28px;border-top:1px solid #ddd;padding-top:10px;text-align:center;font-size:12px;color:#777">
      تم إنشاء هذا التقرير بواسطة تطبيق «دينك بصوتك» — إدارة الديون والجيب محليًا على الجهاز
    </div>
  </div>`;
}

async function htmlToPdfBlob(html: string) {
  const { jsPDF } = await import("jspdf");
  // القياس أولًا داخل عنصر مخفي
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;";
  host.innerHTML = html;
  document.body.appendChild(host);
  const height = Math.ceil((host.firstElementChild as HTMLElement).scrollHeight) + 20;
  host.remove();

  // الرسم عبر SVG foreignObject (يتفادى قراءة أنماط التطبيق)
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

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = 794 * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const h = (canvas.height * w) / canvas.width;
  const data = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(data, "JPEG", 0, 0, w, h);
  let offset = pageH;
  while (h - offset > 0) {
    pdf.addPage();
    pdf.addImage(data, "JPEG", 0, -offset, w, h);
    offset += pageH;
  }
  return pdf.output("blob") as Blob;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read error"));
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.readAsDataURL(blob);
  });
}

async function deliver(blob: Blob, fileName: string) {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(blob);
    const res = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache,
    });
    await Share.share({ title: fileName, url: res.uri });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/** توليد PDF من HTML جاهز ثم مشاركته أو تنزيله */
export async function shareHtmlReport(html: string, fileName: string) {
  await deliver(await htmlToPdfBlob(html), fileName);
}

/** غلاف موحّد لرأس/ذيل التقارير */
export function reportShell(title: string, profile: Profile, inner: string) {
  const logo = profile.photo
    ? `<img src="${profile.photo}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block" />`
    : "";
  return `<div style="width:794px;padding:32px;background:#fff;color:#111;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl">
    <div style="text-align:center;border-bottom:2px solid #e11d48;padding-bottom:12px">
      ${logo}
      <div style="font-size:24px;font-weight:800">${esc(profile.shopName ?? "دينك بصوتك")}</div>
      <div style="font-size:13px;color:#666">${esc(profile.userName ?? "")} ${profile.phone ? "— " + esc(profile.phone) : ""}</div>
      <div style="margin-top:8px;font-size:18px;font-weight:700">${esc(title)}</div>
    </div>
    ${inner}
    <div style="margin-top:28px;border-top:1px solid #ddd;padding-top:10px;text-align:center;font-size:12px;color:#777">
      تم إنشاء هذا التقرير بواسطة تطبيق «دينك بصوتك» — إدارة الديون والجيب محليًا على الجهاز
    </div>
  </div>`;
}

/** إنشاء تقرير PDF لعميل ثم مشاركته أو تنزيله */
export async function shareCustomerReport(
  customer: Customer,
  items: Transaction[],
  profile: Profile,
) {
  const rows = items
    .filter((t) => t.customerId === customer.id)
    .sort((a, z) => a.date.localeCompare(z.date));
  const balance = customerBalance(items, customer.id);
  const blob = await htmlToPdfBlob(reportHtml(customer, rows, balance, profile));
  const fileName = `تقرير-${customer.name.replace(/\s+/g, "-")}.pdf`;
  await deliver(blob, fileName);
}

  const fileName = `تقرير-${customer.name.replace(/\s+/g, "-")}.pdf`;

  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(blob);
    const res = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache,
    });
    await Share.share({ title: fileName, url: res.uri });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
