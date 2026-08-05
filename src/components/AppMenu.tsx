import { useEffect, useRef, useState } from "react";
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
  Settings,
  Boxes,
  Code2,
  ChevronLeft,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { CustomersSection } from "@/components/CustomersSection";
import { HistorySection } from "@/components/HistorySection";
import { ExpensesSection } from "@/components/ExpensesSection";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SecuritySettings } from "@/components/SecuritySettings";
import {
  createBackup,
  restoreBackup,
  saveProfile,
  type Customer,
  type Profile,
  type Transaction,
} from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { APP_NAME, APP_TAGLINE, APP_VERSION, DEVELOPER } from "@/lib/settings";

type NewTx = Omit<Transaction, "id" | "date">;
type View =
  | "menu"
  | "profile"
  | "customers"
  | "history"
  | "expenses"
  | "settings"
  | "notifications"
  | "security"
  | "backup"
  | "about"
  | "developer";

const titles: Record<View, string> = {
  menu: "القائمة",
  profile: "معلومات المستخدم",
  customers: "المديونية",
  history: "السجل والتقارير",
  expenses: "الضمار والمصاريف",
  settings: "الإعدادات",
  notifications: "الإشعارات والتنبيهات",
  security: "الأمان والخصوصية",
  backup: "النسخ الاحتياطي",
  about: "حول التطبيق",
  developer: "مطور التطبيق",
};

export function AppMenu({
  items,
  customers,
  profile,
  onProfileChange,
  onAddCustomer,
  onUpdateCustomer,
  onAddTx,
  onUpdateTx,
  onDeleteTx,
  onReloaded,
}: {
  items: Transaction[];
  customers: Customer[];
  profile: Profile;
  onProfileChange: (p: Profile) => void;
  onAddCustomer: (c: Customer) => void;
  onUpdateCustomer: (id: string, patch: Partial<Customer>) => void;
  onAddTx: (t: NewTx) => void;
  onUpdateTx: (id: string, patch: Partial<Transaction>) => void;
  onDeleteTx: (id: string) => void;
  onReloaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<View[]>(["menu"]);
  const view = stack[stack.length - 1];

  const pushView = (v: View) => {
    setStack((s) => [...s, v]);
    if (typeof window !== "undefined") {
      window.history.pushState({ appMenu: true }, "");
    }
  };

  const goBack = () => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };

  useEffect(() => {
    if (!open) return;
    const onPop = () => {
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setStack(["menu"]);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="القائمة">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" dir="rtl" className="w-[92vw] overflow-y-auto p-0 sm:max-w-md">
        {view === "menu" ? (
          <MenuHeader profile={profile} />
        ) : (
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-right">{titles[view]}</SheetTitle>
          </SheetHeader>
        )}
        <div className="px-4 pb-8 pt-3">
          {view !== "menu" && (
            <Button variant="ghost" size="sm" className="mb-3 gap-1" onClick={goBack}>
              <ArrowRight className="h-4 w-4" /> رجوع
            </Button>
          )}

          {view === "menu" && (
            <ul className="space-y-1.5">
              <MenuItem icon={Users} label="المديونية" onClick={() => pushView("customers")} />
              <MenuItem icon={History} label="السجل والتقارير" onClick={() => pushView("history")} />
              <MenuItem icon={Boxes} label="الضمار والمصاريف" onClick={() => pushView("expenses")} />
              <MenuItem icon={Settings} label="الإعدادات" onClick={() => pushView("settings")} />
              <MenuItem icon={DatabaseBackup} label="النسخ الاحتياطي" onClick={() => pushView("backup")} />
              <MenuItem icon={User} label="معلومات المستخدم" onClick={() => pushView("profile")} />
              <MenuItem icon={Info} label="حول التطبيق" onClick={() => pushView("about")} />
              <MenuItem icon={Code2} label="مطور التطبيق" onClick={() => pushView("developer")} />
            </ul>
          )}

          {view === "profile" && (
            <ProfileForm
              profile={profile}
              onSave={onProfileChange}
              onDone={() => setOpen(false)}
            />
          )}

          {view === "customers" && (
            <CustomersSection
              items={items}
              customers={customers}
              profile={profile}
              onAddCustomer={onAddCustomer}
              onUpdateCustomer={onUpdateCustomer}
              onAddTx={onAddTx}
              onUpdateTx={onUpdateTx}
              onDeleteTx={onDeleteTx}
            />
          )}

          {view === "history" && (
            <HistorySection
              items={items}
              onUpdateTx={onUpdateTx}
              onDeleteTx={onDeleteTx}
            />
          )}

          {view === "expenses" && <ExpensesSection items={items} profile={profile} />}

          {view === "settings" && (
            <ul className="space-y-1.5">
              <MenuItem icon={Bell} label="الإشعارات والتنبيهات" onClick={() => pushView("notifications")} />
              <MenuItem icon={ShieldCheck} label="الأمان والخصوصية" onClick={() => pushView("security")} />
            </ul>
          )}

          {view === "notifications" && (
            <NotificationSettings items={items} customers={customers} />
          )}

          {view === "security" && <SecuritySettings />}

          {view === "backup" && <BackupPanel onReloaded={onReloaded} />}

          {view === "about" && <AboutPanel />}

          {view === "developer" && <DeveloperPanel />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuHeader({ profile }: { profile: Profile }) {
  const initials = (profile.userName ?? "").trim().slice(0, 1) || "؟";
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-primary/20 via-primary/10 to-transparent px-4 pb-6 pt-8">
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
      <div className="pointer-events-none absolute -right-6 top-6 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-card shadow-lg ring-4 ring-background">
          {profile.photo ? (
            <img src={profile.photo} alt="صورة المستخدم" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary">{initials}</span>
          )}
        </div>
        <div>
          <p className="text-xl font-bold leading-tight">{profile.userName || "مستخدم دينك بصوتك"}</p>
          {profile.shopName && (
            <p className="mt-0.5 text-sm text-muted-foreground">{profile.shopName}</p>
          )}
        </div>
      </div>
    </div>
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
        className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-right shadow-sm transition-colors hover:bg-muted active:bg-muted"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </span>
        <span className="flex-1 font-medium">{label}</span>
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>
    </li>
  );
}

function ProfileForm({
  profile,
  onSave,
  onDone,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onDone: () => void;
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
          onDone();
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

function backupFilename() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `DinakBisawtak_Backup_${stamp}.json`;
}

function BackupPanel({ onReloaded }: { onReloaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  const doBackup = async () => {
    const filename = backupFilename();
    const content = JSON.stringify(createBackup(), null, 2);

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const res = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        toast.success(`تم الحفظ في: ${res.uri}`);
        try {
          await Share.share({ title: filename, url: res.uri });
        } catch {
          // مشاركة اختيارية
        }
      } catch {
        toast.error("تعذر حفظ النسخة الاحتياطية على الجهاز");
      }
    } else {
      download(filename, content, "application/json");
      toast.success("تم إنشاء النسخة الاحتياطية");
    }
  };

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={doBackup}>
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
      <CardContent className="space-y-3 py-5 text-sm">
        <div className="text-center">
          <p className="text-xl font-bold">{APP_NAME}</p>
          <p className="mt-1 text-muted-foreground">{APP_TAGLINE}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-muted-foreground">الإصدار</span>
          <span className="font-medium tabular-nums">{APP_VERSION}</span>
        </div>
        <p className="text-center text-muted-foreground">{DEVELOPER}</p>
      </CardContent>
    </Card>
  );
}

function DeveloperPanel() {
  return (
    <Card>
      <CardContent className="space-y-3 py-5 text-sm">
        <div className="text-center">
          <p className="text-lg font-bold">مطور التطبيق</p>
        </div>
        <div className="space-y-2 rounded-lg bg-muted/50 px-3 py-3">
          <p>
            تطوير: <span className="font-medium">أبو لورينا</span>
          </p>
          <p>
            للتواصل: <span className="font-medium tabular-nums">777981012</span>
          </p>
          <p>
            أحد مقواته: <span className="font-medium">سوق مسيك</span>
          </p>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">{DEVELOPER}</p>
      </CardContent>
    </Card>
  );
}
