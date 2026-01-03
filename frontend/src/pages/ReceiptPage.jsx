import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STORE_INFO } from '@/lib/constants';
import api from '@/lib/api';

export default function ReceiptPage() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchase();
  }, [id]);

  const loadPurchase = async () => {
    try {
      const data = await api.getPurchase(id);
      setPurchase(data);
    } catch (error) {
      console.error('Failed to load purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    window.print();
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
        <Link to="/">
          <Button variant="outline">Zurück zur Hauptseite</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="receipt-page">
      {/* Control buttons (hidden on print) */}
      <div className="no-print fixed top-4 left-4 right-4 flex justify-between z-50">
        <Link to="/">
          <Button variant="outline" size="sm" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </Link>
        <Button onClick={handlePrint} size="lg" className="shadow-lg" data-testid="print-btn">
          <Printer className="w-5 h-5 mr-2" />
          Bon drucken
        </Button>
      </div>

      {/* Receipt - optimized for 80mm thermal printer */}
      <div className="print-area receipt-container">
        <div className="receipt-content">
          {/* Store header */}
          <div className="receipt-header">
            <div className="store-name">{STORE_INFO.name}</div>
            <div className="store-info">{STORE_INFO.address}</div>
            <div className="store-info">{STORE_INFO.city}</div>
            <div className="store-info">{STORE_INFO.phone}</div>
          </div>

          <div className="receipt-divider">================================</div>

          {/* Receipt title */}
          <div className="receipt-title">ANKAUFSQUITTUNG</div>
          <div className="receipt-date">
            {formatDate(purchase.timestamp)} {formatTime(purchase.timestamp)}
          </div>
          <div className="receipt-id">Nr. {purchase.id.slice(0, 8).toUpperCase()}</div>

          <div className="receipt-divider">--------------------------------</div>

          {/* Items */}
          <div className="receipt-items">
            {purchase.items.map((item, index) => (
              <div key={index} className="receipt-item">
                <div className="item-name">{item.category}</div>
                <div className="item-details">
                  {item.price_level} / {item.condition}
                </div>
                <div className="item-details">{item.relevance}</div>
                <div className="item-price">CHF {item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="receipt-divider">--------------------------------</div>

          {/* Total */}
          <div className="receipt-summary">
            <div className="summary-row">
              <span>Artikel:</span>
              <span>{purchase.items.length}</span>
            </div>
          </div>

          <div className="receipt-divider">================================</div>

          <div className="receipt-total">
            <span>TOTAL</span>
            <span>CHF {purchase.total.toFixed(2)}</span>
          </div>

          <div className="receipt-divider">================================</div>

          {/* Footer */}
          <div className="receipt-footer">
            <div>Vielen Dank für Ihren Verkauf!</div>
            <div className="receipt-small">Diese Quittung dient als Nachweis.</div>
          </div>

          <div className="receipt-spacer"></div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        /* Screen preview styles */
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

        .receipt-content {
          text-align: center;
        }

        .receipt-header {
          margin-bottom: 10px;
        }

        .store-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .store-info {
          font-size: 12px;
          color: #666;
        }

        .receipt-divider {
          font-size: 12px;
          color: #999;
          margin: 10px 0;
          letter-spacing: -1px;
        }

        .receipt-title {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 2px;
          margin: 10px 0 5px;
        }

        .receipt-date {
          font-size: 12px;
          color: #666;
        }

        .receipt-id {
          font-size: 11px;
          color: #999;
          margin-bottom: 10px;
        }

        .receipt-items {
          text-align: left;
        }

        .receipt-item {
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #ddd;
        }

        .receipt-item:last-child {
          border-bottom: none;
        }

        .item-name {
          font-weight: bold;
          font-size: 14px;
        }

        .item-details {
          font-size: 11px;
          color: #666;
        }

        .item-price {
          font-size: 14px;
          font-weight: bold;
          text-align: right;
          margin-top: 4px;
        }

        .receipt-summary {
          text-align: left;
          font-size: 12px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
        }

        .receipt-total {
          display: flex;
          justify-content: space-between;
          font-size: 20px;
          font-weight: bold;
          padding: 10px 0;
        }

        .receipt-footer {
          margin-top: 15px;
          font-size: 12px;
        }

        .receipt-small {
          font-size: 10px;
          color: #999;
          margin-top: 5px;
        }

        .receipt-spacer {
          height: 30px;
        }

        /* Print styles for Epson TM-m30II (80mm = ~302px @ 203dpi) */
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
          }

          .no-print {
            display: none !important;
          }

          .receipt-container {
            width: 80mm;
            max-width: 80mm;
            margin: 0;
            padding: 3mm;
            box-shadow: none;
            font-size: 12px;
          }

          .store-name {
            font-size: 14px;
          }

          .store-info {
            font-size: 10px;
          }

          .receipt-divider {
            font-size: 10px;
            margin: 5px 0;
          }

          .receipt-title {
            font-size: 14px;
          }

          .receipt-date, .receipt-id {
            font-size: 10px;
          }

          .item-name {
            font-size: 12px;
          }

          .item-details {
            font-size: 9px;
          }

          .item-price {
            font-size: 12px;
          }

          .receipt-total {
            font-size: 16px;
          }

          .receipt-footer {
            font-size: 10px;
          }

          .receipt-small {
            font-size: 8px;
          }

          .receipt-spacer {
            height: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
