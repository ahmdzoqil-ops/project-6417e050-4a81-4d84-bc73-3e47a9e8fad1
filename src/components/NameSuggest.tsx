import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmount } from "@/lib/format";
import {
  customerBalance,
  type Customer,
  type Transaction,
} from "@/lib/storage";

/** حقل اسم مع اقتراح العملاء المسجلين وربط العملية بحساب العميل عند الاختيار */
export function NameSuggest({
  id,
  label = "الاسم",
  value,
  onChange,
  customers,
  items,
  selectedId,
  onSelectCustomer,
  placeholder = "اسم العميل",
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  customers: Customer[];
  items: Transaction[];
  selectedId?: string;
  onSelectCustomer: (c: Customer | null) => void;
  placeholder?: string;
}) {
  const [touched, setTouched] = useState(false);

  const matches = useMemo(() => {
    const q = value.trim();
    if (!q || selectedId) return [];
    return customers.filter((c) => c.name.includes(q)).slice(0, 5);
  }, [value, customers, selectedId]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTouched(true);
          if (selectedId) onSelectCustomer(null);
        }}
        placeholder={placeholder}
      />
      {selected && (
        <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
          <span className="font-medium">مرتبط بحساب: {selected.name}</span>
          <button
            type="button"
            className="text-muted-foreground underline"
            onClick={() => onSelectCustomer(null)}
          >
            إلغاء الربط
          </button>
        </div>
      )}
      {touched && matches.length > 0 && (
        <ul className="overflow-hidden rounded-md border bg-card">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-muted"
                onClick={() => {
                  onChange(c.name);
                  onSelectCustomer(c);
                }}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  الرصيد الحالي: {formatAmount(customerBalance(items, c.id))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
