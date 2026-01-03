import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Trash2, FileSpreadsheet, CheckCircle, AlertCircle, Plus, X, Palette, Shield, Image, Camera, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES } from '@/lib/constants';
import api from '@/lib/api';

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
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Settings
  const [settings, setSettings] = useState({
    colors: {
      luxus: '#FEF3C7',
      teuer: '#DBEAFE',
      mittel: '#D1FAE5',
      guenstig: '#F1F5F9',
      neu: '#D1FAE5',
      kaum_benutzt: '#E0F2FE',
      gebraucht: '#FED7AA',
      abgenutzt: '#FECACA',
      stark_relevant: '#DDD6FE',
      wichtig: '#CFFAFE',
      nicht_beliebt: '#F3F4F6'
    },
    hidden_categories: []
  });

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
          hidden_categories: settingsData.hidden_categories || []
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
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Image handling
  const handleImageSelect = (e, forNew = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Bitte ein Bild auswählen');
      return;
    }

    if (file.size > 500000) {
      toast.error('Bild zu gross (max 500KB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (forNew) {
        setNewCategoryImage(reader.result);
      } else if (editingCategory) {
        handleUpdateCategoryImage(editingCategory, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Name erforderlich');
      return;
    }
    
    setIsAddingCategory(true);
    try {
      await api.addCustomCategory(newCategoryName.trim(), newCategoryImage);
      toast.success(`Kategorie "${newCategoryName}" hinzugefügt`);
      setNewCategoryName('');
      setNewCategoryImage(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Hinzufügen');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleUpdateCategoryImage = async (categoryName, image) => {
    try {
      await api.updateCategoryImage(categoryName, image);
      toast.success('Bild aktualisiert');
      setEditingCategory(null);
      loadData();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
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

  const handleColorChange = async (key, value) => {
    const newColors = { ...settings.colors, [key]: value };
    setSettings(prev => ({ ...prev, colors: newColors }));
    try {
      await api.updateSettings({ ...settings, colors: newColors });
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Toggle category visibility
  const toggleCategoryVisibility = async (categoryName) => {
    const isHidden = settings.hidden_categories.includes(categoryName);
    let newHidden;
    
    if (isHidden) {
      newHidden = settings.hidden_categories.filter(c => c !== categoryName);
    } else {
      newHidden = [...settings.hidden_categories, categoryName];
    }
    
    setSettings(prev => ({ ...prev, hidden_categories: newHidden }));
    
    try {
      await api.updateSettings({ ...settings, hidden_categories: newHidden });
      toast.success(isHidden ? `"${categoryName}" wieder sichtbar` : `"${categoryName}" ausgeblendet`);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Hide all standard categories
  const hideAllStandardCategories = async () => {
    const allStandardNames = CATEGORIES.map(c => c.name);
    setSettings(prev => ({ ...prev, hidden_categories: allStandardNames }));
    
    try {
      await api.updateSettings({ ...settings, hidden_categories: allStandardNames });
      toast.success('Alle Standard-Kategorien ausgeblendet');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Show all standard categories
  const showAllStandardCategories = async () => {
    setSettings(prev => ({ ...prev, hidden_categories: [] }));
    
    try {
      await api.updateSettings({ ...settings, hidden_categories: [] });
      toast.success('Alle Standard-Kategorien wiederhergestellt');
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

  const hiddenCount = settings.hidden_categories.length;

  return (
    <div className="min-h-screen" data-testid="settings-page">
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
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="prices">Preismatrix</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            {/* Standard Categories Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Standard-Kategorien ({17 - hiddenCount} sichtbar)
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={hideAllStandardCategories}
                      disabled={hiddenCount === 17}
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      Alle ausblenden
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={showAllStandardCategories}
                      disabled={hiddenCount === 0}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Alle wiederherstellen
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Blende Standard-Kategorien aus, die du nicht brauchst
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => {
                    const isHidden = settings.hidden_categories.includes(cat.name);
                    return (
                      <div 
                        key={cat.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${isHidden ? 'bg-gray-100 opacity-60' : 'bg-white'}`}
                      >
                        <span className={`text-sm ${isHidden ? 'line-through text-gray-400' : ''}`}>
                          {cat.name}
                        </span>
                        <Switch
                          checked={!isHidden}
                          onCheckedChange={() => toggleCategoryVisibility(cat.name)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Custom Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Eigene Kategorien ({customCategories.length})
                </CardTitle>
                <CardDescription>
                  Füge eigene Kategorien mit Bild hinzu (max 500KB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>Name</Label>
                    <Input
                      placeholder="z.B. Accessoires"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Bild</Label>
                    <div className="flex gap-2">
                      {newCategoryImage ? (
                        <div className="relative w-10 h-10">
                          <img src={newCategoryImage} alt="Preview" className="w-10 h-10 rounded object-cover" />
                          <button 
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs"
                            onClick={() => setNewCategoryImage(null)}
                          >×</button>
                        </div>
                      ) : (
                        <Button variant="outline" size="icon" onClick={() => document.getElementById('new-cat-image').click()}>
                          <Camera className="w-4 h-4" />
                        </Button>
                      )}
                      <input
                        id="new-cat-image"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageSelect(e, true)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddCategory} disabled={isAddingCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                </div>

                {customCategories.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <div className="grid gap-3">
                      {customCategories.map((cat) => (
                        <div key={cat.name} className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                              <Image className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <span className="flex-1 font-medium">{cat.name}</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingCategory(cat.name);
                              document.getElementById('edit-cat-image').click();
                            }}
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Bild
                          </Button>
                          {isAdmin() && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCategory(cat.name)}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <input
                      id="edit-cat-image"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleImageSelect(e, false)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prices Tab */}
          <TabsContent value="prices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Preismatrix
                </CardTitle>
                <CardDescription>
                  Excel enthält alle sichtbaren Standard- UND eigene Kategorien
                </CardDescription>
              </CardHeader>
            </Card>

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

            {isAdmin() && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Gefahrenzone (nur Admin)
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                        <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearPrices}>Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-6">
            {colorGroups.map((group) => (
              <Card key={group.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    {group.title}
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
