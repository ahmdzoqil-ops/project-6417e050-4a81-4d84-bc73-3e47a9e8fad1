import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LockSettings } from "@/components/LockSettings";
import {
  LOCK_DELAYS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";

export function SecuritySettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">حماية فتح التطبيق</p>
            <p className="text-[11px] text-muted-foreground">
              طلب رمز سري أو بصمة عند فتح التطبيق
            </p>
          </div>
          <Switch
            checked={settings.security.appLock}
            onCheckedChange={(v) =>
              setSettings((s) => ({ ...s, security: { ...s.security, appLock: v } }))
            }
          />
        </div>
        {settings.security.appLock && (
          <CardContent className="space-y-4 pt-4">
            <LockSettings />
            <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">مهلة القفل بعد الخروج</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                لن يُطلب الرمز إذا عدت خلال هذه المدة.
              </p>
              <div className="flex flex-wrap gap-2">
                {LOCK_DELAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        security: { ...s.security, lockDelayMinutes: d.value },
                      }))
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      settings.security.lockDelayMinutes === d.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">حماية العمليات الحساسة</p>
            <p className="text-[11px] text-muted-foreground">
              طلب تأكيد إضافي قبل تنفيذ العمليات الحساسة
            </p>
          </div>
          <Switch
            checked={settings.security.actionLock}
            onCheckedChange={(v) =>
              setSettings((s) => ({ ...s, security: { ...s.security, actionLock: v } }))
            }
          />
        </div>
        <CardContent className="space-y-2 pt-4 text-sm text-muted-foreground">
          <p>عند التفعيل، سيُطلب تأكيد (رمز أو بصمة) قبل:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>حذف عميل</li>
            <li>حذف عملية</li>
            <li>تصفير الحساب</li>
            <li>حذف جميع البيانات</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
