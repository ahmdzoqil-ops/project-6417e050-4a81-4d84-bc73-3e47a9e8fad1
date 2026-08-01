import { useMemo, useState } from "react";
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
import { Search, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatAmount, formatDate } from "@/lib/format";
import {
  customerBalance,
  newId,
  type Customer,
  type Transaction,
} from "@/lib/storage";
import { matchesQuery } from "@/lib/derive";

type NewTx = Omit<Transaction, "id" | "date">;

export function CustomersSection({
  items,
  customers,
  onAddCustomer,
  onAddTx,
}: {
  items: Transaction[];
  customers: Customer[];
  onAddCustomer: (c: Customer) => void;
  onAddTx: (t: NewTx) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [openCustomer, setOpenCustomer] = useState<Customer | null>(null);

  const filtered = useMemo(
    () => customers.filter((c) => matchesQuery(c.name, query)),
    [customers, query],
  );

  if (openCustomer) {
    return (
      <CustomerStatement
        customer={openCustomer}
        items={items}
        onBack={() => setOpenCustomer(null)}
        onAddTx={onAddTx}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن عميل…"
            className="pr-9"
          />
        </div>
        <Button onClick={() => setAdding(true)} size="icon" aria-label="إضافة عميل">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          لا يوجد عملاء
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const bal = customerBalance(items, c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setOpenCustomer(c)}
                  className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-right shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.phone && (
                      <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                    )}
                  </div>
                  <span
                    className={
                      "text-sm font-bold tabular-nums " +
                      (bal > 0 ? "text-rose-600" : "text-emerald-600")
                    }
                  >
                    {formatAmount(bal)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة عميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="c-name">اسم العميل</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">رقم الهاتف</Label>
              <Input
                id="c-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAdding(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                const n = name.trim();
                if (!n) {
                  toast.error("الرجاء إدخال اسم العميل");
                  return;
                }
                onAddCustomer({
                  id: newId(),
                  name: n,
                  phone: phone.trim() || undefined,
                  createdAt: new Date().toISOString(),
                });
                setName("");
                setPhone("");
                setAdding(false);
                toast.success("تمت إضافة العميل");
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

function CustomerStatement({
  customer,
  items,
  onBack,
  onAddTx,
}: {
  customer: Customer;
  items: Transaction[];
  onBack: () => void;
  onAddTx: (t: NewTx) => void;
}) {
  const [form, setForm] = useState<null | "debt" | "payment">(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const rows = useMemo(
    () =>
      items
        .filter((t) => t.customerId === customer.id)
        .sort((a, z) => z.date.localeCompare(a.date)),
    [items, customer.id],
  );
  const balance = customerBalance(items, customer.id);

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Button>

      <Card>
        <CardContent className="py-4">
          <p className="text-base font-bold">{customer.name}</p>
          {customer.phone && (
            <p className="text-xs text-muted-foreground">{customer.phone}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">الرصيد الحالي</p>
          <p
            className={
              "text-2xl font-bold tabular-nums " +
              (balance > 0 ? "text-rose-600" : "text-emerald-600")
            }
          >
            {formatAmount(balance)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button
          className="bg-rose-600 hover:bg-rose-700"
          onClick={() => setForm("debt")}
        >
          إضافة دين
        </Button>
        <Button
          className="bg-sky-600 hover:bg-sky-700"
          onClick={() => setForm("payment")}
        >
          تسجيل سداد
        </Button>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">كشف الحساب</h3>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            لا توجد حركات
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((t) => (
              <li key={t.id} className="rounded-lg border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(t.date)}
                  </span>
                  <span
                    className={
                      "text-sm font-bold tabular-nums " +
                      (t.type === "debt" ? "text-rose-600" : "text-sky-600")
                    }
                  >
                    {t.type === "debt" ? "دين" : "سداد"} {formatAmount(t.amount)}
                  </span>
                </div>
                {t.note && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {form === "debt" ? "إضافة دين" : "تسجيل سداد"} — {customer.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cs-amount">المبلغ</Label>
              <Input
                id="cs-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-note">ملاحظة (اختياري)</Label>
              <Textarea
                id="cs-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                const n = Number(amount);
                if (!Number.isFinite(n) || n <= 0) {
                  toast.error("الرجاء إدخال مبلغ صحيح");
                  return;
                }
                onAddTx({
                  type: form === "debt" ? "debt" : "payment",
                  name: customer.name,
                  amount: n,
                  note: note.trim() || undefined,
                  customerId: customer.id,
                });
                setAmount("");
                setNote("");
                setForm(null);
                toast.success("تم الحفظ");
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
