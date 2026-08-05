import { useEffect, useState } from "react";
import { Fingerprint, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  biometricAvailable,
  clearLock,
  isBiometricEnabled,
  hasPin,
  setBiometricEnabled,
  setPin as savePin,
  verifyPin,
} from "@/lib/lock";

export function LockSettings() {
  const [enabled, setEnabled] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [bio, setBio] = useState(false);
  const [current, setCurrent] = useState("");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");

  useEffect(() => {
    setEnabled(hasPin());
    setBio(isBiometricEnabled());
    biometricAvailable().then(setBioAvail);
  }, []);

  const onSave = async () => {
    if (enabled && !(await verifyPin(current))) {
      toast.error("الرمز الحالي غير صحيح");
      return;
    }
    if (!/^\d{4}$/.test(pin1)) {
      toast.error("الرمز يجب أن يكون 4 أرقام");
      return;
    }
    if (pin1 !== pin2) {
      toast.error("الرمزان غير متطابقين");
      return;
    }
    await savePin(pin1);
    setEnabled(true);
    setCurrent("");
    setPin1("");
    setPin2("");
    toast.success("تم حفظ رمز القفل");
  };

  const onDisable = async () => {
    if (!(await verifyPin(current))) {
      toast.error("الرمز الحالي غير صحيح");
      return;
    }
    clearLock();
    setEnabled(false);
    setBio(false);
    setCurrent("");
    toast.success("تم إلغاء القفل");
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Lock className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">حالة القفل</p>
            <p className="text-[11px] text-muted-foreground">
              {enabled ? "مفعّل — يُطلب الرمز عند فتح التطبيق" : "غير مفعّل"}
            </p>
          </div>
        </CardContent>
      </Card>

      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="cur-pin">الرمز الحالي</Label>
          <Input
            id="cur-pin"
            inputMode="numeric"
            maxLength={4}
            value={current}
            onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="pin1">{enabled ? "رمز جديد" : "رمز جديد (4 أرقام)"}</Label>
        <Input
          id="pin1"
          inputMode="numeric"
          maxLength={4}
          value={pin1}
          onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pin2">تأكيد الرمز</Label>
        <Input
          id="pin2"
          inputMode="numeric"
          maxLength={4}
          value={pin2}
          onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onSave}>
          حفظ الرمز
        </Button>
        {enabled && (
          <Button variant="outline" onClick={onDisable}>
            إلغاء القفل
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Fingerprint className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">بصمة الإصبع</p>
            <p className="text-[11px] text-muted-foreground">
              {bioAvail
                ? "استخدم البصمة بدل الرمز عند الفتح والعمليات الحساسة"
                : "غير متاحة على هذا الجهاز"}
            </p>
          </div>
          <Switch
            checked={bio}
            disabled={!bioAvail || !enabled}
            onCheckedChange={(v) => {
              setBio(v);
              setBiometricEnabled(v);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
