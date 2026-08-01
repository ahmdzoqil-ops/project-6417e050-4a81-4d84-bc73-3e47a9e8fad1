import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAmount, formatDate, formatDayLabel, formatTime } from "@/lib/format";
import {
  customerBalance,
  dayKey,
  historyItems,
  type Customer,
  type Transaction,
} from "@/lib/storage";
import { debtors, matchesQuery, totalOutstanding } from "@/lib/derive";

/** السجل: الحقوق المتبقية فقط + تقارير يومية */
export function HistorySection({
  items,
  customers,
}: {
  items: Transaction[];
  customers: Customer[];
}) {
  return (
    <Tabs defaultValue="open" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="open">الحقوق المتبقية</TabsTrigger>
        <TabsTrigger value="days">التقارير اليومية</TabsTrigger>
      </TabsList>
      <TabsContent value="open" className="mt-3">
        <OpenRights items={items} customers={customers} />
      </TabsContent>
      <TabsContent value="days" className="mt-3">
        <DailyReports items={items} />
      </TabsContent>
    </Tabs>
  );
}

function OpenRights({
  items,
  customers,
}: {
  items: Transaction[];
  customers: Customer[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);

  const rows = useMemo(() => debtors(items, customers), [items, customers]);
  const filtered = useMemo(
    () => rows.filter((r) => matchesQuery(r.customer.name, query)),
    [rows, query],
  );
  const total = useMemo(
    () => totalOutstanding(items, customers),
    [items, customers],
  );

  if (open) {
    const rowsFor = items
      .filter((t) => t.customerId === open.id)
      .sort((a, z) => z.date.localeCompare(a.date));
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setOpen(null)}>
          رجوع
        </Button>
        <Card>
          <CardContent className="py-4">
            <p className="font-bold">{open.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">المتبقي عليه</p>
            <p className="text-2xl font-bold tabular-nums text-rose-600">
              {formatAmount(customerBalance(items, open.id))}
            </p>
          </CardContent>
        </Card>
        <ul className="space-y-2">
          {rowsFor.map((t) => (
            <li key={t.id} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDate(t.date)}
                </span>
                <span
                  className={
                    "text-sm font-bold tabular-nums " +
                    (t.type === "debt" ? "text-rose-600" : "text-sky-600")
                  }
                >
                  {t.type === "debt" ? "دين" : "سداد"} {formatAmount(t.amount)}
                </span>
              </div>
              {t.note && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t.note}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            إجمالي الحقوق المتبقية ({filtered.length} عميل)
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-800 dark:text-rose-200">
            {formatAmount(total)}
          </p>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم العميل…"
          className="pr-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          لا توجد حقوق متبقية
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.customer.id}>
              <button
                type="button"
                onClick={() => setOpen(r.customer)}
                className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-right shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.customer.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    آخر حركة: {r.lastDate ? formatDate(r.lastDate) : "—"}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums text-rose-600">
                  {formatAmount(r.balance)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DailyReports({ items }: { items: Transaction[] }) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const days = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of historyItems(items)) {
      const k = dayKey(t.date);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return [...map.entries()]
      .sort((a, z) => z[0].localeCompare(a[0]))
      .map(([key, list]) => {
        const sorted = [...list].sort((a, z) => z.date.localeCompare(a.date));
        let debt = 0;
        let payment = 0;
        for (const t of sorted) {
          if (t.type === "debt") debt += t.amount;
          else if (t.type === "payment") payment += t.amount;
        }
        return { key, list: sorted, debt, payment, count: sorted.length };
      });
  }, [items]);

  const pocketToday = items
    .filter((t) => t.type === "pocket")
    .reduce((s, t) => s + t.amount, 0);

  if (openDay) {
    const day = days.find((d) => d.key === openDay);
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setOpenDay(null)}>
          رجوع
        </Button>
        <h3 className="text-sm font-semibold">{formatDayLabel(openDay)}</h3>
        <DayReport
          debt={day?.debt ?? 0}
          payment={day?.payment ?? 0}
          pocket={formatDayLabel(openDay) === "اليوم" ? pocketToday : 0}
          count={day?.count ?? 0}
        />
        <ul className="space-y-2">
          {(day?.list ?? []).map((t) => (
            <li key={t.id} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                <span
                  className={
                    "text-sm font-bold tabular-nums " +
                    (t.type === "debt" ? "text-rose-600" : "text-sky-600")
                  }
                >
                  {t.type === "debt" ? "دين" : "سداد"} {formatAmount(t.amount)}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {formatTime(t.date)}
                {t.delivered ? " • تم التسليم" : ""}
                {t.note ? ` • ${t.note}` : ""}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {days.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          لا توجد معاملات محفوظة
        </div>
      ) : (
        <ul className="space-y-2">
          {days.map((d) => (
            <li key={d.key}>
              <button
                type="button"
                onClick={() => setOpenDay(d.key)}
                className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-right shadow-sm"
              >
                <div>
                  <p className="font-medium">{formatDayLabel(d.key)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.count} عملية • دين {formatAmount(d.debt)} • سداد{" "}
                    {formatAmount(d.payment)}
                  </p>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-1 text-center text-[11px] text-muted-foreground">
        يتم الاحتفاظ بالمعاملات لمدة 6 أشهر (الجيب والديون المسلَّمة حركة يومية
        فقط)
      </p>
    </div>
  );
}

function DayReport({
  debt,
  payment,
  pocket,
  count,
}: {
  debt: number;
  payment: number;
  pocket: number;
  count: number;
}) {
  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-3 py-4 text-sm">
        <Stat label="إجمالي الدين" value={formatAmount(debt)} tone="text-rose-600" />
        <Stat label="إجمالي السداد" value={formatAmount(payment)} tone="text-sky-600" />
        <Stat label="إجمالي الجيب" value={formatAmount(pocket)} tone="text-emerald-600" />
        <Stat label="عدد العمليات" value={String(count)} tone="text-foreground" />
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={"text-lg font-bold tabular-nums " + tone}>{value}</p>
    </div>
  );
}
