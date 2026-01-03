import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Trash2, FileSpreadsheet, CheckCircle, AlertCircle, Plus, X, Palette, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function SettingsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);
  
  // Custom categories
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState({
    danger_zone_password: '',
    colors: {
      luxus: '#FEF3C7',
      teuer: '#DBEAFE',
      mittel: '#D1FAE5',
      guenstig: '#F1F5F9'
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesData, settingsData] = await Promise.all([
        api.getCustomCategories(),
        api.getSettings()
      ]);
      setCustomCategories(categoriesData);
      if (settingsData) {
        setSettings(prev => ({
          ...prev,
          ...settingsData,
          colors: { ...prev.colors, ...settingsData.colors }
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await api.downloadPriceMatrix();
      toast.success('Excel heruntergeladen');
    } catch (error) {
      toast.error('Fehler beim Download');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearPrices = async () => {
    // Check password if set
    if (settings.danger_zone_password && passwordInput !== settings.danger_zone_password) {
      toast.error('Falsches Passwort');
      return;
    }
    
    try {
      await api.clearPriceMatrix();
      toast.success('Alle Fixpreise gelöscht');
      setUploadResult(null);
      setPasswordInput('');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Name erforderlich');
      return;
    }
    
    setIsAddingCategory(true);
    try {
      await api.addCustomCategory(newCategoryName.trim());
      toast.success(`Kategorie "${newCategoryName}" hinzugefügt`);
      setNewCategoryName('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Hinzufügen');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (name) => {
    try {
      await api.deleteCustomCategory(name);
      toast.success(`Kategorie "${name}" gelöscht`);
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleSavePassword = async () => {
    try {
      await api.updateSettings({ ...settings, danger_zone_password: newPassword });
      setSettings(prev => ({ ...prev, danger_zone_password: newPassword }));
      toast.success('Passwort gespeichert');
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleColorChange = async (key, value) => {
    const newColors = { ...settings.colors, [key]: value };
    setSettings(prev => ({ ...prev, colors: newColors }));
    
    try {
      await api.updateSettings({ ...settings, colors: newColors });
      toast.success('Farbe gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
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
            <h1 className="text-xl font-bold text-primary">Einstellungen</h1>
            <p className="text-sm text-muted-foreground">Preise, Kategorien & Design</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-4xl">
        <Tabs defaultValue="prices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prices">Preismatrix</TabsTrigger>
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
          </TabsList>

          {/* Prices Tab */}
          <TabsContent value="prices" className="space-y-6">
            {/* Info Card */}
            <Card>
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
                  <p><strong>Excel herunterladen:</strong> Lade die Vorlage mit allen Kombinationen herunter.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <p><strong>Fixpreise eintragen:</strong> Fülle die Spalte "Fixpreis" aus.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <p><strong>Excel hochladen:</strong> Die Preise werden automatisch übernommen.</p>
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
                    Vorlage mit allen Kombinationen
                  </p>
                  <Button className="mt-4" disabled={isDownloading} data-testid="download-btn">
                    <Download className="w-4 h-4 mr-2" />
                    {isDownloading ? 'Lädt...' : 'Download'}
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
                    Ausgefüllte Excel mit Fixpreisen
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
                  />
                </CardContent>
              </Card>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <Card className={`${uploadResult.success ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  {uploadResult.success ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  <p className={`font-medium ${uploadResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                    {uploadResult.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Gefahrenzone
                  {settings.danger_zone_password && (
                    <Lock className="w-4 h-4 text-amber-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Alle gespeicherten Fixpreise löschen.
                </p>
                
                {settings.danger_zone_password && (
                  <div className="space-y-2">
                    <Label>Passwort eingeben</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Passwort"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
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
                          Diese Aktion löscht alle gespeicherten Fixpreise.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearPrices}>
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                    <Lock className="w-4 h-4 mr-2" />
                    Passwort {settings.danger_zone_password ? 'ändern' : 'setzen'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Eigene Kategorien</CardTitle>
                <CardDescription>
                  Füge zusätzliche Kleidungskategorien hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Neue Kategorie (z.B. Accessoires)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button onClick={handleAddCategory} disabled={isAddingCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                </div>

                {customCategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Eigene Kategorien</Label>
                    <div className="flex flex-wrap gap-2">
                      {customCategories.map((cat) => (
                        <div
                          key={cat}
                          className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm"
                        >
                          {cat}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteCategory(cat)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <Label className="text-muted-foreground">Standard-Kategorien (17)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kleider, Strickmode/Cardigans, Sweatshirt, Hoodie, Hosen, Jeans, Jacken, Blazer, Mäntel, Shirts, Top, Hemd, Bluse, Röcke/Jupe, Sportbekleidung, Bademode, Shorts
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Farben anpassen
                </CardTitle>
                <CardDescription>
                  Passe die Farben der Preisniveau-Buttons an
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: 'luxus', label: 'Luxus', defaultColor: '#FEF3C7' },
                  { key: 'teuer', label: 'Teuer', defaultColor: '#DBEAFE' },
                  { key: 'mittel', label: 'Mittel', defaultColor: '#D1FAE5' },
                  { key: 'guenstig', label: 'Günstig', defaultColor: '#F1F5F9' }
                ].map(({ key, label, defaultColor }) => (
                  <div key={key} className="flex items-center gap-4">
                    <div 
                      className="w-16 h-12 rounded-lg border-2 flex items-center justify-center font-medium text-sm"
                      style={{ backgroundColor: settings.colors[key] || defaultColor }}
                    >
                      {label}
                    </div>
                    <div className="flex-1">
                      <Label>{label}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={settings.colors[key] || defaultColor}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={settings.colors[key] || defaultColor}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          placeholder="#FFFFFF"
                          className="w-32"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleColorChange(key, defaultColor)}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gefahrenzone-Passwort</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Setze ein Passwort um die Gefahrenzone zu schützen.
            </p>
            <div className="space-y-2">
              <Label>Neues Passwort</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Passwort eingeben (leer = kein Schutz)"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSavePassword}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
