import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, FileText, Package, Receipt, Coins } from "lucide-react";
import { toast } from "sonner";
import { formatAmount } from "@/lib/format";
import { dayKey, startOfDay, type Profile, type Transaction } from "@/lib/storage";
import { dailyDebtTotal, pocketTotal } from "@/lib/derive";
import { reportShell, shareHtmlReport } from "@/lib/pdf";
import {
  daySummary,
  expenseLabel,
  loadQat,
  newQatId,
  ofDay,
  saveQat,
  type CashSale,
  type Expense,
  type ExpenseKind,
  type Purchase,
  type QatData,
} from "@/lib/qat";

export function ExpensesSection({
  items,
  profile,
}: {
  items: Transaction[];
  profile: Profile;
}) {
  const [data, setData] = useState<QatData>(() => loadQat());
  const today = dayKey(startOfDay().toISOString());

  const update = (next: QatData) => {
    setData(next);
    saveQat(next);
  };

  const debtSales = dailyDebtTotal(items);
  const pocketSales = pocketTotal(items);
  const summary = useMemo(
    () => daySummary(data, today, debtSales, pocketSales),
    [data, today, debtSales, pocketSales],
  );

  const purchases = ofDay(data.purchases, today);
  const expenses = ofDay(data.expenses, today);
  const cashSales = ofDay(data.cashSales, today);

  const exportPdf = async () => {
    try {
      const rows = summary.costs
        .map(
          (c) => `<tr>
            <td>${c.purchase.kind}</td>
            <td>${formatAmount(c.purchase.amount)}</td>
            <td>${c.purchase.bundles}</td>
            <td>${formatAmount(Math.round(c.basePerBundle))}</td>
            <td>${formatAmount(Math.round(c.expenseShare))}</td>
            <td>${formatAmount(Math.round(c.realPerBundle))}</td>
          </tr>`,
        )
        .join("");
      const line = (k: string, v: number) =>
        `<tr><td style="padding:6px 8px">${k}</td><td style="padding:6px 8px;font-weight:700">${formatAmount(Math.round(v))}</td></tr>`;
      const inner = `
        <div style="margin-top:16px;font-size:14px">التاريخ: ${today}</div>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px" border="1">
          <thead style="background:#f3f4f6">
            <tr><th>النوع</th><th>مبلغ الشراء</th><th>العلاقي</th><th>سعر العلاقة</th><th>نصيب المصاريف</th><th>السعر الحقيقي</th></tr>
          </thead>
          <tbody style="text-align:center">${rows || `<tr><td colspan="6">لا توجد مشتريات</td></tr>`}</tbody>
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px" border="1">
          <tbody>
            ${line("إجمالي المشتريات", summary.purchasesTotal)}
            ${line("إجمالي المصاريف", summary.expensesTotal)}
            ${line("رأس المال", summary.capital)}
            ${line("بيع نقدي", summary.cashSales)}
            ${line("بيع دين", summary.debtSales)}
            ${line("جيب", summary.pocketSales)}
            ${line("إجمالي البيع", summary.salesTotal)}
            ${line(summary.profit >= 0 ? "الربح" : "الخسارة", Math.abs(summary.profit))}
          </tbody>
        </table>`;
      await shareHtmlReport(
        reportShell(`تقرير اليوم — ${today}`, profile, inner),
        `تقرير-اليوم-${today}.pdf`,
      );
      toast.success("تم إنشاء التقرير");
    } catch {
      toast.error("تعذر إنشاء التقرير");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="رأس المال" value={summary.capital} tone="text-amber-600" />
        <Stat label="إجمالي البيع" value={summary.salesTotal} tone="text-emerald-600" />
        <Stat label="المصاريف" value={summary.expensesTotal} tone="text-rose-600" />
        <Stat
          label={summary.profit >= 0 ? "الربح" : "الخسارة"}
          value={Math.abs(summary.profit)}
          tone={summary.profit >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      <Button className="w-full gap-2" variant="outline" onClick={exportPdf}>
        <FileText className="h-4 w-4" /> مشاركة تقرير اليوم (PDF)
      </Button>

      {/* الشروات */}
      <Block icon={Package} title="الشروات (المشتريات)">
        <PurchaseForm
          onAdd={(p) => update({ ...data, purchases: [p, ...data.purchases] })}
        />
        {summary.costs.length === 0 && <Empty text="لا توجد شروات اليوم" />}
        {summary.costs.map((c) => (
          <Row
            key={c.purchase.id}
            title={c.purchase.kind}
            subtitle={`${c.purchase.bundles} علاقة · السعر الحقيقي ${formatAmount(Math.round(c.realPerBundle))}${c.purchase.note ? " · " + c.purchase.note : ""}`}
            amount={c.purchase.amount}
            onEdit={() => {
              const amount = Number(prompt("مبلغ الشراء", String(c.purchase.amount)));
              const bundles = Number(prompt("عدد العلاقي", String(c.purchase.bundles)));
              if (!amount || !bundles) return;
              update({
                ...data,
                purchases: data.purchases.map((p) =>
                  p.id === c.purchase.id ? { ...p, amount, bundles } : p,
                ),
              });
            }}
            onDelete={() =>
              update({
                ...data,
                purchases: data.purchases.filter((p) => p.id !== c.purchase.id),
              })
            }
          />
        ))}
      </Block>

      {/* المصاريف */}
      <Block icon={Receipt} title="المصاريف">
        <ExpenseForm onAdd={(e) => update({ ...data, expenses: [e, ...data.expenses] })} />
        {expenses.length === 0 && <Empty text="لا توجد مصاريف اليوم" />}
        {expenses.map((e) => (
          <Row
            key={e.id}
            title={expenseLabel[e.kind]}
            subtitle={e.note ?? ""}
            amount={e.amount}
            onEdit={() => {
              const amount = Number(prompt("المبلغ", String(e.amount)));
              if (!amount) return;
              update({
                ...data,
                expenses: data.expenses.map((x) => (x.id === e.id ? { ...x, amount } : x)),
              });
            }}
            onDelete={() =>
              update({ ...data, expenses: data.expenses.filter((x) => x.id !== e.id) })
            }
          />
        ))}
      </Block>

      {/* حركة البيع */}
      <Block icon={Coins} title="حركة البيع">
        <CashForm onAdd={(c) => update({ ...data, cashSales: [c, ...data.cashSales] })} />
        {cashSales.map((c) => (
          <Row
            key={c.id}
            title="بيع نقدي"
            subtitle={c.note ?? ""}
            amount={c.amount}
            onEdit={() => {
              const amount = Number(prompt("المبلغ", String(c.amount)));
              if (!amount) return;
              update({
                ...data,
                cashSales: data.cashSales.map((x) => (x.id === c.id ? { ...x, amount } : x)),
              });
            }}
            onDelete={() =>
              update({ ...data, cashSales: data.cashSales.filter((x) => x.id !== c.id) })
            }
          />
        ))}
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="flex justify-between"><span>بيع دين (تلقائي)</span><span className="font-bold tabular-nums">{formatAmount(summary.debtSales)}</span></p>
          <p className="flex justify-between"><span>جيب (تلقائي)</span><span className="font-bold tabular-nums">{formatAmount(summary.pocketSales)}</span></p>
          <p className="mt-1 flex justify-between border-t pt-1"><span>الإجمالي</span><span className="font-bold tabular-nums">{formatAmount(summary.salesTotal)}</span></p>
        </div>
      </Block>

      <p className="text-center text-[11px] text-muted-foreground">
        عدد الشروات المسجلة اليوم: {purchases.length}
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="py-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold tabular-nums ${tone}`}>{formatAmount(value)}</p>
      </CardContent>
    </Card>
  );
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <p className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </p>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-2 text-center text-xs text-muted-foreground">{text}</p>;
}

function Row({
  title,
  subtitle,
  amount,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  amount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle ? (
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <span className="font-bold tabular-nums">{formatAmount(amount)}</span>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="تعديل">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="حذف">
        <Trash2 className="h-4 w-4 text-rose-600" />
      </Button>
    </div>
  );
}

function PurchaseForm({ onAdd }: { onAdd: (p: Purchase) => void }) {
  const [kind, setKind] = useState("");
  const [amount, setAmount] = useState("");
  const [bundles, setBundles] = useState("");
  const [note, setNote] = useState("");

  const perBundle =
    Number(amount) > 0 && Number(bundles) > 0 ? Number(amount) / Number(bundles) : 0;

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">النوع</Label>
          <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="مثال: شامي" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">مبلغ الشراء</Label>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">عدد العلاقي</Label>
          <Input
            inputMode="numeric"
            value={bundles}
            onChange={(e) => setBundles(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ملاحظة</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      {perBundle > 0 && (
        <p className="text-xs text-muted-foreground">
          سعر العلاقة قبل المصاريف: {formatAmount(Math.round(perBundle))}
        </p>
      )}
      <Button
        size="sm"
        className="w-full gap-1"
        onClick={() => {
          if (!kind.trim() || !Number(amount) || !Number(bundles)) {
            toast.error("أدخل النوع والمبلغ وعدد العلاقي");
            return;
          }
          onAdd({
            id: newQatId(),
            date: new Date().toISOString(),
            kind: kind.trim(),
            amount: Number(amount),
            bundles: Number(bundles),
            note: note.trim() || undefined,
          });
          setKind("");
          setAmount("");
          setBundles("");
          setNote("");
          toast.success("تمت إضافة الشروة");
        }}
      >
        <Plus className="h-4 w-4" /> إضافة شروة
      </Button>
    </div>
  );
}

function ExpenseForm({ onAdd }: { onAdd: (e: Expense) => void }) {
  const [kind, setKind] = useState<ExpenseKind>("shipping");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">النوع</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as ExpenseKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipping">شحن</SelectItem>
              <SelectItem value="tax">ضريبة</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">المبلغ</Label>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      </div>
      <Input placeholder="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button
        size="sm"
        variant="secondary"
        className="w-full gap-1"
        onClick={() => {
          if (!Number(amount)) {
            toast.error("أدخل المبلغ");
            return;
          }
          onAdd({
            id: newQatId(),
            date: new Date().toISOString(),
            kind,
            amount: Number(amount),
            note: note.trim() || undefined,
          });
          setAmount("");
          setNote("");
          toast.success("تمت إضافة المصروف");
        }}
      >
        <Plus className="h-4 w-4" /> إضافة مصروف
      </Button>
    </div>
  );
}

function CashForm({ onAdd }: { onAdd: (c: CashSale) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          inputMode="numeric"
          placeholder="مبلغ البيع النقدي"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
        />
        <Input placeholder="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="w-full gap-1"
        onClick={() => {
          if (!Number(amount)) {
            toast.error("أدخل المبلغ");
            return;
          }
          onAdd({
            id: newQatId(),
            date: new Date().toISOString(),
            amount: Number(amount),
            note: note.trim() || undefined,
          });
          setAmount("");
          setNote("");
          toast.success("تمت إضافة البيع النقدي");
        }}
      >
        <Plus className="h-4 w-4" /> إضافة بيع نقدي
      </Button>
    </div>
  );
}
