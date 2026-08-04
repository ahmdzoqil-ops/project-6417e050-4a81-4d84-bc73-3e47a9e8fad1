export function formatAmount(n: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }) +
    " " +
    d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
  );
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "أمس";
  return date.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export const txLabel: Record<string, string> = {
  debt: "دين",
  pocket: "جيب",
  payment: "سداد",
  withdraw: "سحب نقدي",
};
