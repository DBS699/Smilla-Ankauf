import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Trash2, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function SettingsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleDownload = () => {
    const downloadUrl = api.downloadPriceMatrix();
    window.open(downloadUrl, '_blank');
    toast.success('Excel-Download gestartet');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Bitte eine Excel-Datei (.xlsx) hochladen');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await api.uploadPriceMatrix(file);
      setUploadResult({ success: true, message: result.message, count: result.updated });
      toast.success(result.message);
    } catch (error) {
      const message = error.response?.data?.detail || 'Fehler beim Hochladen';
      setUploadResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearPrices = async () => {
    try {
      await api.clearPriceMatrix();
      toast.success('Alle Fixpreise gelöscht');
      setUploadResult(null);
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  return (
    <div className="min-h-screen" data-testid="settings-page">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" data-testid="back-to-main">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-primary">Preismatrix</h1>
            <p className="text-sm text-muted-foreground">Fixpreise verwalten</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-3xl">
        {/* Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              So funktioniert's
            </CardTitle>
            <CardDescription>
              Verwalte Fixpreise für alle Kategorie-Kombinationen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <p><strong>Excel herunterladen:</strong> Lade die Vorlage mit allen Kombinationen (Kategorie, Preisniveau, Zustand, Relevanz) herunter.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              <p><strong>Fixpreise eintragen:</strong> Fülle die Spalte "Fixpreis" aus. Leere Felder bedeuten, dass der Preis manuell eingegeben werden muss.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              <p><strong>Excel hochladen:</strong> Lade die ausgefüllte Excel hoch. Die Preise werden automatisch übernommen.</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Download */}
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleDownload}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Download className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold mb-2">Excel herunterladen</h3>
              <p className="text-sm text-muted-foreground">
                Vorlage mit allen {17 * 4 * 4 * 3} Kombinationen
              </p>
              <Button className="mt-4" data-testid="download-btn">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </CardContent>
          </Card>

          {/* Upload */}
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleUploadClick}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Excel hochladen</h3>
              <p className="text-sm text-muted-foreground">
                Ausgefüllte Excel mit Fixpreisen importieren
              </p>
              <Button className="mt-4" disabled={isUploading} data-testid="upload-btn">
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Wird hochgeladen...' : 'Hochladen'}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                data-testid="file-input"
              />
            </CardContent>
          </Card>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <Card className={`mt-6 ${uploadResult.success ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {uploadResult.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${uploadResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {uploadResult.message}
                </p>
                {uploadResult.count && (
                  <p className="text-sm text-emerald-700">
                    {uploadResult.count} Preise wurden importiert
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="mt-8 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Gefahrenzone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Alle gespeicherten Fixpreise löschen. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="clear-prices-btn">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Alle Fixpreise löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Fixpreise löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion löscht alle gespeicherten Fixpreise. Du musst danach wieder eine neue Excel hochladen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearPrices}>
                    Ja, alle löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
