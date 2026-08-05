import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { inbox, markAllRead, markRead } from "@/lib/notifyCenter";
import type { Customer, Transaction } from "@/lib/storage";

/** مركز الإشعارات داخل التطبيق (أيقونة الجرس في الأعلى) */
export function NotificationCenter({
  items,
  customers,
}: {
  items: Transaction[];
  customers: Customer[];
}) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const list = useMemo(
    () => inbox(items, customers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, customers, tick],
  );
  const unread = list.filter((r) => !r.read).length;

  useEffect(() => {
    if (!open || !list.length) return;
    const id = window.setTimeout(() => {
      markRead(list.map((r) => r.id));
      setTick((t) => t + 1);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [open, list]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="الإشعارات"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" dir="rtl" className="w-[92vw] overflow-y-auto sm:max-w-md">
          <SheetHeader className="text-right">
            <SheetTitle>الإشعارات والتنبيهات</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                <BellOff className="h-6 w-6" />
                لا توجد تنبيهات حاليًا
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    markAllRead(items, customers);
                    setTick((t) => t + 1);
                  }}
                >
                  <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
                </Button>
                <ul className="space-y-2">
                  {list.map((r) => (
                    <li
                      key={r.id}
                      className={
                        "rounded-2xl border p-3 shadow-sm " +
                        (r.read ? "bg-card" : "border-primary/40 bg-primary/5")
                      }
                    >
                      <div className="flex items-center gap-2">
                        {!r.read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <p className="font-medium">{r.title}</p>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {r.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
