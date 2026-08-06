import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Pencil,
  FileText,
  Package,
  Receipt,
  Coins,
  Wallet,
  Layers,
  StickyNote,
  Truck,
  BadgePercent,
  Sparkles,
  ArrowRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { formatAmount } from "@/lib/format";
import { dayKey, startOfDay, type Profile, type Transaction } from "@/lib/storage";
import { dailyDebtTotal, pocketTotal } from "@/lib/derive";
import { dataTable, reportShell, sectionTitle, shareHtmlReport, summaryCards } from "@/lib/pdf";
import {
  dayLabel,
  daySummary,
  expenseLabel,
  loadQatPruned,
  newQatId,
  ofDay,
  profitMood,
  recentDayKeys,
  saveQat,
  type CashSale,
  type Expense,
  type ExpenseKind,
  type Mood,
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
  const [data, setData] = useState<QatData>(() => loadQatPruned());
  const today = dayKey(startOfDay().toISOString());
  const dayKeys = useMemo(() => recentDayKeys(), []);
  const [selectedDay, setSelectedDay] = useState(today);
  const isToday = selectedDay === today;

  const update = (next: QatData) => {
    setData(next);
    saveQat(next);
  };

  const debtSales = isToday ? dailyDebtTotal(items) : 0;
  const pocketSales = isToday ? pocketTotal(items) : 0;
  const summary = useMemo(
    () => daySummary(data, selectedDay, debtSales, pocketSales),
    [data, selectedDay, debtSales, pocketSales],
  );
  const mood = useMemo(() => profitMood(summary.profit, summary.capital), [summary.profit, summary.capital]);

  const purchases = ofDay(data.purchases, selectedDay);
  const expenses = ofDay(data.expenses, selectedDay);
  const cashSales = ofDay(data.cashSales, selectedDay);

  const [purchaseDialog, setPurchaseDialog] = useState<Purchase | null | "new">(null);
  const [expenseDialog, setExpenseDialog] = useState<Expense | null | "new">(null);
  const [cashDialog, setCashDialog] = useState<CashSale | null | "new">(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "purchases" | "expenses" | "cashSales";
    id: string;
    label: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const purchaseRows = summary.costs.map((c) => [
        c.purchase.kind,
        formatAmount(c.purchase.amount),
        String(c.purchase.bundles),
        c.purchase.note ?? "",
      ]);
      const expenseRows = expenses.map((e) => [
        expenseLabel[e.kind],
        formatAmount(e.amount),
        e.note ?? "",
      ]);
      const inner = `
        ${summaryCards([
          { label: "رأس المال", value: formatAmount(Math.round(summary.capital)), tone: "amber" },
          { label: "إجمالي المبيعات", value: formatAmount(Math.round(summary.salesTotal)), tone: "emerald" },
          {
            label: summary.profit >= 0 ? "الربح" : "الخسارة",
            value: formatAmount(Math.round(Math.abs(summary.profit))),
            tone: summary.profit >= 0 ? "emerald" : "rose",
          },
          { label: "إجمالي المصاريف", value: formatAmount(Math.round(summary.expensesTotal)), tone: "sky" },
        ])}
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px">
          <div style="font-size:26px">${mood.emoji}</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:#1e293b">${mood.title}</div>
            <div style="font-size:12px;color:#64748b">${mood.text}</div>
          </div>
        </div>
        ${sectionTitle("الشروة (المشتريات)")}
        ${dataTable(["النوع", "مبلغ الشراء", "عدد العلاقي", "ملاحظة"], purchaseRows)}
        ${sectionTitle("المصاريف")}
        ${dataTable(["النوع", "المبلغ", "ملاحظة"], expenseRows)}
        ${sectionTitle("حركة البيع")}
        ${dataTable(
          ["البند", "المبلغ"],
          [
            ["بيع نقدي", formatAmount(Math.round(summary.cashSales))],
            ["بيع دين", formatAmount(Math.round(summary.debtSales))],
            ["جيب", formatAmount(Math.round(summary.pocketSales))],
            ["إجمالي البيع", formatAmount(Math.round(summary.salesTotal))],
          ],
        )}`;
      await shareHtmlReport(
        reportShell(`تقرير يوم — ${dayLabel(selectedDay, today)}`, profile, inner),
        `تقرير-${selectedDay}.pdf`,
      );
    } catch {
      toast.error("تعذر إنشاء التقرير، حاول مرة أخرى");
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="space-y-5">
      {/* شريط أيام الأرشيف */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {dayKeys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSelectedDay(k)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              selectedDay === k
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {dayLabel(k, today)}
          </button>
        ))}
      </div>

      <MoodCard mood={mood} />

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="رأس المال" value={summary.capital} tone="amber" icon={Wallet} />
        <StatCard label="إجمالي المبيعات" value={summary.salesTotal} tone="emerald" icon={Coins} />
        <StatCard
          label={summary.profit >= 0 ? "الربح" : "الخسارة"}
          value={Math.abs(summary.profit)}
          tone={summary.profit >= 0 ? "emerald" : "rose"}
          icon={Sparkles}
        />
        <StatCard label="إجمالي المصاريف" value={summary.expensesTotal} tone="sky" icon={Receipt} />
      </div>


      <Button className="w-full gap-2 rounded-2xl" variant="outline" onClick={exportPdf} disabled={exporting}>
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        مشاركة تقرير {isToday ? "اليوم" : dayLabel(selectedDay, today)} (PDF)
      </Button>

      {/* الشروات */}
      <Block
        icon={Package}
        title="الشروة (المشتريات)"
        onAdd={isToday ? () => setPurchaseDialog("new") : undefined}
        addLabel="إضافة شروة"
      >
        {summary.costs.length === 0 && <Empty text={`لا توجد شروات ${isToday ? "اليوم" : "في هذا اليوم"}`} />}
        {summary.costs.map((c) => (
          <Row
            key={c.purchase.id}
            title={c.purchase.kind}
            subtitle={`${c.purchase.bundles} علاقة · السعر الحقيقي ${formatAmount(Math.round(c.realPerBundle))}${c.purchase.note ? " · " + c.purchase.note : ""}`}
            amount={c.purchase.amount}
            onEdit={isToday ? () => setPurchaseDialog(c.purchase) : undefined}
            onDelete={
              isToday
                ? () => setConfirmDelete({ kind: "purchases", id: c.purchase.id, label: c.purchase.kind })
                : undefined
            }
          />
        ))}
      </Block>

      {/* المصاريف */}
      <Block
        icon={Receipt}
        title="المصاريف"
        onAdd={isToday ? () => setExpenseDialog("new") : undefined}
        addLabel="إضافة مصروف"
      >
        {expenses.length === 0 && <Empty text={`لا توجد مصاريف ${isToday ? "اليوم" : "في هذا اليوم"}`} />}
        {expenses.map((e) => (
          <Row
            key={e.id}
            title={expenseLabel[e.kind]}
            subtitle={e.note ?? ""}
            amount={e.amount}
            onEdit={isToday ? () => setExpenseDialog(e) : undefined}
            onDelete={
              isToday
                ? () => setConfirmDelete({ kind: "expenses", id: e.id, label: expenseLabel[e.kind] })
                : undefined
            }
          />
        ))}
      </Block>

      {/* حركة البيع النقدي */}
      <Block
        icon={Coins}
        title="البيع النقدي"
        onAdd={isToday ? () => setCashDialog("new") : undefined}
        addLabel="إضافة بيع نقدي"
      >
        {cashSales.length === 0 && <Empty text={`لا توجد مبيعات نقدية ${isToday ? "اليوم" : "في هذا اليوم"}`} />}
        {cashSales.map((c) => (
          <Row
            key={c.id}
            title="بيع نقدي"
            subtitle={c.note ?? ""}
            amount={c.amount}
            onEdit={isToday ? () => setCashDialog(c) : undefined}
            onDelete={isToday ? () => setConfirmDelete({ kind: "cashSales", id: c.id, label: "بيع نقدي" }) : undefined}
          />
        ))}
      </Block>

      {/* الملخص */}
      <div className="space-y-1.5 rounded-2xl border bg-muted/30 p-4">
        <p className="mb-2 flex items-center gap-2 font-semibold">
          <Layers className="h-4 w-4 text-muted-foreground" /> الملخص
        </p>
        <SummaryLine label="بيع دين (تلقائي)" value={summary.debtSales} />
        <SummaryLine label="جيب (تلقائي)" value={summary.pocketSales} />
        <SummaryLine label="بيع نقدي" value={summary.cashSales} />
        <div className="my-1.5 border-t" />
        <SummaryLine label="إجمالي البيع" value={summary.salesTotal} bold />
        <SummaryLine label="رأس المال" value={summary.capital} bold />
        <div className="my-1.5 border-t" />
        <SummaryLine
          label={summary.profit >= 0 ? "الربح" : "الخسارة"}
          value={Math.abs(summary.profit)}
          bold
          tone={summary.profit >= 0 ? "emerald" : "rose"}
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        يتم الاحتفاظ ببيانات الضمار والمصاريف لمدة 7 أيام
      </p>

      {/* حوارات الإضافة/التعديل */}
      <PurchaseDialog
        value={purchaseDialog}
        onClose={() => setPurchaseDialog(null)}
        onSave={(p) => {
          const exists = data.purchases.some((x) => x.id === p.id);
          update({
            ...data,
            purchases: exists
              ? data.purchases.map((x) => (x.id === p.id ? p : x))
              : [p, ...data.purchases],
          });
          toast.success(exists ? "تم حفظ التعديل" : "تمت إضافة الشروة");
          setPurchaseDialog(null);
        }}
      />

      <ExpenseDialog
        value={expenseDialog}
        onClose={() => setExpenseDialog(null)}
        onSave={(e) => {
          const exists = data.expenses.some((x) => x.id === e.id);
          update({
            ...data,
            expenses: exists
              ? data.expenses.map((x) => (x.id === e.id ? e : x))
              : [e, ...data.expenses],
          });
          toast.success(exists ? "تم حفظ التعديل" : "تمت إضافة المصروف");
          setExpenseDialog(null);
        }}
      />

      <CashDialog
        value={cashDialog}
        onClose={() => setCashDialog(null)}
        onSave={(c) => {
          const exists = data.cashSales.some((x) => x.id === c.id);
          update({
            ...data,
            cashSales: exists
              ? data.cashSales.map((x) => (x.id === c.id ? c : x))
              : [c, ...data.cashSales],
          });
          toast.success(exists ? "تم حفظ التعديل" : "تمت إضافة البيع النقدي");
          setCashDialog(null);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف «{confirmDelete?.label}»؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDelete) return;
                const { kind, id } = confirmDelete;
                update({
                  ...data,
                  [kind]: (data[kind] as { id: string }[]).filter((x) => x.id !== id),
                } as QatData);
                toast.success("تم الحذف");
                setConfirmDelete(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- بطاقات إحصائية ---------------- */

const TONE_CLASSES: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
};

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose" | "sky";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className={cn("rounded-2xl border", TONE_CLASSES[tone])}>
      <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
        <Icon className="h-4 w-4 opacity-70" />
        <p className="text-xs opacity-80">{label}</p>
        <p className="text-lg font-bold tabular-nums">{formatAmount(value)}</p>
      </CardContent>
    </Card>
  );
}

function Block({
  icon: Icon,
  title,
  children,
  onAdd,
  addLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </p>
        {onAdd ? (
          <Button size="sm" className="gap-1 rounded-full" onClick={onAdd}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
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
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-muted/20 p-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle ? (
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <span className="font-bold tabular-nums">{formatAmount(amount)}</span>
      {onEdit ? (
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="تعديل">
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="حذف">
          <Trash2 className="h-4 w-4 text-rose-600" />
        </Button>
      ) : null}
    </div>
  );
}

function SummaryLine({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: "emerald" | "rose";
}) {
  return (
    <p className="flex items-center justify-between text-sm">
      <span className={cn(bold && "font-semibold")}>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "font-bold text-base" : "font-medium",
          tone === "emerald" && "text-emerald-600",
          tone === "rose" && "text-rose-600",
        )}
      >
        {formatAmount(value)}
      </span>
    </p>
  );
}

/* ---------------- بطاقة النتيجة التحفيزية ---------------- */

const MOOD_TONE: Record<Mood["tone"], { card: string; badge: string }> = {
  fire: {
    card: "bg-emerald-50 border-emerald-300 text-emerald-900",
    badge: "bg-emerald-600/10",
  },
  great: {
    card: "bg-emerald-50 border-emerald-200 text-emerald-800",
    badge: "bg-emerald-600/10",
  },
  good: {
    card: "bg-sky-50 border-sky-200 text-sky-800",
    badge: "bg-sky-600/10",
  },
  flat: {
    card: "bg-slate-50 border-slate-200 text-slate-700",
    badge: "bg-slate-500/10",
  },
  loss: {
    card: "bg-rose-50 border-rose-200 text-rose-800",
    badge: "bg-rose-600/10",
  },
};

/** بطاقة تحفيزية فقط — لا تُعرض أي نسبة ربح */
function MoodCard({ mood }: { mood: Mood }) {
  const t = MOOD_TONE[mood.tone];
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-4", t.card)}>
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl", t.badge)}>
        {mood.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{mood.title}</p>
        <p className="text-xs opacity-90">{mood.text}</p>
      </div>
    </div>
  );
}


/* ---------------- حقل بأيقونة ---------------- */

function IconField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </Label>
      {children}
    </div>
  );
}


function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-4 top-4 flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      <ArrowRight className="h-4 w-4" /> رجوع
    </button>
  );
}

/* ---------------- حوار الشروة ---------------- */

function PurchaseDialog({
  value,
  onClose,
  onSave,
}: {
  value: Purchase | null | "new";
  onClose: () => void;
  onSave: (p: Purchase) => void;
}) {
  const open = value !== null;
  const editing = value && value !== "new" ? value : null;
  const [kind, setKind] = useState("");
  const [amount, setAmount] = useState("");
  const [bundles, setBundles] = useState("");
  const [note, setNote] = useState("");

  useMemo(() => {
    if (editing) {
      setKind(editing.kind);
      setAmount(String(editing.amount));
      setBundles(String(editing.bundles));
      setNote(editing.note ?? "");
    } else if (value === "new") {
      setKind("");
      setAmount("");
      setBundles("");
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const perBundle =
    Number(amount) > 0 && Number(bundles) > 0 ? Number(amount) / Number(bundles) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
        <BackButton onClick={onClose} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> {editing ? "تعديل الشروة" : "إضافة شروة"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <IconField icon={Layers} label="النوع">
            <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="مثال: شامي" />
          </IconField>
          <div className="grid grid-cols-2 gap-2">
            <IconField icon={Wallet} label="مبلغ الشراء">
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </IconField>
            <IconField icon={Package} label="عدد العلاقي">
              <Input
                inputMode="decimal"
                value={bundles}
                onChange={(e) => setBundles(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </IconField>
          </div>
          <IconField icon={StickyNote} label="ملاحظة">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </IconField>
          {perBundle > 0 && (
            <p className="rounded-xl bg-muted/50 p-2 text-center text-xs text-muted-foreground">
              سعر العلاقة قبل المصاريف: {formatAmount(Math.round(perBundle))}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            className="w-full gap-1 rounded-2xl"
            onClick={() => {
              if (!kind.trim() || !Number(amount) || !Number(bundles)) {
                toast.error("أدخل النوع والمبلغ وعدد العلاقي");
                return;
              }
              onSave({
                id: editing?.id ?? newQatId(),
                date: editing?.date ?? new Date().toISOString(),
                kind: kind.trim(),
                amount: Number(amount),
                bundles: Number(bundles),
                note: note.trim() || undefined,
              });
            }}
          >
            <Plus className="h-4 w-4" /> {editing ? "حفظ التعديل" : "إضافة الشروة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- حوار المصروف ---------------- */

const EXPENSE_KINDS: { value: ExpenseKind; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "shipping", label: "شحن", icon: Truck },
  { value: "tax", label: "ضريبة", icon: BadgePercent },
  { value: "other", label: "أخرى", icon: StickyNote },
];

function ExpenseDialog({
  value,
  onClose,
  onSave,
}: {
  value: Expense | null | "new";
  onClose: () => void;
  onSave: (e: Expense) => void;
}) {
  const open = value !== null;
  const editing = value && value !== "new" ? value : null;
  const [kind, setKind] = useState<ExpenseKind>("shipping");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useMemo(() => {
    if (editing) {
      setKind(editing.kind);
      setAmount(String(editing.amount));
      setNote(editing.note ?? "");
    } else if (value === "new") {
      setKind("shipping");
      setAmount("");
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
        <BackButton onClick={onClose} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> {editing ? "تعديل المصروف" : "إضافة مصروف"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">النوع</Label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition",
                    kind === k.value
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  <k.icon className="h-4 w-4" />
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <IconField icon={Wallet} label="المبلغ">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </IconField>
          <IconField icon={StickyNote} label="ملاحظة">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </IconField>
        </div>
        <DialogFooter>
          <Button
            className="w-full gap-1 rounded-2xl"
            onClick={() => {
              if (!Number(amount)) {
                toast.error("أدخل المبلغ");
                return;
              }
              onSave({
                id: editing?.id ?? newQatId(),
                date: editing?.date ?? new Date().toISOString(),
                kind,
                amount: Number(amount),
                note: note.trim() || undefined,
              });
            }}
          >
            <Plus className="h-4 w-4" /> {editing ? "حفظ التعديل" : "إضافة المصروف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- حوار البيع النقدي ---------------- */

function CashDialog({
  value,
  onClose,
  onSave,
}: {
  value: CashSale | null | "new";
  onClose: () => void;
  onSave: (c: CashSale) => void;
}) {
  const open = value !== null;
  const editing = value && value !== "new" ? value : null;
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useMemo(() => {
    if (editing) {
      setAmount(String(editing.amount));
      setNote(editing.note ?? "");
    } else if (value === "new") {
      setAmount("");
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl [&>button]:hidden">
        <BackButton onClick={onClose} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" /> {editing ? "تعديل البيع النقدي" : "إضافة بيع نقدي"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <IconField icon={Wallet} label="المبلغ">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </IconField>
          <IconField icon={StickyNote} label="ملاحظة">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </IconField>
        </div>
        <DialogFooter>
          <Button
            className="w-full gap-1 rounded-2xl"
            onClick={() => {
              if (!Number(amount)) {
                toast.error("أدخل المبلغ");
                return;
              }
              onSave({
                id: editing?.id ?? newQatId(),
                date: editing?.date ?? new Date().toISOString(),
                amount: Number(amount),
                note: note.trim() || undefined,
              });
            }}
          >
            <Plus className="h-4 w-4" /> {editing ? "حفظ التعديل" : "إضافة البيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
