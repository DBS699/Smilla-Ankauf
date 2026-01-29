import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Wifi, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import api from '@/lib/api';
import html2pdf from 'html2pdf.js';

const DEFAULT_RECEIPT_SETTINGS = {
  store_name: "Smillå-Store GmbH",
  store_address: "Musterstrasse 123",
  store_city: "8000 Zürich",
  store_phone: "+41 44 123 45 67",
  footer_text: "Vielen Dank für Ihren Verkauf!",
  sub_footer_text: "Diese Quittung dient als Nachweis.",
  show_store_name: true,
  show_address: true,
  show_phone: true,
  show_date: true,
  show_receipt_id: true,
  show_item_details: true,
  show_relevance: true,
  show_item_count: true,
  show_footer: true,
  font_size_store: 18,
  font_size_title: 16,
  font_size_items: 12,
  font_size_total: 20,
  font_size_footer: 12
};

export default function ReceiptPage() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_RECEIPT_SETTINGS);
  const [isPrinting, setIsPrinting] = useState(false);
  const [receiptWidth, setReceiptWidth] = useState(80); // mm
  const [receiptScale, setReceiptScale] = useState(100); // %
  const receiptRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [purchaseData, receiptSettings] = await Promise.all([
        api.getPurchase(id),
        api.getReceiptSettings()
      ]);
      setPurchase(purchaseData);
      if (receiptSettings) {
        setSettings({ ...DEFAULT_RECEIPT_SETTINGS, ...receiptSettings });
      }
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePrint = () => window.print();

  // PDF Download - custom width
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    setIsPrinting(true);
    try {
      const scaleFactor = receiptScale / 100;
      const widthPx = (receiptWidth / 25.4) * 96 * scaleFactor; // mm to px at 96dpi

      const opt = {
        margin: 0,
        filename: `Quittung_${purchase.id.slice(0, 8)}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          width: widthPx,
        },
        jsPDF: {
          unit: 'mm',
          format: [receiptWidth, 297],
          orientation: 'portrait'
        }
      };

      await html2pdf().set(opt).from(receiptRef.current).save();
      toast.success(`PDF (${receiptWidth}mm) heruntergeladen!`);
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('PDF-Fehler');
    } finally {
      setIsPrinting(false);
    }
  };

  // Epson Direct Print via ePOS SDK
  const handleEpsonPrint = async () => {
    setIsPrinting(true);
    try {
      // Check if Epson ePOS SDK is available
      if (typeof window.epson !== 'undefined' && window.epson.ePOSDevice) {
        // Epson SDK is loaded - use it
        const ePosDev = new window.epson.ePOSDevice();
        // Connect to printer (needs to be configured with printer IP)
        toast.info('Verbinde mit Epson Drucker...');
        // This would need printer IP configuration
        toast.error('Bitte Drucker-IP in Einstellungen konfigurieren');
      } else {
        // Fallback: Open print dialog with receipt-optimized settings
        toast.info('Epson SDK nicht geladen - verwende Browser-Druck');
        window.print();
      }
    } catch (error) {
      console.error('Epson print error:', error);
      toast.error('Druckfehler');
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Quittung nicht gefunden</p>
        <Link to="/"><Button variant="outline">Zurück</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="receipt-page">
      {/* Controls */}
      <div className="no-print fixed top-4 left-4 right-4 flex justify-between items-center z-50 gap-2">
        <Link to="/history">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />Zurück
          </Button>
        </Link>

        <div className="flex gap-2 items-center">
          {/* Format Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="lg">
                <Settings2 className="w-5 h-5 mr-2" />
                Format
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">Druckformat anpassen</h4>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Breite</Label>
                    <span className="text-sm font-mono">{receiptWidth}mm</span>
                  </div>
                  <Slider
                    value={[receiptWidth]}
                    onValueChange={(v) => setReceiptWidth(v[0])}
                    min={50}
                    max={120}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50mm</span>
                    <span>80mm</span>
                    <span>120mm</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Skalierung</Label>
                    <span className="text-sm font-mono">{receiptScale}%</span>
                  </div>
                  <Slider
                    value={[receiptScale]}
                    onValueChange={(v) => setReceiptScale(v[0])}
                    min={50}
                    max={500}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50%</span>
                    <span>100%</span>
                    <span>500%</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Standard: 80mm Breite, 100% Skalierung
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* PDF Download */}
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isPrinting}
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            PDF
          </Button>

          {/* Browser Print */}
          <Button
            variant="outline"
            onClick={handlePrint}
            size="lg"
          >
            <Printer className="w-5 h-5 mr-2" />
            Drucken
          </Button>

          {/* Epson Direct */}
          <Button
            onClick={handleEpsonPrint}
            disabled={isPrinting}
            size="lg"
            className="shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <Wifi className="w-5 h-5 mr-2" />
            Epson
          </Button>
        </div>
      </div>

      {/* Receipt with dynamic width */}
      <div
        className="print-area receipt-container"
        ref={receiptRef}
        style={{
          width: `${receiptWidth}mm`,
          maxWidth: `${receiptWidth}mm`,
          transform: `scale(${receiptScale / 100})`,
          transformOrigin: 'top center'
        }}
      >
        <div className="receipt-content">
          {/* Store Header */}
          {settings.show_store_name && (
            <div className="store-name" style={{ fontSize: settings.font_size_store }}>{settings.store_name}</div>
          )}
          {settings.show_address && (
            <>
              <div className="store-info">{settings.store_address}</div>
              <div className="store-info">{settings.store_city}</div>
            </>
          )}
          {settings.show_phone && <div className="store-info">{settings.store_phone}</div>}

          <div className="receipt-divider">================================</div>

          <div className="receipt-title" style={{ fontSize: settings.font_size_title }}>ANKAUFSQUITTUNG</div>
          {settings.show_date && (
            <div className="receipt-date">{formatDate(purchase.timestamp)} {formatTime(purchase.timestamp)}</div>
          )}
          {settings.show_receipt_id && (
            <div className="receipt-id">Nr. {purchase.id.slice(0, 8).toUpperCase()}</div>
          )}

          <div className="receipt-divider">--------------------------------</div>

          {/* Items */}
          <div className="receipt-items" style={{ fontSize: settings.font_size_items }}>
            {purchase.items.map((item, index) => (
              <div key={index} className="receipt-item">
                <div className="item-name">{item.category}</div>
                {settings.show_item_details && (
                  <div className="item-details">{item.price_level} / {item.condition}</div>
                )}
                {settings.show_relevance && item.relevance && (
                  <div className="item-details">{item.relevance}</div>
                )}
                <div className="item-price">CHF {item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="receipt-divider">--------------------------------</div>

          {settings.show_item_count && (
            <div className="receipt-summary">
              <div className="summary-row">
                <span>Artikel:</span>
                <span>{purchase.items.length}</span>
              </div>
            </div>
          )}

          <div className="receipt-divider">================================</div>

          <div className="receipt-total" style={{ fontSize: settings.font_size_total }}>
            <span>TOTAL</span>
            <span>CHF {purchase.total.toFixed(2)}</span>
          </div>

          <div className="receipt-divider">================================</div>

          {settings.show_footer && (
            <div className="receipt-footer" style={{ fontSize: settings.font_size_footer }}>
              <div>{settings.footer_text}</div>
              <div className="receipt-small">{settings.sub_footer_text}</div>
            </div>
          )}

          <div className="receipt-spacer"></div>
        </div>
      </div>

      <style>{`
        /* Screen preview - 80mm thermal receipt style */
        .receipt-container {
          width: 302px; /* 80mm at 96dpi */
          max-width: 302px;
          margin: 80px auto 40px;
          padding: 12px 15px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          line-height: 1.4;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .receipt-content { text-align: center; }
        .store-name { font-weight: bold; margin-bottom: 5px; font-size: 18px; }
        .store-info { font-size: 13px; color: #333; }
        .receipt-divider { font-size: 12px; color: #666; margin: 10px 0; letter-spacing: -1px; }
        .receipt-title { font-weight: bold; letter-spacing: 2px; margin: 10px 0 5px; font-size: 16px; }
        .receipt-date { font-size: 13px; color: #333; }
        .receipt-id { font-size: 12px; color: #666; margin-bottom: 10px; }
        .receipt-items { text-align: left; }
        .receipt-item { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #999; }
        .receipt-item:last-child { border-bottom: none; }
        .item-name { font-weight: bold; font-size: 14px; }
        .item-details { font-size: 12px; color: #333; }
        .item-price { font-weight: bold; text-align: right; margin-top: 4px; font-size: 14px; }
        .receipt-summary { text-align: left; font-size: 13px; }
        .summary-row { display: flex; justify-content: space-between; }
        .receipt-total { display: flex; justify-content: space-between; font-weight: bold; padding: 10px 0; font-size: 18px; }
        .receipt-footer { margin-top: 15px; font-size: 12px; }
        .receipt-small { font-size: 11px; color: #666; margin-top: 5px; }
        .receipt-spacer { height: 30px; }

        /* 80mm Thermal Printer Styles */
        @media print {
          @page { 
            size: 80mm 297mm;
            margin: 0mm;
          }
          
          html, body { 
            width: 80mm;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .no-print { 
            display: none !important; 
          }
          
          .receipt-container { 
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 2mm 3mm;
            box-shadow: none;
            page-break-inside: avoid;
          }
          
          .store-name { 
            font-size: 5mm !important;
          }
          
          .store-info { 
            font-size: 3.5mm !important;
            color: black;
          }
          
          .receipt-divider { 
            font-size: 3mm;
            margin: 2mm 0;
            color: black;
          }
          
          .receipt-title { 
            font-size: 4.5mm !important;
          }
          
          .receipt-date, .receipt-id { 
            font-size: 3.5mm !important;
            color: black;
          }
          
          .item-name { 
            font-size: 4mm !important;
          }
          
          .item-details { 
            font-size: 3mm !important;
            color: black;
          }
          
          .item-price { 
            font-size: 4mm !important;
          }
          
          .receipt-summary {
            font-size: 3.5mm;
          }
          
          .receipt-total { 
            font-size: 5mm !important;
          }
          
          .receipt-footer { 
            font-size: 3mm !important;
          }
          
          .receipt-small { 
            font-size: 2.5mm !important;
            color: black;
          }
          
          .receipt-spacer { 
            height: 5mm;
          }
        }
      `}</style>
    </div>
  );
}
