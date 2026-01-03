import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Trash2, FileSpreadsheet, CheckCircle, AlertCircle, Plus, X, Palette, Lock, Eye, EyeOff, Shield, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// Available icons for categories
const AVAILABLE_ICONS = [
  'Shirt', 'Layers', 'Ruler', 'Briefcase', 'Scissors', 'Dumbbell', 'Waves',
  'Crown', 'Star', 'Heart', 'Sparkles', 'Gem', 'Gift', 'Tag', 'ShoppingBag'
];

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);
  
  // Custom categories
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Shirt');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState({
    danger_zone_password: '',
    colors: {
      // Price levels
      luxus: '#FEF3C7',
      teuer: '#DBEAFE',
      mittel: '#D1FAE5',
      guenstig: '#F1F5F9',
      // Conditions
      neu: '#D1FAE5',
      kaum_benutzt: '#E0F2FE',
      gebraucht: '#FED7AA',
      abgenutzt: '#FECACA',
      // Relevance
      stark_relevant: '#DDD6FE',
      wichtig: '#CFFAFE',
      nicht_beliebt: '#F3F4F6'
    },
    category_icons: {}
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
          colors: { ...prev.colors, ...settingsData.colors },
          category_icons: { ...prev.category_icons, ...settingsData.category_icons }
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
    if (!isAdmin()) {
      toast.error('Nur Admins können Fixpreise löschen');
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
      
      // Save icon for this category
      const newIcons = { ...settings.category_icons, [newCategoryName.trim()]: newCategoryIcon };
      await api.updateSettings({ ...settings, category_icons: newIcons });
      setSettings(prev => ({ ...prev, category_icons: newIcons }));
      
      toast.success(`Kategorie "${newCategoryName}" hinzugefügt`);
      setNewCategoryName('');
      setNewCategoryIcon('Shirt');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Hinzufügen');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (name) => {
    if (!isAdmin()) {
      toast.error('Nur Admins können Kategorien löschen');
      return;
    }
    
    try {
      await api.deleteCustomCategory(name);
      toast.success(`Kategorie "${name}" gelöscht`);
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleSavePassword = async () => {
    if (!isAdmin()) {
      toast.error('Nur Admins können das Passwort ändern');
      return;
    }
    
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
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleCategoryIconChange = async (categoryName, icon) => {
    const newIcons = { ...settings.category_icons, [categoryName]: icon };
    setSettings(prev => ({ ...prev, category_icons: newIcons }));
    
    try {
      await api.updateSettings({ ...settings, category_icons: newIcons });
      toast.success('Icon gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const colorGroups = [
    {
      title: 'Preisniveau',
      colors: [
        { key: 'luxus', label: 'Luxus', defaultColor: '#FEF3C7' },
        { key: 'teuer', label: 'Teuer', defaultColor: '#DBEAFE' },
        { key: 'mittel', label: 'Mittel', defaultColor: '#D1FAE5' },
        { key: 'guenstig', label: 'Günstig', defaultColor: '#F1F5F9' }
      ]
    },
    {
      title: 'Zustand',
      colors: [
        { key: 'neu', label: 'Neu', defaultColor: '#D1FAE5' },
        { key: 'kaum_benutzt', label: 'Kaum benutzt', defaultColor: '#E0F2FE' },
        { key: 'gebraucht', label: 'Gebraucht/Gut', defaultColor: '#FED7AA' },
        { key: 'abgenutzt', label: 'Abgenutzt', defaultColor: '#FECACA' }
      ]
    },
    {
      title: 'Relevanz',
      colors: [
        { key: 'stark_relevant', label: 'Stark relevant', defaultColor: '#DDD6FE' },
        { key: 'wichtig', label: 'Wichtig', defaultColor: '#CFFAFE' },
        { key: 'nicht_beliebt', label: 'Nicht beliebt', defaultColor: '#F3F4F6' }
      ]
    }
  ];

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
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <p><strong>Excel herunterladen:</strong> Vorlage mit allen Kombinationen</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <p><strong>Fixpreise eintragen:</strong> Spalte "Fixpreis" ausfüllen</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <p><strong>Excel hochladen:</strong> Preise werden übernommen</p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleDownload}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <Download className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Excel herunterladen</h3>
                  <Button className="mt-4" disabled={isDownloading} data-testid="download-btn">
                    <Download className="w-4 h-4 mr-2" />
                    {isDownloading ? 'Lädt...' : 'Download'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleUploadClick}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Excel hochladen</h3>
                  <Button className="mt-4" disabled={isUploading} data-testid="upload-btn">
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Lädt...' : 'Hochladen'}
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                </CardContent>
              </Card>
            </div>

            {uploadResult && (
              <Card className={`${uploadResult.success ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  {uploadResult.success ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
                  <p className={`font-medium ${uploadResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                    {uploadResult.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone - Only for Admin */}
            {isAdmin() && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Gefahrenzone (nur Admin)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Alle gespeicherten Fixpreise löschen.
                  </p>
                  
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
                          <AlertDialogAction onClick={handleClearPrices}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Eigene Kategorien
                </CardTitle>
                <CardDescription>
                  Füge zusätzliche Kleidungskategorien mit Icon hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Neue Kategorie (z.B. Accessoires)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddCategory} disabled={isAddingCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                </div>

                {customCategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Eigene Kategorien</Label>
                    <div className="space-y-2">
                      {customCategories.map((cat) => (
                        <div key={cat} className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                          <span className="flex-1 font-medium">{cat}</span>
                          <Select 
                            value={settings.category_icons[cat] || 'Shirt'} 
                            onValueChange={(icon) => handleCategoryIconChange(cat, icon)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_ICONS.map((icon) => (
                                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isAdmin() && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCategory(cat)}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
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
            {colorGroups.map((group) => (
              <Card key={group.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    {group.title} Farben
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.colors.map(({ key, label, defaultColor }) => (
                    <div key={key} className="flex items-center gap-4">
                      <div 
                        className="w-20 h-10 rounded-lg border-2 flex items-center justify-center font-medium text-xs"
                        style={{ backgroundColor: settings.colors[key] || defaultColor }}
                      >
                        {label}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <Input
                          type="color"
                          value={settings.colors[key] || defaultColor}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-14 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={settings.colors[key] || defaultColor}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-28"
                        />
                        <Button variant="outline" size="sm" onClick={() => handleColorChange(key, defaultColor)}>
                          Reset
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
