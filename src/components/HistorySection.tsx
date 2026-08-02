import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAmount, formatDate, formatDayLabel, formatTime } from "@/lib/format";
import { dayKey, historyItems, type Transaction } from "@/lib/storage";
import { matchesQuery } from "@/lib/derive";

/** السجل والتقارير: تقارير يومية + بحث في العمليات السابقة */
export function HistorySection({ items }: { items: Transaction[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return null;
    return historyItems(items)
      .filter((t) => matchesQuery(t.name, query) || matchesQuery(t.note ?? "", query))
      .sort((a, z) => z.date.localeCompare(a.date))
      .slice(0, 100);
  }, [items, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في العمليات السابقة…"
          className="pr-9"
        />
      </div>

      {results ? (
        results.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            لا توجد نتائج
          </div>
        ) : (
          <ul className="space-y-2">
            {results.map((t) => (
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
                  {formatDate(t.date)}
                  {t.note ? ` • ${t.note}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <DailyReports items={items} />
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
