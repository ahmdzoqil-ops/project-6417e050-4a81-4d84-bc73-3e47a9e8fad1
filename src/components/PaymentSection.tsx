import { useEffect, useState } from "react";
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
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatAmount, formatTime } from "@/lib/format";
import { isToday, type Transaction } from "@/lib/storage";

/**
 * قسم السداد: عرض فقط لعمليات سداد اليوم مع تعديل/حذف.
 * الإضافة تتم من زر (+) المركزي أو من كشف حساب العميل.
 */
export function PaymentSection({
  items,
  onUpdate,
  onDelete,
}: {
  items: Transaction[];
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);
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

  const todayPayments = items
    .filter((t) => t.type === "payment" && !t.ledgerOnly && isToday(t.date))
    .sort((a, z) => z.date.localeCompare(a.date));

  const total = todayPayments.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <Card className="border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/30">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
            سداد اليوم
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-sky-800 dark:text-sky-200">
            {formatAmount(total)}
          </p>
        </CardContent>
      </Card>

      {todayPayments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          لا توجد عمليات سداد اليوم — أضفها من زر (+)
        </div>
      ) : (
        <ul className="space-y-2">
          {todayPayments.map((t) => (
            <li key={t.id} className="rounded-lg border bg-card p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold tabular-nums text-sky-600">
                    {formatAmount(t.amount)}
                  </span>
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
                    onClick={() => {
                      onDelete(t.id);
                      toast.success("تم الحذف");
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {formatTime(t.date)}
                {t.cash ? " • نقد" : t.customerId ? " • مرتبط بعميل" : ""}
                {t.note ? ` • ${t.note}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل عملية السداد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pe-name">الاسم</Label>
              <Input id="pe-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-amount">المبلغ</Label>
              <Input
                id="pe-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-note">ملاحظة (اختياري)</Label>
              <Textarea
                id="pe-note"
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
                const n = Number(amount);
                if (!name.trim()) {
                  toast.error("الرجاء إدخال الاسم");
                  return;
                }
                if (!Number.isFinite(n) || n <= 0) {
                  toast.error("الرجاء إدخال مبلغ صحيح أكبر من صفر");
                  return;
                }
                onUpdate(editing.id, {
                  name: name.trim(),
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
    </div>
  );
}
