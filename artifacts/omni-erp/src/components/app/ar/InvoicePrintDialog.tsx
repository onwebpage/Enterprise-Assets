import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, Loader2, Printer, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useInvoicePrintSource } from '@/hooks/useInvoicePrint';
import type { ARInvoice } from '@/hooks/useAccountsReceivable';
import {
  INVOICE_PRINT_FORMATS, INVOICE_PRINT_FORMAT_SPECS,
  buildInvoicePrintModel, getStoredInvoicePrintFormat, storeInvoicePrintFormat,
  type InvoicePrintFormat,
} from '@/lib/invoice-print/model';
import { THERMAL_PAGE_STYLE_ID, mmToPx, renderInvoiceDocument, thermalPageRule } from '@/lib/invoice-print/html';
import { downloadInvoicePdf } from '@/lib/invoice-print/pdf';
import { isNativeApp, printHtmlNatively } from '@/lib/native';
import { getBrandLogoDataUrl } from '@/lib/brand-logo';

interface Props {
  /** Invoice to print; the dialog is open while this is set. */
  invoice: ARInvoice | null;
  onClose: () => void;
}

const PREVIEW_PADDING_PX = 16;

const FORMAT_HINTS: Record<InvoicePrintFormat, string> = {
  a4: 'Prints on A4 in portrait. Long invoices continue on further pages with the table header repeated.',
  a5: 'Prints on A5 in landscape — pick A5 paper in the print dialog if your printer does not select it automatically.',
  thermal80: 'Prints as one continuous 80mm receipt — choose your thermal printer and set margins to “None”.',
};

export default function InvoicePrintDialog({ invoice, onClose }: Props) {
  const { toast } = useToast();
  const open = invoice !== null;
  const [format, setFormat] = useState<InvoicePrintFormat>(getStoredInvoicePrintFormat);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const { data: source, isLoading, isFetching, error, refetch } = useInvoicePrintSource(invoice?.id ?? null);

  const model = useMemo(() => (source ? buildInvoicePrintModel(source) : null), [source]);
  // The logo is embedded as a data URL so the printed document is self-contained.
  const [brandLogo, setBrandLogo] = useState('');
  useEffect(() => { void getBrandLogoDataUrl().then(setBrandLogo); }, []);
  const html = useMemo(() => (model ? renderInvoiceDocument(model, format, { brandLogo }) : ''), [model, format, brandLogo]);
  const spec = INVOICE_PRINT_FORMAT_SPECS[format];

  // The measured height belongs to one rendering; drop it when the document changes.
  useEffect(() => { setContentHeight(null); }, [html]);

  // Track the preview area's width so the page can be scaled to fit (mobile, narrow windows).
  const previewRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const update = () => setAvailableWidth(node.clientWidth - PREVIEW_PADDING_PX * 2);
    update();
    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver(update);
      observerRef.current.observe(node);
    }
  }, []);

  const handleFormatChange = (next: InvoicePrintFormat) => {
    setFormat(next);
    storeInvoicePrintFormat(next);
  };

  const handleFrameLoad = () => {
    const frameDocument = frameRef.current?.contentDocument;
    if (!frameDocument?.body) return;
    const height = frameDocument.body.offsetHeight;
    if (format === 'thermal80') {
      // Receipt paper is continuous: size the printed page to the receipt's actual length.
      const pageStyle = frameDocument.getElementById(THERMAL_PAGE_STYLE_ID);
      if (pageStyle) pageStyle.textContent = thermalPageRule(height);
    }
    setContentHeight(height);
  };

  // Android WebViews have no window.print(): the same document goes to the Android print service.
  const printOnAndroid = useCallback(async () => {
    if (!model || !html) return;
    try {
      await printHtmlNatively({
        html,
        jobName: `${model.invoiceNumber} - ZorvanI ERP`,
        paper: format === 'a5' ? 'a5-landscape' : format === 'thermal80' ? 'receipt80' : 'a4',
        heightMm: contentHeight ? Math.ceil(contentHeight / mmToPx(1)) + 4 : undefined,
      });
    } catch {
      // No print service on this device: fall back to the PDF, which can be printed or shared.
      toast({ title: 'Printing is not available on this device', description: 'Opening the invoice PDF instead.' });
      try {
        await downloadInvoicePdf(model, format);
      } catch (pdfError) {
        toast({
          title: 'Could not create the invoice PDF',
          description: pdfError instanceof Error ? pdfError.message : undefined,
          variant: 'destructive',
        });
      }
    }
  }, [model, html, format, contentHeight, toast]);

  const handlePrint = useCallback(() => {
    if (isNativeApp) { void printOnAndroid(); return; }
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) {
      toast({ title: 'Invoice preview is not ready yet', variant: 'destructive' });
      return;
    }
    try {
      // Printing the preview frame itself: only the invoice document is sent to
      // the printer (no dashboard chrome), with the page size of the selected format.
      frameWindow.focus();
      frameWindow.print();
    } catch (printError) {
      toast({
        title: 'Could not open the print dialog',
        description: printError instanceof Error ? printError.message : undefined,
        variant: 'destructive',
      });
    }
  }, [toast, printOnAndroid]);

  // Ctrl/Cmd+P while the dialog is open prints the invoice, not the dashboard behind it.
  useEffect(() => {
    if (!open || !model) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, model, handlePrint]);

  async function handleDownload() {
    if (!model) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(model, format);
    } catch (downloadError) {
      toast({
        title: 'Could not download invoice PDF',
        description: downloadError instanceof Error ? downloadError.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  }

  // Preview geometry: the frame is laid out at the real page width and scaled down to fit.
  const pageWidth = mmToPx(spec.widthMm);
  const pageHeight = spec.heightMm ? mmToPx(spec.heightMm) : null;
  const frameHeight = Math.max(contentHeight ?? 0, pageHeight ?? 320);
  const scale = availableWidth > 0 ? Math.min(1, availableWidth / pageWidth) : 1;

  let lengthLabel = '';
  if (contentHeight !== null) {
    if (pageHeight) {
      const margin = mmToPx(spec.marginMm);
      const pages = Math.max(1, Math.ceil((contentHeight - margin * 2) / (pageHeight - margin * 2) - 0.02));
      lengthLabel = pages === 1 ? '1 page' : `about ${pages} pages`;
    } else {
      lengthLabel = `about ${Math.ceil(contentHeight / mmToPx(1))} mm long`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 py-4 pr-12 border-b border-white/[0.07] space-y-0.5 text-left">
          <DialogTitle className="text-base font-semibold text-white">
            Print Invoice{invoice ? ` ${invoice.invoiceNumber}` : ''}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/40">
            Choose a print format. The preview shows exactly what will be printed.
          </DialogDescription>
        </DialogHeader>

        {/* Print format selector */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.07]">
          <p id="invoice-print-format-label" className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">
            Print Format
          </p>
          <div role="radiogroup" aria-labelledby="invoice-print-format-label" className="grid grid-cols-3 gap-2">
            {INVOICE_PRINT_FORMATS.map((id) => {
              const option = INVOICE_PRINT_FORMAT_SPECS[id];
              const selected = id === format;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`print-format-${id}`}
                  onClick={() => handleFormatChange(id)}
                  className={cn(
                    'relative rounded-lg border px-2.5 sm:px-3 py-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/60',
                    selected
                      ? 'border-[#2563EB] bg-[#2563EB]/15 text-white'
                      : 'border-white/[0.08] bg-white/[0.02] text-white/55 hover:text-white/80 hover:bg-white/[0.05]',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {option.label}
                    {selected && <Check className="w-3.5 h-3.5 text-[#60a5fa]" aria-hidden="true" />}
                  </span>
                  <span className="block text-[11px] leading-snug text-white/45 mt-0.5">{option.description}</span>
                  <span className="block text-[10px] leading-snug text-white/30 tabular-nums">{option.paper}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-white/35 mt-2">{FORMAT_HINTS[format]}</p>
        </div>

        {/* Preview */}
        <div
          ref={previewRef}
          className="flex-1 min-h-[220px] overflow-auto bg-[#060a17]"
          style={{ padding: PREVIEW_PADDING_PX }}
        >
          {isLoading ? (
            <div className="h-48 flex items-center justify-center gap-2 text-sm text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" />Loading invoice…
            </div>
          ) : error || !model ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-red-400">{error instanceof Error ? error.message : 'Could not load this invoice.'}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}
                className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05] h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Try again
              </Button>
            </div>
          ) : (
            <div
              className="mx-auto shadow-[0_8px_30px_rgba(0,0,0,0.45)] bg-white overflow-hidden"
              style={{ width: pageWidth * scale, height: frameHeight * scale }}
            >
              <iframe
                ref={frameRef}
                key={format}
                title={`${spec.label} preview of invoice ${model.invoiceNumber}`}
                data-testid="invoice-print-preview"
                srcDoc={html}
                onLoad={handleFrameLoad}
                scrolling="no"
                className="block border-0 bg-white"
                style={{ width: pageWidth, height: frameHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-white/[0.07]">
          <p className="text-xs text-white/45 min-w-0" aria-live="polite" data-testid="print-format-summary">
            <span className="font-semibold text-white/80">{spec.label}</span>
            {' · '}{spec.description} · {spec.paper}
            {lengthLabel && ` · ${lengthLabel}`}
            {isFetching && !isLoading && ' · refreshing…'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={!model || downloading}
              className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05] h-8">
              {downloading
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <Download className="w-3.5 h-3.5 mr-1.5" />}
              Download PDF
            </Button>
            <Button type="button" size="sm" onClick={handlePrint} disabled={!model || contentHeight === null}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[96px]">
              <Printer className="w-3.5 h-3.5 mr-1.5" />Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
