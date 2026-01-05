import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

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
      <div className="no-print fixed top-4 left-4 right-4 flex justify-between z-50">
        <Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Zurück</Button></Link>
        <Button onClick={handlePrint} size="lg" className="shadow-lg"><Printer className="w-5 h-5 mr-2" />Bon drucken</Button>
      </div>

      {/* Receipt */}
      <div className="print-area receipt-container">
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
        .receipt-container {
          max-width: 320px;
          margin: 80px auto 40px;
          padding: 20px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.4;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .receipt-content { text-align: center; }
        .store-name { font-weight: bold; margin-bottom: 5px; }
        .store-info { font-size: 12px; color: #666; }
        .receipt-divider { font-size: 12px; color: #999; margin: 10px 0; letter-spacing: -1px; }
        .receipt-title { font-weight: bold; letter-spacing: 2px; margin: 10px 0 5px; }
        .receipt-date { font-size: 12px; color: #666; }
        .receipt-id { font-size: 11px; color: #999; margin-bottom: 10px; }
        .receipt-items { text-align: left; }
        .receipt-item { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; }
        .receipt-item:last-child { border-bottom: none; }
        .item-name { font-weight: bold; }
        .item-details { font-size: 11px; color: #666; }
        .item-price { font-weight: bold; text-align: right; margin-top: 4px; }
        .receipt-summary { text-align: left; font-size: 12px; }
        .summary-row { display: flex; justify-content: space-between; }
        .receipt-total { display: flex; justify-content: space-between; font-weight: bold; padding: 10px 0; }
        .receipt-footer { margin-top: 15px; }
        .receipt-small { font-size: 10px; color: #999; margin-top: 5px; }
        .receipt-spacer { height: 30px; }

        /* 80mm Thermal Printer Optimized Styles */
        @media print {
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          
          html, body { 
            width: 80mm; 
            margin: 0; 
            padding: 0;
            font-size: 24pt;
          }
          
          .no-print { display: none !important; }
          
          .receipt-container { 
            width: 76mm;
            max-width: 76mm; 
            margin: 0 auto; 
            padding: 2mm;
            box-shadow: none;
            font-size: 24pt;
          }
          
          .receipt-content {
            text-align: center;
          }
          
          .store-name { 
            font-size: 28pt !important;
            font-weight: bold;
            margin-bottom: 3mm;
          }
          
          .store-info { 
            font-size: 18pt !important;
            color: #000;
            line-height: 1.4;
          }
          
          .receipt-divider { 
            font-size: 16pt;
            margin: 4mm 0;
            color: #000;
          }
          
          .receipt-title { 
            font-size: 24pt !important;
            font-weight: bold;
            margin: 4mm 0 3mm;
            letter-spacing: 1px;
          }
          
          .receipt-date { 
            font-size: 18pt !important;
            color: #000;
          }
          
          .receipt-id { 
            font-size: 16pt !important;
            color: #333;
            margin-bottom: 3mm;
          }
          
          .receipt-items {
            text-align: left;
            font-size: 20pt;
          }
          
          .receipt-item { 
            margin-bottom: 4mm;
            padding-bottom: 3mm;
            border-bottom: 1px dashed #000;
          }
          
          .item-name { 
            font-size: 20pt !important;
            font-weight: bold;
          }
          
          .item-details { 
            font-size: 16pt !important;
            color: #333;
          }
          
          .item-price { 
            font-size: 20pt !important;
            font-weight: bold;
            text-align: right;
          }
          
          .receipt-summary {
            font-size: 18pt;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
          }
          
          .receipt-total { 
            font-size: 28pt !important;
            font-weight: bold;
            padding: 4mm 0;
            display: flex;
            justify-content: space-between;
          }
          
          .receipt-footer { 
            font-size: 16pt !important;
            margin-top: 4mm;
            text-align: center;
          }
          
          .receipt-small { 
            font-size: 14pt !important;
            color: #333;
            margin-top: 2mm;
          }
          
          .receipt-spacer { 
            height: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
