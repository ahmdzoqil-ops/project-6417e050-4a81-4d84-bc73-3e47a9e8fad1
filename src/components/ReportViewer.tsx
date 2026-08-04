import { useEffect, useRef, useState } from "react";
import { ArrowRight, Download, Loader2, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deliverReport } from "@/lib/pdf";

type PreviewDetail = { html: string; fileName: string };

const BASE_WIDTH = 794;

export function ReportViewer() {
  const [detail, setDetail] = useState<PreviewDetail | null>(null);
  const [busy, setBusy] = useState<"share" | "save" | "print" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function onPreview(e: Event) {
      const ce = e as CustomEvent<PreviewDetail>;
      if (ce.detail?.html) setDetail(ce.detail);
    }
    window.addEventListener("report:preview", onPreview);
    return () => window.removeEventListener("report:preview", onPreview);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || BASE_WIDTH;
      setScale(Math.min(1, (w - 16) / BASE_WIDTH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [detail]);

  if (!detail) return null;

  const close = () => setDetail(null);

  async function handleShare() {
    if (!detail) return;
    setBusy("share");
    try {
      await deliverReport(detail.html, detail.fileName, "share");
      toast.success("تمت المشاركة بنجاح");
    } catch {
      toast.error("تعذّرت المشاركة");
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    if (!detail) return;
    setBusy("save");
    try {
      await deliverReport(detail.html, detail.fileName, "share");
      toast.success("تم حفظ التقرير");
    } catch {
      toast.error("تعذّر حفظ التقرير");
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (!detail) return;
    setBusy("print");
    try {
      await deliverReport(detail.html, detail.fileName, "print");
    } catch {
      toast.error("تعذّرت الطباعة");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b bg-card px-3 py-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={close}>
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
        <div className="mr-auto text-sm font-medium text-muted-foreground">معاينة التقرير</div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/40 p-2">
        <div
          style={{
            width: BASE_WIDTH * scale,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: BASE_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              boxShadow: "0 4px 20px rgba(0,0,0,.12)",
            }}
            className="bg-white"
            dangerouslySetInnerHTML={{ __html: detail.html }}
          />
        </div>
      </div>

      <div className="flex items-center justify-around gap-2 border-t bg-card px-3 py-3">
        <Button variant="outline" className="flex-1 gap-2" disabled={busy !== null} onClick={handleShare}>
          {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          مشاركة
        </Button>
        <Button variant="outline" className="flex-1 gap-2" disabled={busy !== null} onClick={handleSave}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          حفظ PDF
        </Button>
        <Button variant="outline" className="flex-1 gap-2" disabled={busy !== null} onClick={handlePrint}>
          {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          طباعة
        </Button>
      </div>
    </div>
  );
}
