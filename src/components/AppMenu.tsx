import { useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Menu,
  User,
  Users,
  History,
  DatabaseBackup,
  Info,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { CustomersSection } from "@/components/CustomersSection";
import { HistorySection } from "@/components/HistorySection";
import {
  createBackup,
  restoreBackup,
  saveProfile,
  type Customer,
  type Profile,
  type Transaction,
} from "@/lib/storage";
import { formatDate } from "@/lib/format";

type NewTx = Omit<Transaction, "id" | "date">;
type View = "menu" | "profile" | "customers" | "history" | "backup" | "about";

export function AppMenu({
  items,
  customers,
  profile,
  onProfileChange,
  onAddCustomer,
  onAddTx,
  onReloaded,
}: {
  items: Transaction[];
  customers: Customer[];
  profile: Profile;
  onProfileChange: (p: Profile) => void;
  onAddCustomer: (c: Customer) => void;
  onAddTx: (t: NewTx) => void;
  onReloaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  const titles: Record<View, string> = {
    menu: "القائمة",
    profile: "معلومات المستخدم",
    customers: "العملاء والمديونيات",
    history: "السجل والتقارير",
    backup: "النسخ الاحتياطي",
    about: "معلومات التطبيق",
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setView("menu");
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="القائمة">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" dir="rtl" className="w-[92vw] overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-right">{titles[view]}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8">
          {view !== "menu" && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 gap-1"
              onClick={() => setView("menu")}
            >
              <ArrowRight className="h-4 w-4" /> القائمة
            </Button>
          )}

          {view === "menu" && (
            <ul className="space-y-2">
              <MenuItem icon={User} label="معلومات المستخدم" onClick={() => setView("profile")} />
              <MenuItem icon={Users} label="العملاء والمديونيات" onClick={() => setView("customers")} />
              <MenuItem icon={History} label="السجل والتقارير" onClick={() => setView("history")} />
              <MenuItem icon={DatabaseBackup} label="النسخ الاحتياطي" onClick={() => setView("backup")} />
              <MenuItem icon={Info} label="معلومات التطبيق" onClick={() => setView("about")} />
            </ul>
          )}

          {view === "profile" && (
            <ProfileForm profile={profile} onSave={onProfileChange} />
          )}

          {view === "customers" && (
            <CustomersSection
              items={items}
              customers={customers}
              onAddCustomer={onAddCustomer}
              onAddTx={onAddTx}
            />
          )}

          {view === "history" && (
            <HistorySection items={items} />
          )}

          {view === "backup" && <BackupPanel onReloaded={onReloaded} />}

          {view === "about" && <AboutPanel />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-right shadow-sm"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("حجم الصورة كبير جدًا (الحد 2 ميغابايت)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft({ ...draft, photo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 overflow-hidden rounded-full border bg-muted">
          {draft.photo ? (
            <img src={draft.photo} alt="صورة المستخدم" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          اختيار صورة
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
      </div>

      <Field label="اسم المستخدم" value={draft.userName ?? ""} onChange={(v) => setDraft({ ...draft, userName: v })} />
      <Field label="اسم المحل" value={draft.shopName ?? ""} onChange={(v) => setDraft({ ...draft, shopName: v })} />
      <Field label="رقم الهاتف" value={draft.phone ?? ""} onChange={(v) => setDraft({ ...draft, phone: v })} />
      <Field label="المنطقة" value={draft.area ?? ""} onChange={(v) => setDraft({ ...draft, area: v })} />

      <Button
        className="w-full"
        onClick={() => {
          saveProfile(draft);
          onSave(draft);
          toast.success("تم حفظ المعلومات");
        }}
      >
        حفظ
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function BackupPanel({ onReloaded }: { onReloaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        onClick={() => {
          download(
            `dainak-backup-${stamp}.json`,
            JSON.stringify(createBackup(), null, 2),
            "application/json",
          );
          toast.success("تم إنشاء النسخة الاحتياطية");
        }}
      >
        إنشاء نسخة احتياطية
      </Button>

      <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
        استعادة نسخة
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const res = restoreBackup(JSON.parse(await file.text()));
            if (!res.ok) {
              toast.error(res.error ?? "تعذر الاستعادة");
              return;
            }
            onReloaded();
            toast.success("تمت الاستعادة بنجاح");
          } catch {
            toast.error("ملف غير صالح");
          }
        }}
      />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          const b = createBackup();
          const rows = [
            ["التاريخ", "النوع", "الاسم", "المبلغ", "ملاحظة"].join(","),
            ...b.transactions.map((t) =>
              [
                formatDate(t.date),
                t.type === "debt" ? "دين" : t.type === "payment" ? "سداد" : "جيب",
                `"${t.name.replace(/"/g, '""')}"`,
                t.amount,
                `"${(t.note ?? "").replace(/"/g, '""')}"`,
              ].join(","),
            ),
          ].join("\n");
          download(`dainak-export-${stamp}.csv`, "\uFEFF" + rows, "text/csv");
          toast.success("تم تصدير البيانات");
        }}
      >
        تصدير البيانات (CSV)
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        الاستعادة تدمج البيانات مع الموجود ولا تحذف شيئًا.
      </p>
    </div>
  );
}

function AboutPanel() {
  return (
    <Card>
      <CardContent className="space-y-2 py-5 text-sm">
        <p className="text-lg font-bold">دينك بصوتك</p>
        <p>
          تطوير: <span className="font-medium">أبو لورينا</span>
        </p>
        <p>
          للتواصل: <span className="font-medium tabular-nums">777981012</span>
        </p>
        <p>
          أحد مقواته: <span className="font-medium">سوق مسيك</span>
        </p>
      </CardContent>
    </Card>
  );
}
