import { useMemo, useRef, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatAmount, formatDate, formatDayLabel, formatTime, txLabel } from "@/lib/format";
import { dayKey, historyItems, type Transaction, type TxType } from "@/lib/storage";
import { matchesQuery } from "@/lib/derive";

type UpdateFn = (id: string, patch: Partial<Transaction>) => void;
type DeleteFn = (id: string) => void;

type HistorySectionProps = {
  items: Transaction[];
  onUpdateTx?: UpdateFn;
  onDeleteTx?: DeleteFn;
};

/** السجل والتقارير: تقارير يومية + بحث في العمليات السابقة */
export function HistorySection({ items, onUpdateTx, onDeleteTx }: HistorySectionProps) {
  const [query, setQuery] = useState("");
  const canEdit = Boolean(onUpdateTx || onDeleteTx);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    return historyItems(items)
      .filter((t) => matchesQuery(t.name, query) || matchesQuery(t.note ?? "", query))
      .sort((a, z) => z.date.localeCompare(a.date))
      .slice(0, 100);
  }, [items, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في العمليات السابقة…"
          className="pr-9"
        />
      </div>

      {canEdit && (
        <p className="text-center text-[11px] text-muted-foreground">
          اضغط مطولًا على أي عملية للتعديل أو الحذف
        </p>
      )}

      {results ? (
        results.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد نتائج
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map((t) => (
              <TxRow key={t.id} t={t} onUpdateTx={onUpdateTx} onDeleteTx={onDeleteTx} showTime />
            ))}
          </ul>
        )
      ) : (
        <DailyReports items={items} onUpdateTx={onUpdateTx} onDeleteTx={onDeleteTx} />
      )}
    </div>
  );
}

function TxRow({
  t,
  onUpdateTx,
  onDeleteTx,
  showTime,
}: {
  t: Transaction;
  onUpdateTx?: UpdateFn;
  onDeleteTx?: DeleteFn;
  showTime?: boolean;
}) {
  const [openActions, setOpenActions] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canEdit = Boolean(onUpdateTx || onDeleteTx);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const startPress = () => {
    if (!canEdit) return;
    clearTimer();
    timer.current = setTimeout(() => setOpenActions(true), 500);
  };

  return (
    <>
      <li
        className="select-none rounded-2xl border bg-card p-3 shadow-sm transition active:scale-[0.99]"
        onPointerDown={startPress}
        onPointerUp={clearTimer}
        onPointerMove={clearTimer}
        onPointerCancel={clearTimer}
        onContextMenu={(e) => {
          if (canEdit) e.preventDefault();
        }}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">{t.name}</span>
          <span
            className={
              "text-sm font-bold tabular-nums " +
              (t.type === "debt" ? "text-rose-600" : "text-sky-600")
            }
          >
            {txLabel[t.type] ?? t.type} {formatAmount(t.amount)}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {showTime ? formatDate(t.date) : formatTime(t.date)}
          {t.delivered ? " • تم التسليم" : ""}
          {t.note ? ` • ${t.note}` : ""}
        </div>
      </li>

      {canEdit && (
        <TxActionsSheet
          open={openActions}
          onOpenChange={setOpenActions}
          t={t}
          onUpdateTx={onUpdateTx}
          onDeleteTx={onDeleteTx}
        />
      )}
    </>
  );
}

function TxActionsSheet({
  open,
  onOpenChange,
  t,
  onUpdateTx,
  onDeleteTx,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: Transaction;
  onUpdateTx?: UpdateFn;
  onDeleteTx?: DeleteFn;
}) {
  const [mode, setMode] = useState<"menu" | "edit" | "delete">("menu");

  const close = () => {
    onOpenChange(false);
    setTimeout(() => setMode("menu"), 200);
  };

  return (
    <>
      <Dialog
        open={open && mode === "menu"}
        onOpenChange={(v) => {
          if (!v) close();
        }}
      >
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {onUpdateTx && (
              <Button className="w-full" variant="secondary" onClick={() => setMode("edit")}>
                تعديل
              </Button>
            )}
            {onDeleteTx && (
              <Button className="w-full" variant="destructive" onClick={() => setMode("delete")}>
                حذف
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {onUpdateTx && (
        <EditTxDialog
          open={open && mode === "edit"}
          onOpenChange={(v) => {
            if (!v) close();
          }}
          t={t}
          onUpdateTx={onUpdateTx}
          onDone={close}
        />
      )}

      {onDeleteTx && (
        <AlertDialog
          open={open && mode === "delete"}
          onOpenChange={(v) => {
            if (!v) close();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف العملية؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف «{t.name}» بمبلغ {formatAmount(t.amount)} نهائيًا.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onDeleteTx(t.id);
                  toast.success("تم حذف العملية");
                  close();
                }}
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

function EditTxDialog({
  open,
  onOpenChange,
  t,
  onUpdateTx,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: Transaction;
  onUpdateTx: UpdateFn;
  onDone: () => void;
}) {
  const [name, setName] = useState(t.name);
  const [amount, setAmount] = useState(String(t.amount));
  const [type, setType] = useState<TxType>(t.type);
  const [note, setNote] = useState(t.note ?? "");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setName(t.name);
          setAmount(String(t.amount));
          setType(t.type);
          setNote(t.note ?? "");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>تعديل العملية</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">الاسم</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">المبلغ</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">النوع</Label>
            <Select value={type} onValueChange={(v) => setType(v as TxType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(txLabel) as TxType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {txLabel[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ملاحظة</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim() || !Number(amount)) {
                toast.error("أدخل الاسم والمبلغ بشكل صحيح");
                return;
              }
              onUpdateTx(t.id, {
                name: name.trim(),
                amount: Number(amount),
                type,
                note: note.trim() || undefined,
              });
              toast.success("تم حفظ التعديل");
              onDone();
            }}
          >
            حفظ التعديل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DailyReports({
  items,
  onUpdateTx,
  onDeleteTx,
}: {
  items: Transaction[];
  onUpdateTx?: UpdateFn;
  onDeleteTx?: DeleteFn;
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const days = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of historyItems(items)) {
      const k = dayKey(t.date);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return [...map.entries()]
      .sort((a, z) => z[0].localeCompare(a[0]))
      .map(([key, list]) => {
        const sorted = [...list].sort((a, z) => z.date.localeCompare(a.date));
        let debt = 0;
        let payment = 0;
        for (const t of sorted) {
          if (t.type === "debt") debt += t.amount;
          else if (t.type === "payment") payment += t.amount;
        }
        return { key, list: sorted, debt, payment, count: sorted.length };
      });
  }, [items]);

  const pocketToday = items
    .filter((t) => t.type === "pocket")
    .reduce((s, t) => s + t.amount, 0);

  if (openDay) {
    const day = days.find((d) => d.key === openDay);
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setOpenDay(null)}>
          رجوع
        </Button>
        <h3 className="text-sm font-semibold">{formatDayLabel(openDay)}</h3>
        <DayReport
          debt={day?.debt ?? 0}
          payment={day?.payment ?? 0}
          pocket={formatDayLabel(openDay) === "اليوم" ? pocketToday : 0}
          count={day?.count ?? 0}
        />
        <ul className="space-y-2">
          {(day?.list ?? []).map((t) => (
            <TxRow key={t.id} t={t} onUpdateTx={onUpdateTx} onDeleteTx={onDeleteTx} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          لا توجد معاملات محفوظة
        </div>
      ) : (
        <ul className="space-y-2">
          {days.map((d) => (
            <li key={d.key}>
              <button
                type="button"
                onClick={() => setOpenDay(d.key)}
                className="flex w-full items-center justify-between rounded-2xl border bg-card p-3 text-right shadow-sm transition active:scale-[0.99]"
              >
                <div>
                  <p className="font-medium">{formatDayLabel(d.key)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.count} عملية • دين {formatAmount(d.debt)} • سداد{" "}
                    {formatAmount(d.payment)}
                  </p>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-1 text-center text-[11px] text-muted-foreground">
        يتم الاحتفاظ بالمعاملات لمدة 6 أشهر (الجيب والديون المسلَّمة حركة يومية
        فقط)
      </p>
    </div>
  );
}

function DayReport({
  debt,
  payment,
  pocket,
  count,
}: {
  debt: number;
  payment: number;
  pocket: number;
  count: number;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="grid grid-cols-2 gap-3 py-4 text-sm">
        <Stat label="إجمالي الدين" value={formatAmount(debt)} tone="text-rose-600" />
        <Stat label="إجمالي السداد" value={formatAmount(payment)} tone="text-sky-600" />
        <Stat label="إجمالي الجيب" value={formatAmount(pocket)} tone="text-emerald-600" />
        <Stat label="عدد العمليات" value={String(count)} tone="text-foreground" />
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={"text-lg font-bold tabular-nums " + tone}>{value}</p>
    </div>
  );
}
