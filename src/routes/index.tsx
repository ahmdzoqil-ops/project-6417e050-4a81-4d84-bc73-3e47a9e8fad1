import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Mic,
  Plus,
  Search,
  Pencil,
  Trash2,
  Wallet,
  HandCoins,
  Home,
  Square,
  Loader2,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
import {
  loadAll,
  saveAll,
  pruneOld,
  newId,
  isToday,
  loadCustomers,
  saveCustomers,
  loadProfile,
  type Customer,
  type Profile,
  type Transaction,
  type TxType,
} from "@/lib/storage";
import { formatAmount, formatDate, formatTime } from "@/lib/format";
import {
  dailyDebts,
  matchesQuery,
  dailyDebtTotal,
  paymentTotalToday,
  pocketTotal,
  syncAutoCustomers,
} from "@/lib/derive";
import { AppMenu } from "@/components/AppMenu";
import { NameSuggest } from "@/components/NameSuggest";
import { AddDialog } from "@/components/AddDialog";
import { PaymentSection } from "@/components/PaymentSection";
import { transcribeAudio } from "@/lib/transcribe.functions";
import { isNativeApp, transcribeViaRemote } from "@/lib/transcribeRemote";
import {
  ensureSpeechPermission,
  isNativeSpeechAvailable,
  startNativeListening,
} from "@/lib/nativeSpeech";

import { parseArabicVoice } from "@/lib/parseArabicVoice";

export const Route = createFileRoute("/")({
  component: App,
});

type NewTx = Omit<Transaction, "id" | "date">;

function App() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<Profile>({});
  const [tab, setTab] = useState("home");
  const [hydrated, setHydrated] = useState(false);
  const [adding, setAdding] = useState(false);


  const reload = () => {
    const pruned = pruneOld(loadAll());
    const sync = syncAutoCustomers(pruned, loadCustomers());
    saveAll(sync.items);
    if (sync.changed) saveCustomers(sync.customers);
    setItems(sync.items);
    setCustomers(sync.customers);
    setProfile(loadProfile());
  };

  useEffect(() => {
    reload();
    setHydrated(true);
    // بداية يوم جديد: إعادة الفحص عند العودة للتطبيق لتصفير اليوم السابق
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const persist = (next: Transaction[]) => {
    const pruned = pruneOld(next);
    const sync = syncAutoCustomers(pruned, loadCustomers());
    saveAll(sync.items);
    if (sync.changed) {
      saveCustomers(sync.customers);
      setCustomers(sync.customers);
    }
    setItems(sync.items);
  };

  const totals = useMemo(
    () => ({
      debt: dailyDebtTotal(items),
      pocket: pocketTotal(items),
      payment: paymentTotalToday(items),
    }),
    [items],
  );

  const addTx = (t: NewTx) => {
    persist([{ ...t, id: newId(), date: new Date().toISOString() }, ...items]);
  };
  const updateTx = (id: string, patch: Partial<Transaction>) => {
    persist(items.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };
  const deleteTx = (id: string) => {
    persist(items.filter((t) => t.id !== id));
  };
  const addCustomer = (c: Customer) => {
    const next = [...customers, c];
    saveCustomers(next);
    setCustomers(next);
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Toaster position="top-center" richColors dir="rtl" />
      <div className="mx-auto w-full max-w-md px-4 pb-32 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <AppMenu
            items={items}
            customers={customers}
            profile={profile}
            onProfileChange={setProfile}
            onAddCustomer={addCustomer}
            onAddTx={addTx}
            onReloaded={reload}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">دينك بصوتك</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {profile.shopName || "إدارة الديون والجيب — محليًا على جهازك"}
            </p>
          </div>
          <div className="w-9" />
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="home" className="gap-1 px-1 text-[11px]">
              <Home className="h-4 w-4" /> الرئيسية
            </TabsTrigger>
            <TabsTrigger value="debt" className="gap-1 px-1 text-[11px]">
              <HandCoins className="h-4 w-4" /> الديون
            </TabsTrigger>
            <TabsTrigger value="pocket" className="gap-1 px-1 text-[11px]">
              <Wallet className="h-4 w-4" /> الجيب
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-1 px-1 text-[11px]">
              <Banknote className="h-4 w-4" /> السداد
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-4">
            <HomeTab
              items={items}
              customers={customers}
              totals={totals}
              onAdd={(payload) => {
                addTx(payload);
                toast.success("تم حفظ العملية");
              }}
            />
          </TabsContent>

          <TabsContent value="debt" className="mt-4">
            <LogTab
              type="debt"
              items={dailyDebts(items)}
              onUpdate={updateTx}
              onDelete={deleteTx}
              onToggleDelivered={(t) =>
                updateTx(t.id, { delivered: !t.delivered })
              }
            />
          </TabsContent>

          <TabsContent value="pocket" className="mt-4">
            <LogTab
              type="pocket"
              items={items.filter((t) => t.type === "pocket")}
              onUpdate={updateTx}
              onDelete={deleteTx}
            />
          </TabsContent>

          <TabsContent value="payment" className="mt-4">
            <PaymentSection
              items={items}
              onUpdate={updateTx}
              onDelete={deleteTx}
            />
          </TabsContent>
        </Tabs>
      </div>

      <button
        type="button"
        aria-label="إضافة عملية"
        onClick={() => setAdding(true)}
        className="fixed bottom-6 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform active:scale-95"
      >
        <Plus className="h-8 w-8" />
      </button>

      <AddDialog
        open={adding}
        onOpenChange={setAdding}
        items={items}
        customers={customers}
        onSave={addTx}
      />
    </div>
  );
}

function HomeTab({
  items,
  customers,
  totals,
  onAdd,
}: {
  items: Transaction[];
  customers: Customer[];
  totals: { debt: number; pocket: number; payment: number };
  onAdd: (t: NewTx) => void;
}) {
  const [query, setQuery] = useState("");

  const todays = useMemo(
    () =>
      items
        .filter((t) => isToday(t.date))
        .sort((a, z) => z.date.localeCompare(a.date)),
    [items],
  );

  const filteredToday = useMemo(
    () => todays.filter((t) => matchesQuery(t.name, query)),
    [todays, query],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <TotalCard label="دين اليوم" amount={totals.debt} tone="debt" />
        <TotalCard label="الجيب" amount={totals.pocket} tone="pocket" />
        <TotalCard label="سداد اليوم" amount={totals.payment} tone="payment" />
      </div>

      <VoicePanel customers={customers} items={items} onAdd={onAdd} />

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم العميل…"
          className="pr-9"
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          معاملات اليوم
        </h2>
        {filteredToday.length === 0 ? (
          <EmptyState text="لا توجد عمليات اليوم" />
        ) : (
          <ul className="space-y-2">
            {filteredToday.map((t) => (
              <TxRow key={t.id} tx={t} />
            ))}
          </ul>
        )}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          يبدأ يوم جديد تلقائيًا: يُصفَّر الجيب والدين اليومي والسداد اليومي —
          والسجل الكامل داخل القائمة العلوية.
        </p>
      </section>
    </div>
  );
}

const TONES: Record<
  TxType,
  { card: string; label: string; value: string; dot: string }
> = {
  debt: {
    card: "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30",
    label: "text-rose-700 dark:text-rose-300",
    value: "text-rose-800 dark:text-rose-200",
    dot: "bg-rose-500",
  },
  pocket: {
    card: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  payment: {
    card: "border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/30",
    label: "text-sky-700 dark:text-sky-300",
    value: "text-sky-800 dark:text-sky-200",
    dot: "bg-sky-500",
  },
};

function TotalCard({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: TxType;
}) {
  const c = TONES[tone];
  return (
    <Card className={c.card}>
      <CardContent className="px-3 py-4">
        <p className={"text-[11px] font-medium " + c.label}>{label}</p>
        <p className={"mt-1 text-xl font-bold tabular-nums " + c.value}>
          {formatAmount(amount)}
        </p>
      </CardContent>
    </Card>
  );
}

function TxRow({
  tx,
  actions,
}: {
  tx: Transaction;
  actions?: React.ReactNode;
}) {
  const c = TONES[tx.type];
  return (
    <li className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2">
          <span className={"inline-block h-2 w-2 rounded-full " + c.dot} />
          <span className="truncate font-medium">{tx.name}</span>
        </div>
        <span className="mt-0.5 text-[11px] text-muted-foreground">
          {isToday(tx.date) ? formatTime(tx.date) : formatDate(tx.date)}
          {tx.type === "debt"
            ? " • دين"
            : tx.type === "pocket"
              ? " • جيب"
              : " • سداد"}
          {tx.note ? ` • ${tx.note}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={
            "text-sm font-bold tabular-nums " +
            (tx.type === "debt"
              ? "text-rose-600"
              : tx.type === "pocket"
                ? "text-emerald-600"
                : "text-sky-600")
          }
        >
          {formatAmount(tx.amount)}
        </span>
        {actions}
      </div>
    </li>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function LogTab({
  type,
  items,
  onUpdate,
  onDelete,
  onToggleDelivered,
}: {
  type: TxType;
  items: Transaction[];
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  onToggleDelivered?: (t: Transaction) => void;
}) {
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

  const sorted = useMemo(
    () =>
      [...items].sort((a, z) => {
        const d = Number(!!a.delivered) - Number(!!z.delivered);
        return d !== 0 ? d : z.date.localeCompare(a.date);
      }),
    [items],
  );
  const total = sorted
    .filter((t) => !t.delivered)
    .reduce((s, t) => s + t.amount, 0);
  const deliveredTotal = sorted
    .filter((t) => t.delivered)
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-3">
      <TotalCard
        label={type === "debt" ? "دين اليوم (المتبقي)" : "إجمالي الجيب"}
        amount={total}
        tone={type}
      />
      {type === "debt" && deliveredTotal > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          تم تسليم: {formatAmount(deliveredTotal)} — يُحذف تلقائيًا مع بداية يوم
          جديد
        </p>
      )}
      {sorted.length === 0 ? (
        <EmptyState
          text={type === "debt" ? "لا توجد ديون اليوم" : "لا توجد عمليات جيب"}
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) => (
            <div key={t.id} className={t.delivered ? "opacity-60" : ""}>
              <TxRow
                tx={t}
                actions={
                  <div className="flex items-center gap-1">
                    {onToggleDelivered && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onToggleDelivered(t)}
                        aria-label={t.delivered ? "إلغاء التسليم" : "تم التسليم"}
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
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(t)}
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
                }
              />
            </div>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل العملية</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">اسم العميل</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">المبلغ</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">ملاحظة (اختياري)</Label>
              <Textarea
                id="edit-note"
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
                if (!trimmed) {
                  toast.error("الرجاء إدخال اسم العميل");
                  return;
                }
                if (!Number.isFinite(n) || n <= 0) {
                  toast.error("الرجاء إدخال مبلغ صحيح أكبر من صفر");
                  return;
                }
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
              هل تريد بالتأكيد حذف عملية «{confirming?.name}» بمبلغ{" "}
              {confirming ? formatAmount(confirming.amount) : ""}؟ لا يمكن
              التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirming) {
                  onDelete(confirming.id);
                  toast.success("تم الحذف");
                }
                setConfirming(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type PendingVoice = {
  type: "debt" | "pocket";
  name: string;
  amount: string;
  rawText: string;
  note: string;
  customerId?: string;
};

function VoicePanel({
  items,
  customers,
  onAdd,
}: {
  items: Transaction[];
  customers: Customer[];
  onAdd: (t: NewTx) => void;
}) {
  const transcribe = useServerFn(transcribeAudio);
  const [state, setState] = useState<"idle" | "recording" | "processing">(
    "idle",
  );
  const [pending, setPending] = useState<PendingVoice | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopNativeRef = useRef<null | (() => Promise<string>)>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => cleanupStream, []);

  const handleText = (text: string) => {
    if (!text) {
      toast.error("لم يتم الفهم. حاول مرة أخرى بوضوح");
      setState("idle");
      return;
    }
    const parsed = parseArabicVoice(text);
    setPending({
      type: parsed.type === "pocket" ? "pocket" : "debt",
      name: parsed.name,
      amount: parsed.amount != null ? String(parsed.amount) : "",
      rawText: text,
      note: "",
    });
    setState("idle");
  };

  // مسار أندرويد: محرك التعرف على الكلام داخل الجهاز (بدون إنترنت)
  const startNative = async () => {
    try {
      const ok = await ensureSpeechPermission();
      if (!ok) {
        toast.error("تم رفض إذن الميكروفون. فعّل الإذن وحاول مرة أخرى");
        return;
      }
      if (!(await isNativeSpeechAvailable())) {
        toast.error("محرك التعرف على الكلام غير متوفر على هذا الجهاز", {
          description:
            "ثبّت تطبيق Google وحمّل حزمة اللغة العربية للاستخدام دون اتصال.",
          duration: 10000,
        });
        return;
      }
      stopNativeRef.current = await startNativeListening();
      setState("recording");
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      toast.error("تعذّر بدء التعرف على الكلام", {
        description: detail.slice(0, 300),
        duration: 10000,
      });
      setState("idle");
    }
  };

  const stopNative = async () => {
    const stopFn = stopNativeRef.current;
    stopNativeRef.current = null;
    setState("processing");
    try {
      const text = stopFn ? (await stopFn()).trim() : "";
      handleText(text);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      toast.error("تعذّر تحويل الصوت", {
        description: detail.slice(0, 300),
        duration: 10000,
      });
      setState("idle");
    }
  };

  const start = async () => {
    if (state !== "idle") return;
    if (isNativeApp()) {
      await startNative();
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      toast.error("المتصفح لا يدعم تسجيل الصوت");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("تم رفض إذن الميكروفون. فعّل الإذن وحاول مرة أخرى");
      return;
    }
    streamRef.current = stream;

    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
    ];
    const mime =
      mimeCandidates.find(
        (m) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported?.(m),
      ) ?? "";
    const rec = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    recorderRef.current = rec;
    chunksRef.current = [];

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const blobType = rec.mimeType || mime || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: blobType });
      cleanupStream();
      if (blob.size < 1200) {
        setState("idle");
        toast.error("لم يتم سماع صوت. حاول مرة أخرى");
        return;
      }
      setState("processing");
      try {
        const base64 = await blobToBase64(blob);
        // في تطبيق أندرويد المستقل لا يوجد خادم محلي، لذا نستخدم نقطة النهاية العامة
        const { text } = isNativeApp()
          ? await transcribeViaRemote(base64, blobType)
          : await transcribe({
              data: { audioBase64: base64, mime: blobType },
            });
        handleText(text ?? "");
      } catch (err) {
        console.error(err);
        const detail = err instanceof Error ? err.message : String(err);
        toast.error("تعذّر تحويل الصوت", {
          description: detail.slice(0, 400),
          duration: 12000,
        });
        setState("idle");
      }
    };
    rec.start();
    setState("recording");
  };

  const stop = () => {
    if (state !== "recording") return;
    if (stopNativeRef.current) {
      void stopNative();
      return;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      cleanupStream();
      setState("idle");
    }
  };

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-6">
          <button
            type="button"
            aria-label={isRecording ? "إيقاف التسجيل" : "اضغط وتكلم"}
            onClick={isRecording ? stop : start}
            disabled={isProcessing}
            className={
              "relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 " +
              (isRecording
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-primary text-primary-foreground") +
              (isProcessing ? " opacity-60" : "")
            }
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <Square className="h-7 w-7 fill-current" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </button>
          <p className="text-sm font-medium text-muted-foreground">
            {isRecording
              ? "جاري الاستماع… اضغط للإيقاف"
              : isProcessing
                ? "جاري تحويل الصوت…"
                : "اضغط وتكلم"}
          </p>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            قل الاسم ثم المبلغ — مثال: «محمد خمسة آلاف»
          </p>
        </CardContent>
      </Card>

      <VoiceConfirmDialog
        pending={pending}
        items={items}
        customers={customers}
        onCancel={() => setPending(null)}
        onSave={(p) => {
          const n = Number(p.amount);
          if (!p.name.trim()) {
            toast.error("الرجاء إدخال اسم العميل");
            return;
          }
          if (!Number.isFinite(n) || n <= 0) {
            toast.error("الرجاء إدخال مبلغ صحيح أكبر من صفر");
            return;
          }
          onAdd({
            type: p.type,
            name: p.name.trim(),
            amount: n,
            note: p.note.trim() || undefined,
            customerId: p.type === "debt" ? p.customerId : undefined,
          });
          setPending(null);
        }}
      />
    </>
  );
}

function VoiceConfirmDialog({
  pending,
  items,
  customers,
  onCancel,
  onSave,
}: {
  pending: PendingVoice | null;
  items: Transaction[];
  customers: Customer[];
  onCancel: () => void;
  onSave: (p: PendingVoice) => void;
}) {
  const [draft, setDraft] = useState<PendingVoice | null>(pending);
  useEffect(() => setDraft(pending), [pending]);

  return (
    <Dialog
      open={!!pending}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تأكيد العملية الصوتية</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="space-y-3">
            <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
              «{draft.rawText}»
            </div>
            <div>
              <Label className="mb-2 block">النوع</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={draft.type === "debt" ? "default" : "outline"}
                  onClick={() => setDraft({ ...draft, type: "debt" })}
                  className={
                    draft.type === "debt" ? "bg-rose-600 hover:bg-rose-700" : ""
                  }
                >
                  <HandCoins className="ml-1 h-4 w-4" /> دين
                </Button>
                <Button
                  type="button"
                  variant={draft.type === "pocket" ? "default" : "outline"}
                  onClick={() =>
                    setDraft({ ...draft, type: "pocket", customerId: undefined })
                  }
                  className={
                    draft.type === "pocket"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : ""
                  }
                >
                  <Wallet className="ml-1 h-4 w-4" /> جيب
                </Button>
              </div>
            </div>
            {draft.type === "debt" ? (
              <NameSuggest
                id="v-name"
                label="اسم العميل"
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
                customers={customers}
                items={items}
                selectedId={draft.customerId}
                onSelectCustomer={(c) =>
                  setDraft({
                    ...draft,
                    customerId: c?.id,
                    name: c ? c.name : draft.name,
                  })
                }
              />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="v-name">الاسم</Label>
                <Input
                  id="v-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="الاسم"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="v-amount">المبلغ</Label>
              <Input
                id="v-amount"
                type="number"
                min="0"
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-note">ملاحظة (اختياري)</Label>
              <Textarea
                id="v-note"
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button onClick={() => draft && onSave(draft)}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
    );
  }
  return btoa(binary);
}
