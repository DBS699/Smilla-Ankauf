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
        <Button onClick={handlePrint} data-testid="print-btn">
          <Printer className="w-4 h-4 mr-2" />
          Drucken
        </Button>
      </div>

      {/* Receipt */}
      <div className="print-area max-w-md mx-auto p-8 pt-20">
        <div className="receipt-font text-center space-y-6">
          {/* Store header */}
          <div className="border-b-2 border-dashed border-gray-300 pb-6">
            <h1 className="text-2xl font-bold tracking-wider">{STORE_INFO.name}</h1>
            <p className="text-sm text-gray-600 mt-1">{STORE_INFO.address}</p>
            <p className="text-sm text-gray-600">{STORE_INFO.city}</p>
            <p className="text-sm text-gray-600">{STORE_INFO.phone}</p>
          </div>

          {/* Receipt title */}
          <div>
            <h2 className="text-xl font-bold tracking-widest">ANKAUFSQUITTUNG</h2>
            <p className="text-sm text-gray-600 mt-2">
              {formatDate(purchase.timestamp)} • {formatTime(purchase.timestamp)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Nr. {purchase.id.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Items */}
          <div className="border-t border-b border-gray-200 py-4">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="pb-2">Artikel</th>
                  <th className="pb-2 text-right">Preis</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {purchase.items.map((item, index) => (
                  <tr key={index} className="border-b border-dashed border-gray-100 last:border-0">
                    <td className="py-2">
                      <p className="font-medium">{item.category}</p>
                      <p className="text-xs text-gray-500">
                        {item.price_level} • {item.condition}
                      </p>
                    </td>
                    <td className="py-2 text-right font-bold">
                      CHF {item.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="text-right">
            <div className="inline-block text-left">
              <div className="flex justify-between gap-8 text-sm text-gray-600">
                <span>Anzahl Artikel:</span>
                <span className="font-bold">{purchase.items.length}</span>
              </div>
              <div className="flex justify-between gap-8 mt-2 text-lg border-t border-gray-300 pt-2">
                <span className="font-bold">TOTAL:</span>
                <span className="font-bold text-2xl" data-testid="receipt-total">
                  CHF {purchase.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-dashed border-gray-300 pt-6 text-center">
            <p className="text-sm text-gray-600">Vielen Dank für Ihren Verkauf!</p>
            <p className="text-xs text-gray-400 mt-2">
              Diese Quittung dient als Nachweis des Ankaufs.
            </p>
          </div>

          {/* Decorative bottom */}
          <div className="text-gray-300 text-xs tracking-widest">
            ••••••••••••••••••••••••••••••••••••
          </div>
        </div>
      </div>
    </div>
  );
}
