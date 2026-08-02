import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Search,
  Plus,
  ArrowRight,
  Pencil,
  Trash2,
  FileDown,
  Camera,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { formatAmount, formatDate } from "@/lib/format";
import {
  customerBalance,
  newId,
  type Customer,
  type Profile,
  type Transaction,
} from "@/lib/storage";
import { matchesQuery } from "@/lib/derive";
import { isLockEnabled } from "@/lib/lock";
import { AuthPrompt } from "@/components/LockScreen";
import { shareCustomerReport } from "@/lib/pdf";

type NewTx = Omit<Transaction, "id" | "date">;

export function CustomersSection({
  items,
  customers,
  profile,
  onAddCustomer,
  onUpdateCustomer,
  onAddTx,
  onUpdateTx,
  onDeleteTx,
}: {
  items: Transaction[];
  customers: Customer[];
  profile: Profile;
  onAddCustomer: (c: Customer) => void;
  onUpdateCustomer: (id: string, patch: Partial<Customer>) => void;
  onAddTx: (t: NewTx) => void;
  onUpdateTx: (id: string, patch: Partial<Transaction>) => void;
  onDeleteTx: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      customers
        .filter((c) => matchesQuery(c.name, query))
        .map((c) => {
          const txs = items.filter((t) => t.customerId === c.id);
          return {
            customer: c,
            balance: customerBalance(items, c.id),
            count: txs.length,
            last: txs.reduce((m, t) => (t.date > m ? t.date : m), ""),
          };
        })
        .sort((a, z) => z.balance - a.balance),
    [customers, items, query],
  );

  const totalOut = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const openCustomer = customers.find((c) => c.id === openId) ?? null;

  if (openCustomer) {
    return (
      <CustomerPage
        customer={openCustomer}
        items={items}
        profile={profile}
        onBack={() => setOpenId(null)}
        onAddTx={onAddTx}
        onUpdateTx={onUpdateTx}
        onDeleteTx={onDeleteTx}
        onUpdateCustomer={onUpdateCustomer}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            إجمالي الحقوق المتبقية ({rows.filter((r) => r.balance > 0.009).length}{" "}
            عميل)
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-800 dark:text-rose-200">
            {formatAmount(totalOut)}
          </p>
        </CardContent>
      </Card>

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

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          لا يوجد عملاء
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.customer.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.customer.id)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-right shadow-sm"
              >
                <Avatar customer={r.customer} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.customer.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.count} عملية • آخر تعامل{" "}
                    {r.last ? formatDate(r.last) : "—"}
                  </p>
                </div>
                <span
                  className={
                    "text-sm font-bold tabular-nums " +
                    (r.balance > 0.009 ? "text-rose-600" : "text-emerald-600")
                  }
                >
                  {formatAmount(r.balance)}
                </span>
              </button>
            </li>
          ))}
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

function Avatar({ customer }: { customer: Customer }) {
  if (customer.photo) {
    return (
      <img
        src={customer.photo}
        alt={customer.name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
      {customer.name.trim().charAt(0)}
    </span>
  );
}

function CustomerPage({
  customer,
  items,
  profile,
  onBack,
  onAddTx,
  onUpdateTx,
  onDeleteTx,
  onUpdateCustomer,
}: {
  customer: Customer;
  items: Transaction[];
  profile: Profile;
  onBack: () => void;
  onAddTx: (t: NewTx) => void;
  onUpdateTx: (id: string, patch: Partial<Transaction>) => void;
  onDeleteTx: (id: string) => void;
  onUpdateCustomer: (id: string, patch: Partial<Customer>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<null | "debt" | "payment">(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [eAmount, setEAmount] = useState("");
  const [eNote, setENote] = useState("");
  const [confirmOne, setConfirmOne] = useState<Transaction | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setEAmount(String(editing.amount));
      setENote(editing.note ?? "");
    }
  }, [editing]);

  const rows = useMemo(
    () =>
      items
        .filter((t) => t.customerId === customer.id)
        .sort((a, z) => z.date.localeCompare(a.date)),
    [items, customer.id],
  );
  const balance = customerBalance(items, customer.id);
  const openCount = rows.filter((t) => t.type === "debt").length;

  const wipeAll = () => {
    for (const t of rows) onDeleteTx(t.id);
    toast.success("تم حذف جميع عمليات العميل");
    onBack();
  };

  const pickPhoto = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      onUpdateCustomer(customer.id, { photo: String(r.result) });
      toast.success("تم تحديث صورة العميل");
    };
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Button>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative">
              <Avatar customer={customer} />
              <span className="absolute -bottom-1 -left-1 rounded-full bg-primary p-1 text-primary-foreground">
                <Camera className="h-3 w-3" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickPhoto(f);
                e.target.value = "";
              }}
            />
            <div className="min-w-0">
              <p className="text-base font-bold">{customer.name}</p>
              {customer.phone && (
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground">الرصيد المتبقي</p>
              <p
                className={
                  "text-2xl font-bold tabular-nums " +
                  (balance > 0.009 ? "text-rose-600" : "text-emerald-600")
                }
              >
                {formatAmount(balance)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">عمليات الدين</p>
              <p className="text-2xl font-bold tabular-nums">{openCount}</p>
            </div>
          </div>
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

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="gap-1"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await shareCustomerReport(customer, items, profile);
            } catch {
              toast.error("تعذر إنشاء التقرير");
            } finally {
              setBusy(false);
            }
          }}
        >
          <FileDown className="h-4 w-4" /> تقرير PDF
        </Button>
        <Button
          variant="outline"
          className="gap-1 text-destructive"
          onClick={() => setConfirmAll(true)}
        >
          <ShieldAlert className="h-4 w-4" /> حذف كل العمليات
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
                  <div className="flex items-center gap-1">
                    <span
                      className={
                        "text-sm font-bold tabular-nums " +
                        (t.type === "debt" ? "text-rose-600" : "text-sky-600")
                      }
                    >
                      {t.type === "debt" ? "دين" : "سداد"} {formatAmount(t.amount)}
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
                      onClick={() => setConfirmOne(t)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {t.note && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{t.note}</p>
                )}
                {!!t.images?.length && (
                  <div className="mt-2 flex gap-2">
                    {t.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="مرفق"
                        className="h-14 w-14 rounded object-cover"
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* إضافة دين/سداد */}
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

      {/* تعديل عملية */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل العملية</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ce-amount">المبلغ</Label>
              <Input
                id="ce-amount"
                type="number"
                min="0"
                step="0.01"
                value={eAmount}
                onChange={(e) => setEAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce-note">ملاحظة</Label>
              <Textarea
                id="ce-note"
                rows={2}
                value={eNote}
                onChange={(e) => setENote(e.target.value)}
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
                const n = Number(eAmount);
                if (!Number.isFinite(n) || n <= 0) {
                  toast.error("الرجاء إدخال مبلغ صحيح");
                  return;
                }
                onUpdateTx(editing.id, {
                  amount: n,
                  note: eNote.trim() || undefined,
                });
                setEditing(null);
                toast.success("تم التحديث");
              }}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmOne}
        onOpenChange={(o) => !o && setConfirmOne(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              حذف عملية بمبلغ {confirmOne ? formatAmount(confirmOne.amount) : ""}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmOne) onDeleteTx(confirmOne.id);
                setConfirmOne(null);
                toast.success("تم الحذف");
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف جميع عمليات العميل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف {rows.length} عملية نهائيًا.
              {isLockEnabled()
                ? " سيُطلب رمز التطبيق أو البصمة للتأكيد."
                : " فعّل قفل التطبيق لحماية هذه العملية."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmAll(false);
                if (isLockEnabled()) setAuthOpen(true);
                else wipeAll();
              }}
            >
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthPrompt
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason="تأكيد حذف جميع العمليات"
        onSuccess={wipeAll}
      />
    </div>
  );
}
