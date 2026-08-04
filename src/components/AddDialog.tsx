import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { HandCoins, Wallet, Banknote } from "lucide-react";
import { toast } from "sonner";
import { NameSuggest } from "@/components/NameSuggest";
import type { Customer, Transaction, TxType } from "@/lib/storage";

type NewTx = Omit<Transaction, "id" | "date">;

/** نافذة إضافة موحّدة تُفتح من زر (+) المركزي: دين / جيب / سداد */
export function AddDialog({
  open,
  onOpenChange,
  initialType = "debt",
  items,
  customers,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialType?: TxType;
  items: Transaction[];
  customers: Customer[];
  onSave: (t: NewTx) => void;
}) {
  const [type, setType] = useState<TxType>(initialType);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setName("");
      setAmount("");
      setNote("");
      setCustomerId(undefined);
    }
  }, [open, initialType]);

  const submit = () => {
    const trimmed = name.trim();
    const n = Number(amount);
    if (type !== "withdraw" && !trimmed) {
      toast.error("الرجاء إدخال الاسم");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    if (type === "withdraw") {
      onSave({
        type,
        name: trimmed || "سحب نقدي",
        amount: n,
        reason: trimmed || undefined,
        note: note.trim() || undefined,
      });
    } else {
      onSave({
        type,
        name: trimmed,
        amount: n,
        note: note.trim() || undefined,
        customerId: type === "pocket" ? undefined : customerId,
        cash: type === "payment" && !customerId ? true : undefined,
      });
    }
    onOpenChange(false);
    toast.success("تم حفظ العملية");
  };

  const options: {
    value: TxType;
    label: string;
    icon: typeof HandCoins;
    cls: string;
  }[] = [
    {
      value: "debt",
      label: "دين",
      icon: HandCoins,
      cls: "bg-rose-600 hover:bg-rose-700",
    },
    {
      value: "payment",
      label: "سداد",
      icon: Banknote,
      cls: "bg-sky-600 hover:bg-sky-700",
    },
    {
      value: "pocket",
      label: "جيب",
      icon: Wallet,
      cls: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      value: "withdraw",
      label: "سحب نقدي",
      icon: ArrowDownToLine,
      cls: "bg-amber-600 hover:bg-amber-700",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة عملية</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">النوع</Label>
            <div className="grid grid-cols-2 gap-2">
              {options.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  variant={type === o.value ? "default" : "outline"}
                  className={type === o.value ? o.cls : ""}
                  onClick={() => {
                    setType(o.value);
                    if (o.value !== "debt" && o.value !== "payment")
                      setCustomerId(undefined);
                  }}
                >
                  <o.icon className="ml-1 h-4 w-4" /> {o.label}
                </Button>
              ))}
            </div>
          </div>

          {type === "withdraw" ? (
            <div className="space-y-2">
              <Label htmlFor="add-name">السبب (اختياري)</Label>
              <Input
                id="add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: مصروف شخصي / سلفة"
              />
            </div>
          ) : type === "pocket" ? (
            <div className="space-y-2">
              <Label htmlFor="add-name">الاسم</Label>
              <Input
                id="add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: أحمد"
              />
            </div>
          ) : (
            <NameSuggest
              id="add-name"
              label="اسم العميل"
              value={name}
              onChange={setName}
              customers={customers}
              items={items}
              selectedId={customerId}
              onSelectCustomer={(c) => setCustomerId(c?.id)}
              placeholder="مثلاً: أحمد"
            />
          )}


          <div className="space-y-2">
            <Label htmlFor="add-amount">المبلغ</Label>
            <Input
              id="add-amount"
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
            <Label htmlFor="add-note">ملاحظة (اختياري)</Label>
            <Textarea
              id="add-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظة…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={submit}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
