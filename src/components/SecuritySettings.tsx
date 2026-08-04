import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LockSettings } from "@/components/LockSettings";
import { loadSettings, saveSettings, type AppSettings } from "@/lib/settings";

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
          <CardContent className="pt-4">
            <LockSettings />
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
