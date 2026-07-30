import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { NameSuggest } from "@/components/NameSuggest";
import { formatAmount, formatTime } from "@/lib/format";
import {
  isToday,
  type Customer,
  type Transaction,
} from "@/lib/storage";

type NewTx = Omit<Transaction, "id" | "date">;

/** قسم السداد: سداد دين مرتبط بعميل، أو نقد عابر. إدخال يدوي فقط بدون صوت. */
export function PaymentSection({
  items,
  customers,
  onAdd,
}: {
  items: Transaction[];
  customers: Customer[];
  onAdd: (t: NewTx) => void;
}) {
  const [mode, setMode] = useState<"debt" | "cash">("debt");
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const todayPayments = items.filter(
    (t) => t.type === "payment" && isToday(t.date),
  );
  const total = todayPayments.reduce((s, t) => s + t.amount, 0);

  const submit = () => {
    const trimmed = name.trim();
    const n = Number(amount);
    if (!trimmed) {
      toast.error("الرجاء إدخال الاسم");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    onAdd({
      type: "payment",
      name: trimmed,
      amount: n,
      note: note.trim() || undefined,
      customerId: mode === "debt" ? customerId : undefined,
      cash: mode === "cash" ? true : undefined,
    });
    setName("");
    setAmount("");
    setNote("");
    setCustomerId(undefined);
    toast.success("تم حفظ عملية السداد");
  };

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

      <Card>
        <CardContent className="space-y-4 py-5">
          <div>
            <Label className="mb-2 block">نوع العملية</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "debt" ? "default" : "outline"}
                className={mode === "debt" ? "bg-sky-600 hover:bg-sky-700" : ""}
                onClick={() => setMode("debt")}
              >
                سداد دين
              </Button>
              <Button
                type="button"
                variant={mode === "cash" ? "default" : "outline"}
                className={mode === "cash" ? "bg-sky-600 hover:bg-sky-700" : ""}
                onClick={() => {
                  setMode("cash");
                  setCustomerId(undefined);
                }}
              >
                نقد
              </Button>
            </div>
          </div>

          {mode === "debt" ? (
            <NameSuggest
              id="pay-name"
              label="اسم العميل"
              value={name}
              onChange={setName}
              customers={customers}
              items={items}
              selectedId={customerId}
              onSelectCustomer={(c) => setCustomerId(c?.id)}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cash-name">الاسم</Label>
              <Input
                id="cash-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم الشخص"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pay-amount">المبلغ</Label>
            <Input
              id="pay-amount"
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
            <Label htmlFor="pay-note">ملاحظة (اختياري)</Label>
            <Textarea
              id="pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظة…"
              rows={2}
            />
          </div>

          <Button onClick={submit} className="w-full" size="lg">
            حفظ السداد
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            سداد النقد العابر يُحفظ 24 ساعة فقط، والسداد المرتبط بعميل يُحفظ في
            كشف حسابه.
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold">سداد اليوم</h2>
        {todayPayments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            لا توجد عمليات سداد اليوم
          </div>
        ) : (
          <ul className="space-y-2">
            {todayPayments.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border bg-card p-3 text-sm shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.name}</span>
                  <span className="font-bold tabular-nums text-sky-600">
                    {formatAmount(t.amount)}
                  </span>
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
      </section>
    </div>
  );
}
