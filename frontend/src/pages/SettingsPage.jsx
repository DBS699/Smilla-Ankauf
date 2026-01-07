import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smile } from 'lucide-react'; // Keep Smile for button default
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES } from '@/lib/constants';
import api from '@/lib/api';
// Shared icons
import { iconMap } from '@/lib/icons';

// Default receipt settings
const DEFAULT_RECEIPT = {
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

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // Custom categories
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [newCategoryIcon, setNewCategoryIcon] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Settings
  const [settings, setSettings] = useState({
    colors: {
      luxus: '#FEF3C7', teuer: '#DBEAFE', mittel: '#D1FAE5', guenstig: '#F1F5F9',
      neu: '#D1FAE5', kaum_benutzt: '#E0F2FE', gebraucht: '#FED7AA', abgenutzt: '#FECACA',
      stark_relevant: '#DDD6FE', wichtig: '#CFFAFE', nicht_beliebt: '#F3F4F6'
    },
    hidden_categories: [],
    brand_examples: {
      luxus: ['Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Hermès'],
      teuer: ['Hugo Boss', 'Tommy Hilfiger', 'Ralph Lauren', 'Calvin Klein', 'Lacoste'],
      mittel: ['Zara', 'H&M Premium', 'Mango', 'COS', 'Massimo Dutti'],
      guenstig: ['H&M', 'Primark', 'C&A', 'Takko', 'KiK']
    }
  });

  // Brand examples editing
  const [newBrand, setNewBrand] = useState({ luxus: '', teuer: '', mittel: '', guenstig: '' });

  // Receipt settings
  const [receiptSettings, setReceiptSettings] = useState(DEFAULT_RECEIPT);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesData, settingsData, receiptData] = await Promise.all([
        api.getCustomCategories(),
        api.getSettings(),
        api.getReceiptSettings()
      ]);
      setCustomCategories(categoriesData);
      if (settingsData) {
        setSettings(prev => ({
          ...prev,
          ...settingsData,
          colors: { ...prev.colors, ...settingsData.colors },
          hidden_categories: settingsData.hidden_categories || [],
          brand_examples: { ...prev.brand_examples, ...settingsData.brand_examples }
        }));
      }
      if (receiptData) {
        setReceiptSettings({ ...DEFAULT_RECEIPT, ...receiptData });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Add brand to a price level
  const addBrand = async (level) => {
    if (!newBrand[level].trim()) return;

    const updatedBrands = {
      ...settings.brand_examples,
      [level]: [...(settings.brand_examples[level] || []), newBrand[level].trim()]
    };

    const newSettings = { ...settings, brand_examples: updatedBrands };
    setSettings(newSettings);
    setNewBrand(prev => ({ ...prev, [level]: '' }));

    try {
      await api.updateSettings(newSettings);
      toast.success('Marke hinzugefügt');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Remove brand from a price level
  const removeBrand = async (level, brand) => {
    const updatedBrands = {
      ...settings.brand_examples,
      [level]: (settings.brand_examples[level] || []).filter(b => b !== brand)
    };

    const newSettings = { ...settings, brand_examples: updatedBrands };
    setSettings(newSettings);

    try {
      await api.updateSettings(newSettings);
      toast.success('Marke entfernt');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Receipt settings handlers
  const updateReceiptSetting = async (key, value) => {
    const newSettings = { ...receiptSettings, [key]: value };
    setReceiptSettings(newSettings);

    // Debounce save
    clearTimeout(window.receiptSaveTimeout);
    window.receiptSaveTimeout = setTimeout(async () => {
      try {
        await api.updateReceiptSettings(newSettings);
      } catch (error) {
        console.error('Failed to save receipt settings:', error);
      }
    }, 500);
  };

  const resetReceiptSettings = async () => {
    setReceiptSettings(DEFAULT_RECEIPT);
    try {
      await api.updateReceiptSettings(DEFAULT_RECEIPT);
      toast.success('Quittung zurückgesetzt');
    } catch (error) {
      toast.error('Fehler beim Zurücksetzen');
    }
  };

  // ... other handlers remain the same
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await api.downloadPriceMatrix();
      toast.success('Excel heruntergeladen');
    } catch (error) {
      toast.error('Fehler beim Download');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Bitte eine Excel-Datei hochladen');
      return;
    }
    setIsUploading(true);
    setUploadResult(null);
    try {
      const result = await api.uploadPriceMatrix(file);
      setUploadResult({ success: true, message: result.message });
      toast.success(result.message);
    } catch (error) {
      setUploadResult({ success: false, message: error.response?.data?.detail || 'Fehler' });
      toast.error('Fehler beim Hochladen');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearPrices = async () => {
    if (!isAdmin()) return toast.error('Nur Admins');
    try {
      await api.clearPriceMatrix();
      toast.success('Fixpreise gelöscht');
      setUploadResult(null);
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const handleImageSelect = (e, forNew = true) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 500000) return toast.error('Bild zu gross (max 500KB)');
    const reader = new FileReader();
    reader.onloadend = () => {
      if (forNew) setNewCategoryImage(reader.result);
      else if (editingCategory) handleUpdateCategoryImage(editingCategory, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return toast.error('Name erforderlich');
    setIsAddingCategory(true);
    try {
      await api.addCustomCategory(newCategoryName.trim(), newCategoryImage, newCategoryIcon);
      toast.success(`"${newCategoryName}" hinzugefügt`);
      setNewCategoryName('');
      setNewCategoryImage(null);
      setNewCategoryIcon(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleUpdateCategoryImage = async (name, image) => {
    try {
      await api.updateCategoryImage(name, image);
      toast.success('Bild aktualisiert');
      setEditingCategory(null);
      loadData();
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const handleDeleteCategory = async (name) => {
    if (!isAdmin()) return toast.error('Nur Admins');
    try {
      await api.deleteCustomCategory(name);
      toast.success(`"${name}" gelöscht`);
      loadData();
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const handleColorChange = async (key, value) => {
    const newColors = { ...settings.colors, [key]: value };
    setSettings(prev => ({ ...prev, colors: newColors }));
    try {
      await api.updateSettings({ ...settings, colors: newColors });
    } catch (error) { }
  };

  const toggleCategoryVisibility = async (name) => {
    const isHidden = settings.hidden_categories.includes(name);
    const newHidden = isHidden
      ? settings.hidden_categories.filter(c => c !== name)
      : [...settings.hidden_categories, name];
    setSettings(prev => ({ ...prev, hidden_categories: newHidden }));
    try {
      await api.updateSettings({ ...settings, hidden_categories: newHidden });
    } catch (error) { }
  };

  const hideAllStandardCategories = async () => {
    const all = CATEGORIES.map(c => c.name);
    setSettings(prev => ({ ...prev, hidden_categories: all }));
    try { await api.updateSettings({ ...settings, hidden_categories: all }); } catch { }
  };

  const showAllStandardCategories = async () => {
    setSettings(prev => ({ ...prev, hidden_categories: [] }));
    try { await api.updateSettings({ ...settings, hidden_categories: [] }); } catch { }
  };

  const colorGroups = [
    {
      title: 'Preisniveau', colors: [
        { key: 'luxus', label: 'Luxus', dc: '#FEF3C7' },
        { key: 'teuer', label: 'Teuer', dc: '#DBEAFE' },
        { key: 'mittel', label: 'Mittel', dc: '#D1FAE5' },
        { key: 'guenstig', label: 'Günstig', dc: '#F1F5F9' }
      ]
    },
    {
      title: 'Zustand', colors: [
        { key: 'neu', label: 'Neu', dc: '#D1FAE5' },
        { key: 'kaum_benutzt', label: 'Kaum benutzt', dc: '#E0F2FE' },
        { key: 'gebraucht', label: 'Gebraucht', dc: '#FED7AA' },
        { key: 'abgenutzt', label: 'Abgenutzt', dc: '#FECACA' }
      ]
    },
    {
      title: 'Relevanz', colors: [
        { key: 'stark_relevant', label: 'Stark relevant', dc: '#DDD6FE' },
        { key: 'wichtig', label: 'Wichtig', dc: '#CFFAFE' },
        { key: 'nicht_beliebt', label: 'Nicht beliebt', dc: '#F3F4F6' }
      ]
    }
  ];

  // Sample receipt data for preview
  const sampleItems = [
    { category: 'Jeans', price_level: 'Mittel', condition: 'Gebraucht/Gut', relevance: 'Wichtig', price: 15 },
    { category: 'Hoodie', price_level: 'Teuer', condition: 'Kaum benutzt', relevance: 'Stark relevant', price: 25 }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Zurück</Button></Link>
          <div>
            <h1 className="text-xl font-bold text-primary">Einstellungen</h1>
            <p className="text-sm text-muted-foreground">Kategorien, Preise, Quittung & Design</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs defaultValue={isAdmin() ? "receipt" : "brands"} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin() ? 'grid-cols-5' : 'grid-cols-2'}`}>
            {isAdmin() && <TabsTrigger value="receipt">Quittung</TabsTrigger>}
            <TabsTrigger value="brands">Marken</TabsTrigger>
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            {isAdmin() && <TabsTrigger value="prices">Preismatrix</TabsTrigger>}
            {isAdmin() && <TabsTrigger value="design">Design</TabsTrigger>}
          </TabsList>

          {/* Receipt Tab - Admin Only */}
          {isAdmin() && (
            <TabsContent value="receipt" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Controls */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Type className="w-5 h-5" />
                        Texte bearbeiten
                      </CardTitle>
                      <CardDescription>Klicke auf die Vorschau rechts oder bearbeite hier</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Firmenname</Label>
                        <Input value={receiptSettings.store_name} onChange={(e) => updateReceiptSetting('store_name', e.target.value)} />
                      </div>
                      <div>
                        <Label>Adresse</Label>
                        <Input value={receiptSettings.store_address} onChange={(e) => updateReceiptSetting('store_address', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Stadt</Label>
                          <Input value={receiptSettings.store_city} onChange={(e) => updateReceiptSetting('store_city', e.target.value)} />
                        </div>
                        <div>
                          <Label>Telefon</Label>
                          <Input value={receiptSettings.store_phone} onChange={(e) => updateReceiptSetting('store_phone', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label>Fusszeile</Label>
                        <Input value={receiptSettings.footer_text} onChange={(e) => updateReceiptSetting('footer_text', e.target.value)} />
                      </div>
                      <div>
                        <Label>Kleine Fusszeile</Label>
                        <Input value={receiptSettings.sub_footer_text} onChange={(e) => updateReceiptSetting('sub_footer_text', e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Schriftgrössen</CardTitle>
                      <CardDescription>Ziehe die Slider - Änderungen sind sofort sichtbar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {[
                        { key: 'font_size_store', label: 'Firmenname', min: 12, max: 28 },
                        { key: 'font_size_title', label: 'Titel (ANKAUFSQUITTUNG)', min: 10, max: 24 },
                        { key: 'font_size_items', label: 'Artikel', min: 8, max: 18 },
                        { key: 'font_size_total', label: 'Total', min: 14, max: 32 },
                        { key: 'font_size_footer', label: 'Fusszeile', min: 8, max: 16 },
                      ].map(({ key, label, min, max }) => (
                        <div key={key}>
                          <div className="flex justify-between mb-2">
                            <Label>{label}</Label>
                            <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{receiptSettings[key]}px</span>
                          </div>
                          <Slider
                            value={[receiptSettings[key]]}
                            onValueChange={([val]) => updateReceiptSetting(key, val)}
                            min={min}
                            max={max}
                            step={1}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Elemente anzeigen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { key: 'show_store_name', label: 'Firmenname' },
                        { key: 'show_address', label: 'Adresse & Stadt' },
                        { key: 'show_phone', label: 'Telefon' },
                        { key: 'show_date', label: 'Datum & Zeit' },
                        { key: 'show_receipt_id', label: 'Quittungs-Nr.' },
                        { key: 'show_item_details', label: 'Artikel-Details (Niveau/Zustand)' },
                        { key: 'show_relevance', label: 'Relevanz' },
                        { key: 'show_item_count', label: 'Anzahl Artikel' },
                        { key: 'show_footer', label: 'Fusszeile' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label>{label}</Label>
                          <Switch checked={receiptSettings[key]} onCheckedChange={(v) => updateReceiptSetting(key, v)} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Button variant="outline" onClick={resetReceiptSettings} className="w-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Auf Standard zurücksetzen
                  </Button>
                </div>

                {/* Right: Live Preview */}
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Live-Vorschau
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white border rounded-lg p-4 font-mono text-center max-w-[320px] mx-auto shadow-inner">
                        {/* Store Header */}
                        {receiptSettings.show_store_name && (
                          <div style={{ fontSize: receiptSettings.font_size_store }} className="font-bold mb-1">
                            {receiptSettings.store_name}
                          </div>
                        )}
                        {receiptSettings.show_address && (
                          <>
                            <div className="text-xs text-gray-600">{receiptSettings.store_address}</div>
                            <div className="text-xs text-gray-600">{receiptSettings.store_city}</div>
                          </>
                        )}
                        {receiptSettings.show_phone && (
                          <div className="text-xs text-gray-600">{receiptSettings.store_phone}</div>
                        )}

                        <div className="text-xs text-gray-400 my-2">================================</div>

                        <div style={{ fontSize: receiptSettings.font_size_title }} className="font-bold tracking-wider">
                          ANKAUFSQUITTUNG
                        </div>
                        {receiptSettings.show_date && (
                          <div className="text-xs text-gray-600">03.01.2026 14:30</div>
                        )}
                        {receiptSettings.show_receipt_id && (
                          <div className="text-xs text-gray-400">Nr. A1B2C3D4</div>
                        )}

                        <div className="text-xs text-gray-400 my-2">--------------------------------</div>

                        {/* Items */}
                        <div className="text-left" style={{ fontSize: receiptSettings.font_size_items }}>
                          {sampleItems.map((item, i) => (
                            <div key={i} className="mb-2 pb-2 border-b border-dashed border-gray-200 last:border-0">
                              <div className="font-bold">{item.category}</div>
                              {receiptSettings.show_item_details && (
                                <div className="text-xs text-gray-500">{item.price_level} / {item.condition}</div>
                              )}
                              {receiptSettings.show_relevance && (
                                <div className="text-xs text-gray-500">{item.relevance}</div>
                              )}
                              <div className="text-right font-bold">CHF {item.price.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>

                        <div className="text-xs text-gray-400 my-2">--------------------------------</div>

                        {receiptSettings.show_item_count && (
                          <div className="flex justify-between text-xs mb-1">
                            <span>Artikel:</span>
                            <span>{sampleItems.length}</span>
                          </div>
                        )}

                        <div className="text-xs text-gray-400 my-2">================================</div>

                        <div className="flex justify-between font-bold" style={{ fontSize: receiptSettings.font_size_total }}>
                          <span>TOTAL</span>
                          <span>CHF {sampleItems.reduce((s, i) => s + i.price, 0).toFixed(2)}</span>
                        </div>

                        <div className="text-xs text-gray-400 my-2">================================</div>

                        {receiptSettings.show_footer && (
                          <div style={{ fontSize: receiptSettings.font_size_footer }}>
                            <div>{receiptSettings.footer_text}</div>
                            <div className="text-xs text-gray-400 mt-1">{receiptSettings.sub_footer_text}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Markenbeispiele nach Preisniveau
                </CardTitle>
                <CardDescription>
                  Diese Marken werden als Beispiele beim Hover über das Info-Symbol bei der Preisniveau-Auswahl angezeigt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { id: 'luxus', name: 'Luxus', color: '#FEF3C7' },
                  { id: 'teuer', name: 'Teuer', color: '#DBEAFE' },
                  { id: 'mittel', name: 'Mittel', color: '#D1FAE5' },
                  { id: 'guenstig', name: 'Günstig', color: '#F1F5F9' }
                ].map((level) => (
                  <div key={level.id} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: level.color }} />
                      {level.name}
                    </Label>

                    {/* Current brands */}
                    <div className="flex flex-wrap gap-2">
                      {(settings.brand_examples[level.id] || []).map((brand, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                        >
                          <span>{brand}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeBrand(level.id, brand)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Add new brand */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Neue Marke hinzufügen..."
                        value={newBrand[level.id] || ''}
                        onChange={(e) => setNewBrand(prev => ({ ...prev, [level.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addBrand(level.id)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => addBrand(level.id)}
                        disabled={!newBrand[level.id]?.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Eye className="w-5 h-5" />Standard-Kategorien ({17 - settings.hidden_categories.length} sichtbar)</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={hideAllStandardCategories} disabled={settings.hidden_categories.length === 17}>
                      <EyeOff className="w-4 h-4 mr-1" />Alle ausblenden
                    </Button>
                    <Button variant="outline" size="sm" onClick={showAllStandardCategories} disabled={settings.hidden_categories.length === 0}>
                      <RotateCcw className="w-4 h-4 mr-1" />Alle zeigen
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => {
                    const isHidden = settings.hidden_categories.includes(cat.name);
                    return (
                      <div key={cat.id} className={`flex items-center justify-between p-3 rounded-lg border ${isHidden ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                        <span className={`text-sm ${isHidden ? 'line-through text-gray-400' : ''}`}>{cat.name}</span>
                        <Switch checked={!isHidden} onCheckedChange={() => toggleCategoryVisibility(cat.name)} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" />Eigene Kategorien ({customCategories.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>Name</Label>
                    <Input placeholder="z.B. Accessoires" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <Label>Icon (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="w-10 h-10">
                          {newCategoryIcon ? (
                            (() => {
                              const I = iconMap[newCategoryIcon];
                              return I ? <I className="w-5 h-5" /> : <Smile className="w-5 h-5" />;
                            })()
                          ) : (
                            <Smile className="w-5 h-5 text-muted-foreground" />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2">
                        <div className="grid grid-cols-5 gap-2">
                          {Object.keys(iconMap).map((iconName) => {
                            const IconComp = iconMap[iconName];
                            return (
                              <Button
                                key={iconName}
                                variant={newCategoryIcon === iconName ? "default" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setNewCategoryIcon(iconName)}
                              >
                                <IconComp className="w-4 h-4" />
                              </Button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Bild (Optional)</Label>
                    {newCategoryImage ? (
                      <div className="relative w-10 h-10">
                        <img src={newCategoryImage} alt="" className="w-10 h-10 rounded object-cover" />
                        <button className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs" onClick={() => setNewCategoryImage(null)}>×</button>
                      </div>
                    ) : (
                      <Button variant="outline" size="icon" onClick={() => document.getElementById('new-cat-img').click()}><Camera className="w-4 h-4" /></Button>
                    )}
                    <input id="new-cat-img" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, true)} />
                  </div>
                  <Button onClick={handleAddCategory} disabled={isAddingCategory}><Plus className="w-4 h-4 mr-2" />Hinzufügen</Button>
                </div>
                {customCategories.length > 0 && (
                  <div className="grid gap-3">
                    {customCategories.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                        {cat.image ? <img src={cat.image} alt="" className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center"><Image className="w-6 h-6 text-gray-400" /></div>}
                        <span className="flex-1 font-medium">{cat.name}</span>
                        <Button variant="outline" size="sm" onClick={() => { setEditingCategory(cat.name); document.getElementById('edit-cat-img').click(); }}><Camera className="w-4 h-4" /></Button>
                        {isAdmin() && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCategory(cat.name)}><X className="w-4 h-4" /></Button>}
                      </div>
                    ))}
                    <input id="edit-cat-img" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, false)} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prices Tab - Admin Only */}
          {isAdmin() && (
            <TabsContent value="prices" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="cursor-pointer hover:border-primary" onClick={handleDownload}>
                  <CardContent className="p-6 flex flex-col items-center">
                    <Download className="w-12 h-12 text-emerald-600 mb-3" />
                    <h3 className="font-semibold">Excel herunterladen</h3>
                    <Button className="mt-4" disabled={isDownloading}>{isDownloading ? 'Lädt...' : 'Download'}</Button>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary" onClick={handleUploadClick}>
                  <CardContent className="p-6 flex flex-col items-center">
                    <Upload className="w-12 h-12 text-blue-600 mb-3" />
                    <h3 className="font-semibold">Excel hochladen</h3>
                    <Button className="mt-4" disabled={isUploading}>{isUploading ? 'Lädt...' : 'Hochladen'}</Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                  </CardContent>
                </Card>
              </div>
              {uploadResult && (
                <Card className={uploadResult.success ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}>
                  <CardContent className="p-4 flex items-center gap-3">
                    {uploadResult.success ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
                    <p className="font-medium">{uploadResult.message}</p>
                  </CardContent>
                </Card>
              )}
              {isAdmin() && (
                <Card className="border-red-200">
                  <CardHeader><CardTitle className="text-red-600 flex items-center gap-2"><Shield className="w-5 h-5" />Gefahrenzone</CardTitle></CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="w-4 h-4 mr-2" />Alle Fixpreise löschen</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Alle löschen?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleClearPrices}>Löschen</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Design Tab - Admin Only */}
          {isAdmin() && (
            <TabsContent value="design" className="space-y-6">
              {colorGroups.map((group) => (
                <Card key={group.title}>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />{group.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {group.colors.map(({ key, label, dc }) => (
                      <div key={key} className="flex items-center gap-4">
                        <div className="w-20 h-10 rounded-lg border-2 flex items-center justify-center font-medium text-xs" style={{ backgroundColor: settings.colors[key] || dc }}>{label}</div>
                        <Input type="color" value={settings.colors[key] || dc} onChange={(e) => handleColorChange(key, e.target.value)} className="w-14 h-10 p-1" />
                        <Input type="text" value={settings.colors[key] || dc} onChange={(e) => handleColorChange(key, e.target.value)} className="w-28" />
                        <Button variant="outline" size="sm" onClick={() => handleColorChange(key, dc)}>Reset</Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
