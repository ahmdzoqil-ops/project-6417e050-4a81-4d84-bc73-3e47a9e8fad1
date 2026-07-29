import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Plus, Search, Pencil, Trash2, Wallet, HandCoins, History, Home, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type Transaction,
  type TxType,
} from "@/lib/storage";
import { transcribeAudio } from "@/lib/transcribe.functions";
import { isNativeApp, transcribeViaRemote } from "@/lib/transcribeRemote";
import { parseArabicVoice } from "@/lib/parseArabicVoice";

export const Route = createFileRoute("/")({
  component: App,
});

function formatAmount(n: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }) +
    " " +
    d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}
function isSameDay(iso: string, ref = new Date()) {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function App() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [tab, setTab] = useState("home");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const pruned = pruneOld(loadAll());
    saveAll(pruned);
    setItems(pruned);
    setHydrated(true);
  }, []);

  const persist = (next: Transaction[]) => {
    const pruned = pruneOld(next);
    saveAll(pruned);
    setItems(pruned);
  };

  const totals = useMemo(() => {
    let debt = 0, pocket = 0;
    for (const t of items) {
      if (t.type === "debt") debt += t.amount;
      else pocket += t.amount;
    }
    return { debt, pocket };
  }, [items]);

  const addTx = (t: Omit<Transaction, "id" | "date">) => {
    persist([{ ...t, id: newId(), date: new Date().toISOString() }, ...items]);
  };
  const updateTx = (id: string, patch: Partial<Transaction>) => {
    persist(items.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };
  const deleteTx = (id: string) => {
    persist(items.filter((t) => t.id !== id));
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <Toaster position="top-center" richColors dir="rtl" />
      <div className="mx-auto w-full max-w-md px-4 pb-32 pt-6">
        <header className="mb-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">دينك بصوتك</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            إدارة الديون والجيب — محليًا على جهازك
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="home" className="gap-1">
              <Home className="h-4 w-4" /> الرئيسية
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-1">
              <Plus className="h-4 w-4" /> إضافة
            </TabsTrigger>
            <TabsTrigger value="debt" className="gap-1">
              <HandCoins className="h-4 w-4" /> الديون
            </TabsTrigger>
            <TabsTrigger value="pocket" className="gap-1">
              <Wallet className="h-4 w-4" /> الجيب
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-4">
            <HomeTab
              items={items}
              totalDebt={totals.debt}
              totalPocket={totals.pocket}
              onAdd={(payload) => {
                addTx(payload);
                toast.success("تم حفظ العملية");
              }}
            />
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            <AddTab
              onSave={(payload) => {
                addTx(payload);
                toast.success("تم حفظ العملية");
                setTab("home");
              }}
            />
          </TabsContent>

          <TabsContent value="debt" className="mt-4">
            <LogTab
              type="debt"
              items={items.filter((t) => t.type === "debt")}
              onUpdate={updateTx}
              onDelete={deleteTx}
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
        </Tabs>
      </div>
    </div>
  );
}

function HomeTab({
  items,
  totalDebt,
  totalPocket,
  onAdd,
}: {
  items: Transaction[];
  totalDebt: number;
  totalPocket: number;
  onAdd: (t: Omit<Transaction, "id" | "date">) => void;
}) {
  const [query, setQuery] = useState("");

  const todays = useMemo(
    () => items.filter((t) => isSameDay(t.date)),
    [items],
  );
  const last7 = items; // items are already pruned to last 7 days

  const filteredToday = useMemo(() => {
    const q = query.trim();
    if (!q) return todays;
    return todays.filter((t) => t.name.includes(q));
  }, [todays, query]);

  const filtered7 = useMemo(() => {
    const q = query.trim();
    if (!q) return last7;
    return last7.filter((t) => t.name.includes(q));
  }, [last7, query]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <TotalCard label="إجمالي الدين" amount={totalDebt} tone="debt" />
        <TotalCard label="إجمالي الجيب" amount={totalPocket} tone="pocket" />
      </div>

      <VoicePanel onAdd={onAdd} />


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
          آخر عمليات اليوم
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
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">
          <History className="h-4 w-4" /> المعاملات الماضية (آخر 7 أيام)
        </h2>
        {filtered7.length === 0 ? (
          <EmptyState text="لا توجد معاملات في الأسبوع الماضي" />
        ) : (
          <ul className="space-y-2">
            {filtered7.map((t) => (
              <TxRow key={t.id} tx={t} />
            ))}
          </ul>
        )}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          يتم حذف المعاملات الأقدم من 7 أيام تلقائيًا
        </p>
      </section>
    </div>
  );
}

function TotalCard({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: TxType;
}) {
  const isDebt = tone === "debt";
  return (
    <Card
      className={
        isDebt
          ? "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
      }
    >
      <CardContent className="py-4">
        <p
          className={
            "text-xs font-medium " +
            (isDebt
              ? "text-rose-700 dark:text-rose-300"
              : "text-emerald-700 dark:text-emerald-300")
          }
        >
          {label}
        </p>
        <p
          className={
            "mt-1 text-2xl font-bold tabular-nums " +
            (isDebt
              ? "text-rose-800 dark:text-rose-200"
              : "text-emerald-800 dark:text-emerald-200")
          }
        >
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
  const isDebt = tx.type === "debt";
  return (
    <li className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-block h-2 w-2 rounded-full " +
              (isDebt ? "bg-rose-500" : "bg-emerald-500")
            }
          />
          <span className="truncate font-medium">{tx.name}</span>
        </div>
        <span className="mt-0.5 text-[11px] text-muted-foreground">
          {formatDate(tx.date)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={
            "text-sm font-bold tabular-nums " +
            (isDebt ? "text-rose-600" : "text-emerald-600")
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

function AddTab({
  onSave,
}: {
  onSave: (t: Omit<Transaction, "id" | "date">) => void;
}) {
  const [type, setType] = useState<TxType>("debt");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const submit = () => {
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
    onSave({ type, name: trimmed, amount: n });
    setName("");
    setAmount("");
    setType("debt");
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div>
          <Label className="mb-2 block">النوع</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === "debt" ? "default" : "outline"}
              onClick={() => setType("debt")}
              className={
                type === "debt"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : ""
              }
            >
              <HandCoins className="ml-1 h-4 w-4" /> دين
            </Button>
            <Button
              type="button"
              variant={type === "pocket" ? "default" : "outline"}
              onClick={() => setType("pocket")}
              className={
                type === "pocket"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              }
            >
              <Wallet className="ml-1 h-4 w-4" /> جيب
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">اسم العميل</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: أحمد"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">المبلغ</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          التاريخ: {new Date().toLocaleDateString("ar-EG")} (يُسجل تلقائيًا)
        </div>

        <Button onClick={submit} className="w-full" size="lg">
          حفظ العملية
        </Button>
      </CardContent>
    </Card>
  );
}

function LogTab({
  type,
  items,
  onUpdate,
  onDelete,
}: {
  type: TxType;
  items: Transaction[];
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setAmount(String(editing.amount));
    }
  }, [editing]);

  const total = items.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-3">
      <TotalCard
        label={type === "debt" ? "إجمالي الدين" : "إجمالي الجيب"}
        amount={total}
        tone={type}
      />
      {items.length === 0 ? (
        <EmptyState
          text={type === "debt" ? "لا توجد ديون مسجلة" : "لا توجد عمليات جيب"}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <TxRow
              key={t.id}
              tx={t}
              actions={
                <div className="flex items-center gap-1">
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
                onUpdate(editing.id, { name: trimmed, amount: n });
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
  type: TxType;
  name: string;
  amount: string;
  rawText: string;
};

function VoicePanel({
  onAdd,
}: {
  onAdd: (t: Omit<Transaction, "id" | "date">) => void;
}) {
  const transcribe = useServerFn(transcribeAudio);
  const [state, setState] = useState<"idle" | "recording" | "processing">(
    "idle",
  );
  const [pending, setPending] = useState<PendingVoice | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => cleanupStream, []);

  const start = async () => {
    if (state !== "idle") return;
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
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
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
        if (!text) {
          toast.error("لم يتم الفهم. حاول مرة أخرى بوضوح");
          setState("idle");
          return;
        }
        const parsed = parseArabicVoice(text);
        setPending({
          type: parsed.type ?? "debt",
          name: parsed.name,
          amount: parsed.amount != null ? String(parsed.amount) : "",
          rawText: text,
        });
        setState("idle");
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
            مثال: «دين أحمد خمسمائة» أو «جيب سعيد ألف وخمسمائة»
          </p>
        </CardContent>
      </Card>

      <VoiceConfirmDialog
        pending={pending}
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
          onAdd({ type: p.type, name: p.name.trim(), amount: n });
          setPending(null);
        }}
      />
    </>
  );
}

function VoiceConfirmDialog({
  pending,
  onCancel,
  onSave,
}: {
  pending: PendingVoice | null;
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
      <DialogContent dir="rtl">
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
                  onClick={() => setDraft({ ...draft, type: "pocket" })}
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
            <div className="space-y-2">
              <Label htmlFor="v-name">اسم العميل</Label>
              <Input
                id="v-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="اسم العميل"
              />
            </div>
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
