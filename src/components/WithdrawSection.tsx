import { useMemo, useState } from "react";
import { ArrowDownToLine, Pencil, Trash2 } from "lucide-react";
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
import { isToday, type Transaction } from "@/lib/storage";
import { formatAmount, formatTime } from "@/lib/format";

type NewTx = Omit<Transaction, "id" | "date">;

/**
 * قسم السحب النقدي: أي مبلغ يخرج من الصندوق ولا يُعتبر دينًا أو سدادًا
 * أو جيبًا أو بيعًا (مصروف شخصي، سلفة، إعطاء مبلغ لشخص…).
 */
export function WithdrawSection({
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  items: Transaction[];
  onAdd: (t: NewTx) => void;
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const rows = useMemo(
    () =>
      items
        .filter((t) => t.type === "withdraw" && isToday(t.date))
        .sort((a, z) => z.date.localeCompare(a.date)),
    [items],
  );
  const total = rows.reduce((s, t) => s + t.amount, 0);

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setReason(t.reason ?? t.name ?? "");
    setAmount(String(t.amount));
    setNote(t.note ?? "");
    setOpen(true);
  };

  const submit = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    const r = reason.trim();
    const patch = {
      name: r || "سحب نقدي",
      amount: n,
      reason: r || undefined,
      note: note.trim() || undefined,
    };
    if (editing) {
      onUpdate(editing.id, patch);
      toast.success("تم تحديث السحب");
    } else {
      onAdd({ type: "withdraw", ...patch });
      toast.success("تم تسجيل السحب النقدي");
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30">
        <CardContent className="flex items-center justify-between px-4 py-5">
          <div>
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
              إجمالي السحب النقدي اليوم
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">
              {formatAmount(total)}
            </p>
          </div>
          <span className="rounded-2xl bg-amber-500/15 p-3">
            <ArrowDownToLine className="h-6 w-6 text-amber-600" />
          </span>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        سجّل سحبًا جديدًا من زر (+) في الأسفل — لا يؤثر السحب النقدي على حسابات
        الديون أو المديونية، ويظهر فقط في ملخص اليوم والتقارير.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          لا توجد عمليات سحب اليوم
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-2xl border bg-card p-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{t.reason || "سحب نقدي"}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {formatTime(t.date)}
                  {t.note ? ` • ${t.note}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-sm font-bold tabular-nums text-amber-600">
                  {formatAmount(t.amount)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEdit(t)}
                  aria-label="تعديل"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setConfirming(t)}
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "تعديل السحب النقدي" : "سحب نقدي جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="w-amount">المبلغ</Label>
              <Input
                id="w-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-reason">السبب (اختياري)</Label>
              <Input
                id="w-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مصروف شخصي / سلفة / إعطاء مبلغ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-note">ملاحظات (اختياري)</Label>
              <Textarea
                id="w-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submit}>حفظ</Button>
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
              هل تريد حذف عملية السحب بمبلغ{" "}
              {confirming ? formatAmount(confirming.amount) : ""}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirming) {
                  onDelete(confirming.id);
                  toast.success("تم الحذف");
                }
                setConfirming(null);
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
