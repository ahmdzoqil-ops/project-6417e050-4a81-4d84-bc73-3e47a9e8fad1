import { useEffect, useState } from "react";
import { Bell, BellRing, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DAY_PRESETS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";
import { runReminders } from "@/lib/notify";
import type { Customer, Transaction } from "@/lib/storage";

function DaysControl({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  // حقل نصي حر: يسمح بمسح الرقم وكتابة رقم جديد بسهولة
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText((prev) => (Number(prev) === value ? prev : String(value)));
  }, [value]);

  return (
    <div className={disabled ? "space-y-2 opacity-50" : "space-y-2"}>
      <div className="flex flex-wrap gap-2">
        {DAY_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onChange(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              value === d
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted"
            }`}
          >
            {d} {d === 1 ? "يوم" : "أيام"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Label className="whitespace-nowrap text-xs text-muted-foreground">
          عدد أيام مخصص
        </Label>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="مثلاً 10"
          disabled={disabled}
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, "");
            setText(raw);
            const n = Number(raw);
            if (raw && Number.isFinite(n) && n > 0) onChange(n);
          }}
          onBlur={() => {
            const n = Number(text);
            if (!text || !Number.isFinite(n) || n <= 0) {
              setText(String(value));
            }
          }}
          className="h-9 w-24 text-center"
        />
      </div>
    </div>
  );
}


export function NotificationSettings({
  items,
  customers,
}: {
  items: Transaction[];
  customers: Customer[];
}) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">إشعارات المديونية</p>
              <p className="text-[11px] text-muted-foreground">
                تذكير عند تأخر عميل عن السداد
              </p>
            </div>
            <Switch
              checked={settings.notify.customersOn}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, notify: { ...s.notify, customersOn: v } }))
              }
            />
          </div>
          <DaysControl
            value={settings.notify.customersDays}
            disabled={!settings.notify.customersOn}
            onChange={(v) =>
              setSettings((s) => ({ ...s, notify: { ...s.notify, customersDays: v } }))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">إشعارات الديون اليومية</p>
              <p className="text-[11px] text-muted-foreground">
                تذكير عن ديون يومية لم تُسلَّم
              </p>
            </div>
            <Switch
              checked={settings.notify.dailyOn}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, notify: { ...s.notify, dailyOn: v } }))
              }
            />
          </div>
          <DaysControl
            value={settings.notify.dailyDays}
            disabled={!settings.notify.dailyOn}
            onChange={(v) =>
              setSettings((s) => ({ ...s, notify: { ...s.notify, dailyDays: v } }))
            }
          />
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={testing}
        onClick={async () => {
          setTesting(true);
          try {
            const count = await runReminders(items, customers);
            toast.success(count > 0 ? `تم إرسال ${count} تذكير(ات)` : "لا توجد تذكيرات مستحقة الآن");
          } finally {
            setTesting(false);
          }
        }}
      >
        <Send className="h-4 w-4" /> اختبار الإشعارات الآن
      </Button>
    </div>
  );
}
