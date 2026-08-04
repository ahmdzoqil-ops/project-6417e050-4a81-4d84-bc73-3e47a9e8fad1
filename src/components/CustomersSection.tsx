import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Phone,
  MessageCircle,
  Contact,
  ImageOff,
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
import { isLockEnabled, biometricVerify } from "@/lib/lock";
import { loadSettings, DAY_PRESETS } from "@/lib/settings";
import { AuthPrompt } from "@/components/LockScreen";
import { shareCustomerReport } from "@/lib/pdf";

type NewTx = Omit<Transaction, "id" | "date">;

/** واجهة Contact Picker API (غير معتمدة رسميًا في TypeScript) */
type ContactPickerNavigator = Navigator & {
  contacts: {
    select: (
      props: string[],
      opts?: { multiple?: boolean },
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

function hasContactPicker(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window
  );
}

async function pickContact(): Promise<{ name?: string; phone?: string } | null> {
  if (!hasContactPicker()) {
    toast.info("اختيار جهات الاتصال غير مدعوم على هذا الجهاز، الرجاء الإدخال يدويًا");
    return null;
  }
  try {
    const nav = navigator as ContactPickerNavigator;
    const res = await nav.contacts.select(["name", "tel"], { multiple: false });
    const c = res?.[0];
    if (!c) return null;
    return {
      name: c.name?.[0],
      phone: c.tel?.[0],
    };
  } catch {
    toast.error("تعذر الوصول إلى جهات الاتصال");
    return null;
  }
}

export function CustomersSection({
  items,
  customers,
  profile,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddTx,
  onUpdateTx,
  onDeleteTx,
}: {
  items: Transaction[];
  customers: Customer[];
  profile: Profile;
  onAddCustomer: (c: Customer) => void;
  onUpdateCustomer: (id: string, patch: Partial<Customer>) => void;
  onDeleteCustomer?: (id: string) => void;
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
        onDeleteCustomer={onDeleteCustomer}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30">
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
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          لا يوجد عملاء
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.customer.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.customer.id)}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-right shadow-sm transition-colors hover:bg-accent/40"
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
                    "rounded-full px-2.5 py-1 text-sm font-bold tabular-nums " +
                    (r.balance > 0.009
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300")
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
              <div className="flex gap-2">
                <Input
                  id="c-phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="استيراد من جهات الاتصال"
                  onClick={async () => {
                    const c = await pickContact();
                    if (!c) return;
                    if (c.name && !name.trim()) setName(c.name);
                    if (c.phone) setPhone(c.phone);
                  }}
                >
                  <Contact className="h-4 w-4" />
                </Button>
              </div>
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

function Avatar({ customer, size = 10 }: { customer: Customer; size?: 10 | 16 }) {
  const cls = size === 16 ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";
  if (customer.photo) {
    return (
      <img
        src={customer.photo}
        alt={customer.name}
        className={`${cls} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`flex ${cls} shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground`}
    >
      {customer.name.trim().charAt(0) || "؟"}
    </span>
  );
}

/** يطلب تأكيد الهوية (بصمة أو PIN) قبل تنفيذ عملية حساسة، حسب إعدادات الحماية */
function useActionGuard() {
  const [authOpen, setAuthOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const guard = (action: () => void) => {
    const settings = loadSettings();
    if (settings.security.actionLock && isLockEnabled()) {
      pending.current = action;
      // نحاول البصمة أولًا إن كانت متاحة، وإلا نعرض نافذة PIN/البصمة الموجودة
      biometricVerify("تأكيد العملية").then((ok) => {
        if (ok) {
          const fn = pending.current;
          pending.current = null;
          fn?.();
        } else {
          setAuthOpen(true);
        }
      });
    } else {
      action();
    }
  };

  const node = (
    <AuthPrompt
      open={authOpen}
      onOpenChange={setAuthOpen}
      reason="تأكيد العملية"
      onSuccess={() => {
        const fn = pending.current;
        pending.current = null;
        fn?.();
      }}
    />
  );

  return { guard, node };
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
  onDeleteCustomer,
}: {
  customer: Customer;
  items: Transaction[];
  profile: Profile;
  onBack: () => void;
  onAddTx: (t: NewTx) => void;
  onUpdateTx: (id: string, patch: Partial<Transaction>) => void;
  onDeleteTx: (id: string) => void;
  onUpdateCustomer: (id: string, patch: Partial<Customer>) => void;
  onDeleteCustomer?: (id: string) => void;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);

  const { guard, node: guardPrompt } = useActionGuard();

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
    toast.success("تم تصفير حساب العميل");
    onBack();
  };

  const removeCustomer = () => {
    for (const t of rows) onDeleteTx(t.id);
    onDeleteCustomer?.(customer.id);
    toast.success("تم حذف العميل");
    onBack();
  };

  if (editingInfo) {
    return (
      <CustomerInfoEditor
        customer={customer}
        onBack={() => setEditingInfo(false)}
        onSave={(patch) => {
          onUpdateCustomer(customer.id, patch);
          toast.success("تم حفظ بيانات العميل");
          setEditingInfo(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Button>

      <Card className="rounded-2xl">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Avatar customer={customer} size={16} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold">{customer.name}</p>
              {customer.phone && (
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setEditingInfo(true)}
            >
              <Pencil className="h-3.5 w-3.5" /> تعديل
            </Button>
          </div>

          {customer.phone && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <a href={`tel:${customer.phone}`}>
                  <Phone className="h-4 w-4" /> اتصال
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-emerald-600"
                asChild
              >
                <a
                  href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> واتساب
                </a>
              </Button>
            </div>
          )}

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

      <Button
        variant="outline"
        className="w-full gap-1"
        disabled={false}
        onClick={async () => {
          try {
            await shareCustomerReport(customer, items, profile);
          } catch {
            toast.error("تعذر إنشاء التقرير");
          }
        }}
      >
        <FileDown className="h-4 w-4" /> تقرير PDF
      </Button>

      <section>
        <h3 className="mb-2 text-sm font-semibold">كشف الحساب</h3>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد حركات
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((t) => (
              <li key={t.id} className="rounded-2xl border bg-card p-3 shadow-sm">
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

      <NotifySettingsCard customer={customer} onUpdateCustomer={onUpdateCustomer} />

      {/* منطقة الخطر */}
      <Card className="rounded-2xl border-destructive/40">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <h3 className="text-sm font-semibold">منطقة الخطر</h3>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="gap-1 text-destructive"
              onClick={() => setConfirmAll(true)}
            >
              <Trash2 className="h-4 w-4" /> تصفير الحساب
            </Button>
            <Button
              variant="outline"
              className="gap-1 text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> حذف العميل
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  ledgerOnly: true,
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
            <AlertDialogTitle>تصفير حساب العميل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف {rows.length} عملية نهائيًا من كشف حساب هذا العميل.
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
                guard(wipeAll);
              }}
            >
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العميل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف بيانات العميل وجميع عملياته ({rows.length}) نهائيًا.
              {isLockEnabled()
                ? " سيُطلب رمز التطبيق أو البصمة للتأكيد."
                : " فعّل قفل التطبيق لحماية هذه العملية."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                guard(removeCustomer);
              }}
            >
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {guardPrompt}
    </div>
  );
}

function CustomerInfoEditor({
  customer,
  onBack,
  onSave,
}: {
  customer: Customer;
  onBack: () => void;
  onSave: (patch: Partial<Customer>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [note, setNote] = useState(customer.note ?? "");
  const [photo, setPhoto] = useState<string | undefined>(customer.photo);

  const pickPhoto = (file: File) => {
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Button>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 py-4">
          <h3 className="text-sm font-semibold">معلومات العميل</h3>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative"
            >
              {photo ? (
                <img
                  src={photo}
                  alt={name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
                  {name.trim().charAt(0) || "؟"}
                </span>
              )}
              <span className="absolute -bottom-1 -left-1 rounded-full bg-primary p-1.5 text-primary-foreground">
                <Camera className="h-3.5 w-3.5" />
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
            {photo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-destructive"
                onClick={() => setPhoto(undefined)}
              >
                <ImageOff className="h-3.5 w-3.5" /> إزالة الصورة
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-name">الاسم</Label>
            <Input id="ci-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-phone">رقم الهاتف</Label>
            <div className="flex gap-2">
              <Input
                id="ci-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="استيراد من جهات الاتصال"
                onClick={async () => {
                  const c = await pickContact();
                  if (!c) return;
                  if (c.name) setName(c.name);
                  if (c.phone) setPhone(c.phone);
                }}
              >
                <Contact className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-note">الملاحظات</Label>
            <Textarea
              id="ci-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              const n = name.trim();
              if (!n) {
                toast.error("الرجاء إدخال اسم العميل");
                return;
              }
              onSave({
                name: n,
                phone: phone.trim() || undefined,
                note: note.trim() || undefined,
                photo,
              });
              onBack();
            }}
          >
            حفظ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotifySettingsCard({
  customer,
  onUpdateCustomer,
}: {
  customer: Customer;
  onUpdateCustomer: (id: string, patch: Partial<Customer>) => void;
}) {
  const isCustom = customer.notifyDays !== undefined && !DAY_PRESETS.includes(customer.notifyDays);
  const [customDays, setCustomDays] = useState(
    isCustom ? String(customer.notifyDays) : "",
  );

  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-4 py-4">
        <h3 className="text-sm font-semibold">إعدادات التنبيه</h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="notify-mute" className="cursor-pointer text-sm font-normal">
            كتم إشعارات هذا العميل
          </Label>
          <Switch
            id="notify-mute"
            checked={!!customer.notifyMuted}
            onCheckedChange={(v) => onUpdateCustomer(customer.id, { notifyMuted: v })}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>عدد أيام التنبيه المخصص</Label>
          <Select
            value={
              customer.notifyDays === undefined
                ? "default"
                : isCustom
                  ? "custom"
                  : String(customer.notifyDays)
            }
            onValueChange={(v) => {
              if (v === "default") {
                onUpdateCustomer(customer.id, { notifyDays: undefined });
              } else if (v === "custom") {
                const n = Number(customDays);
                onUpdateCustomer(customer.id, {
                  notifyDays: Number.isFinite(n) && n > 0 ? n : 1,
                });
              } else {
                onUpdateCustomer(customer.id, { notifyDays: Number(v) });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر عدد الأيام" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">يستخدم الإعداد العام</SelectItem>
              {DAY_PRESETS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  كل {d} أيام
                </SelectItem>
              ))}
              <SelectItem value="custom">مخصص</SelectItem>
            </SelectContent>
          </Select>

          {isCustom && (
            <Input
              type="number"
              min="1"
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) {
                  onUpdateCustomer(customer.id, { notifyDays: n });
                }
              }}
              placeholder="عدد الأيام"
            />
          )}

          {customer.notifyDays === undefined && (
            <p className="text-[11px] text-muted-foreground">
              يستخدم الإعداد العام للتطبيق
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
