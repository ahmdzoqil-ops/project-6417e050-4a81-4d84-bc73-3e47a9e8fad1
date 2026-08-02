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
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  // إطار معزول حتى لا تتأثر عملية الرسم بأنماط التطبيق (oklch غير مدعومة)
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1400px;border:0";
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(
      `<!doctype html><html dir="rtl"><head><meta charset="utf-8"></head><body style="margin:0;background:#fff">${html}</body></html>`,
    );
    doc.close();
    await new Promise((r) => setTimeout(r, 60));
    const target = doc.body.firstElementChild as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: 900,
      windowHeight: target.scrollHeight + 40,
    });
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const w = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const h = (canvas.height * w) / canvas.width;
    const img = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(img, "JPEG", 0, 0, w, h);
    let rest = h - pageH;
    let offset = pageH;
    while (rest > 0) {
      pdf.addPage();
      pdf.addImage(img, "JPEG", 0, -offset, w, h);
      rest -= pageH;
      offset += pageH;
    }
    return pdf.output("blob") as Blob;
  } finally {
    frame.remove();
  }
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read error"));
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.readAsDataURL(blob);
  });
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
