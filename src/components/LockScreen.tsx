import { useEffect, useState } from "react";
import { Fingerprint, Delete, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  biometricAvailable,
  biometricVerify,
  isBiometricEnabled,
  verifyPin,
} from "@/lib/lock";

function Pad({
  value,
  onChange,
  onBio,
  showBio,
}: {
  value: string;
  onChange: (v: string) => void;
  onBio: () => void;
  showBio: boolean;
}) {
  const press = (d: string) => {
    if (value.length >= 4) return;
    onChange(value + d);
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-3" dir="ltr">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={
              "h-4 w-4 rounded-full border-2 " +
              (value.length > i
                ? "border-primary bg-primary"
                : "border-muted-foreground/40")
            }
          />
        ))}
      </div>
      <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button
            key={d}
            variant="outline"
            className="h-14 text-xl font-bold"
            onClick={() => press(d)}
          >
            {d}
          </Button>
        ))}
        <Button
          variant="ghost"
          className="h-14"
          onClick={onBio}
          disabled={!showBio}
          aria-label="بصمة"
        >
          {showBio && <Fingerprint className="h-6 w-6" />}
        </Button>
        <Button
          variant="outline"
          className="h-14 text-xl font-bold"
          onClick={() => press("0")}
        >
          0
        </Button>
        <Button
          variant="ghost"
          className="h-14"
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="مسح"
        >
          <Delete className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

/** شاشة قفل التطبيق */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [bio, setBio] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = (await biometricAvailable()) && isBiometricEnabled();
      if (cancelled) return;
      setBio(ok);
      if (ok && (await biometricVerify("فتح التطبيق"))) onUnlock();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pin.length !== 4) return;
    (async () => {
      if (await verifyPin(pin)) onUnlock();
      else {
        setError("رمز غير صحيح");
        setPin("");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6" dir="rtl">
      <div className="text-center">
        <Lock className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-2 text-xl font-bold">دينك بصوتك</h1>
        <p className="text-xs text-muted-foreground">أدخل رمز الدخول</p>
      </div>
      <Pad
        value={pin}
        onChange={(v) => {
          setError("");
          setPin(v);
        }}
        showBio={bio}
        onBio={async () => {
          if (await biometricVerify("فتح التطبيق")) onUnlock();
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** تأكيد الهوية قبل عملية حساسة (حذف كل عمليات عميل) */
export function AuthPrompt({
  open,
  onOpenChange,
  reason,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason: string;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [bio, setBio] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
      return;
    }
    (async () => {
      const ok = (await biometricAvailable()) && isBiometricEnabled();
      setBio(ok);
      if (ok && (await biometricVerify(reason))) {
        onOpenChange(false);
        onSuccess();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (pin.length !== 4) return;
    (async () => {
      if (await verifyPin(pin)) {
        setPin("");
        onOpenChange(false);
        onSuccess();
      } else {
        setError("رمز غير صحيح");
        setPin("");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{reason}</DialogTitle>
        </DialogHeader>
        <Pad
          value={pin}
          onChange={(v) => {
            setError("");
            setPin(v);
          }}
          showBio={bio}
          onBio={async () => {
            if (await biometricVerify(reason)) {
              onOpenChange(false);
              onSuccess();
            }
          }}
        />
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
