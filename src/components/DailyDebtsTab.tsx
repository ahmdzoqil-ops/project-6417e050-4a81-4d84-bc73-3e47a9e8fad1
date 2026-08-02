import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { formatAmount, formatTime } from "@/lib/format";
import { groupDailyDebts } from "@/lib/derive";
import type { Transaction } from "@/lib/storage";

/** تبويب الديون: بطاقة واحدة لكل عميل تجمع عمليات اليوم */
export function DailyDebtsTab({
  items,
  onUpdate,
  onDelete,
}: {
  items: Transaction[];
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}) {
  const groups = useMemo(() => groupDailyDebts(items), [items]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setAmount(String(editing.amount));
      setNote(editing.note ?? "");
    }
  }, [editing]);

  const total = groups.reduce((s, g) => s + g.openTotal, 0);
  const deliveredTotal = groups.reduce(
    (s, g) => s + (g.total - g.openTotal),
    0,
  );

  return (
    <div className="space-y-3">
      <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30">
        <CardContent className="px-3 py-4">
          <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
            دين اليوم (المتبقي)
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-rose-800 dark:text-rose-200">
            {formatAmount(total)}
          </p>
        </CardContent>
      </Card>

      {deliveredTotal > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          تم تسليم: {formatAmount(deliveredTotal)} — يُحذف تلقائيًا مع بداية يوم
          جديد
        </p>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          لا توجد ديون اليوم
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => {
            const open = expanded === g.key;
            return (
              <li
                key={g.key}
                className={
                  "rounded-lg border bg-card shadow-sm " +
                  (g.delivered ? "opacity-60" : "")
                }
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : g.key)}
                  className="flex w-full items-center justify-between p-3 text-right"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{g.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.list.length} عملية • آخر حركة {formatTime(g.lastDate)}
                      {g.delivered ? " • تم التسليم" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-rose-600">
                      {formatAmount(g.total)}
                    </span>
                    {open ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {open && (
                  <ul className="space-y-2 border-t p-3">
                    {g.list.map((t) => (
                      <li
                        key={t.id}
                        className={
                          "flex items-center justify-between rounded-md bg-muted/40 p-2 " +
                          (t.delivered ? "opacity-60" : "")
                        }
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold tabular-nums text-rose-600">
                            {formatAmount(t.amount)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatTime(t.date)}
                            {t.delivered ? " • تم التسليم" : ""}
                            {t.note ? ` • ${t.note}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t.delivered ? "إلغاء التسليم" : "تم التسليم"}
                            onClick={() =>
                              onUpdate(t.id, { delivered: !t.delivered })
                            }
                          >
                            <CheckCircle2
                              className={
                                "h-4 w-4 " +
                                (t.delivered
                                  ? "text-emerald-600"
                                  : "text-muted-foreground")
                              }
                            />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="تعديل"
                            onClick={() => setEditing(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="حذف"
                            onClick={() => setConfirming(t)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل العملية</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dd-name">اسم العميل</Label>
              <Input
                id="dd-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dd-amount">المبلغ</Label>
              <Input
                id="dd-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dd-note">ملاحظة (اختياري)</Label>
              <Textarea
                id="dd-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!editing) return;
                const trimmed = name.trim();
                const n = Number(amount);
                if (!trimmed) return toast.error("الرجاء إدخال اسم العميل");
                if (!Number.isFinite(n) || n <= 0)
                  return toast.error("الرجاء إدخال مبلغ صحيح");
                onUpdate(editing.id, {
                  name: trimmed,
                  amount: n,
                  note: note.trim() || undefined,
                });
                setEditing(null);
                toast.success("تم تحديث العملية");
              }}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              حذف عملية «{confirming?.name}» بمبلغ{" "}
              {confirming ? formatAmount(confirming.amount) : ""}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirming) onDelete(confirming.id);
                setConfirming(null);
                toast.success("تم الحذف");
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
