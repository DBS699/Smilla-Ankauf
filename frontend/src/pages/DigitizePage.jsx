import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, Upload, X, Loader2, Save, RotateCcw, KeyRound, CheckCircle, Users, UserPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function DigitizePage() {
    const navigate = useNavigate();
    const [image, setImage] = useState(null);
    const [file, setFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiKeySet, setApiKeySet] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date: '',
        amount: '',
        phone: '',
        notes: ''
    });

    // Duplicate detection state
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [similarCustomers, setSimilarCustomers] = useState([]);
    const [isSearchingDuplicates, setIsSearchingDuplicates] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await api.getSettings();
            if (settings?.gemini_api_key) {
                setApiKeySet(true);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) {
            toast.error('Bitte API Key eingeben');
            return;
        }
        setIsSavingKey(true);
        try {
            await api.updateSettings({ gemini_api_key: apiKey });
            setApiKeySet(true);
            toast.success('API Key gespeichert!');
        } catch (error) {
            console.error('Failed to save API key:', error);
            const errorMsg = typeof error.response?.data?.detail === 'object'
                ? JSON.stringify(error.response?.data?.detail)
                : error.response?.data?.detail || error.message;
            toast.error('Fehler: ' + errorMsg);
        } finally {
            setIsSavingKey(false);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => setImage(event.target.result);
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            setFile(droppedFile);
            const reader = new FileReader();
            reader.onload = (event) => setImage(event.target.result);
            reader.readAsDataURL(droppedFile);
        } else {
            toast.error('Bitte eine Bilddatei hochladen.');
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const result = await api.analyzeImage(file);
            setExtractedData(result);
            setFormData({
                first_name: result.first_name || '',
                last_name: result.last_name || '',
                date: result.date || '',
                amount: result.amount || '',
                phone: result.phone || '',
                notes: result.notes || ''
            });
            toast.success('Analyse abgeschlossen!');
        } catch (error) {
            console.error('Analysis failed:', error);
            toast.error('Analyse fehlgeschlagen: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Fuzzy similarity check (Levenshtein-based)
    const similarity = (a, b) => {
        a = a.toLowerCase().trim();
        b = b.toLowerCase().trim();
        if (a === b) return 1.0;
        if (!a || !b) return 0;

        const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
            Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                matrix[i][j] = a[i - 1] === b[j - 1]
                    ? matrix[i - 1][j - 1]
                    : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
            }
        }
        const maxLen = Math.max(a.length, b.length);
        return 1 - matrix[a.length][b.length] / maxLen;
    };

    const findSimilarCustomers = async () => {
        const { first_name, last_name } = formData;
        if (!first_name || !last_name) return [];

        // Search by first name and last name separately to cast a wide net
        const [byFirst, byLast, byFull] = await Promise.all([
            api.getCustomers(first_name),
            api.getCustomers(last_name),
            api.getCustomers(`${first_name} ${last_name}`)
        ]);

        // Merge results, deduplicate by ID
        const seen = new Set();
        const all = [...byFull, ...byFirst, ...byLast].filter(c => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
        });

        // Score each customer
        const scored = all.map(c => {
            const firstSim = similarity(first_name, c.first_name);
            const lastSim = similarity(last_name, c.last_name);
            // Also check swapped names (first↔last)
            const swapFirstSim = similarity(first_name, c.last_name);
            const swapLastSim = similarity(last_name, c.first_name);
            const normalScore = (firstSim + lastSim) / 2;
            const swapScore = (swapFirstSim + swapLastSim) / 2;
            const score = Math.max(normalScore, swapScore);
            const isExact = firstSim === 1 && lastSim === 1;
            return { ...c, score, isExact };
        });

        // Filter: show customers with ≥40% similarity
        return scored
            .filter(c => c.score >= 0.4)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    };

    const handleSave = async () => {
        if (!formData.first_name || !formData.last_name || !formData.amount) {
            toast.error("Name und Betrag sind erforderlich.");
            return;
        }

        // Search for similar customers first
        setIsSearchingDuplicates(true);
        try {
            const similar = await findSimilarCustomers();
            if (similar.length > 0) {
                setSimilarCustomers(similar);
                setShowDuplicateDialog(true);
            } else {
                // No similar customers found — create new directly
                await saveWithCustomer(null);
            }
        } catch (error) {
            console.error("Duplicate search failed:", error);
            // Fall through to create new if search fails
            await saveWithCustomer(null);
        } finally {
            setIsSearchingDuplicates(false);
        }
    };

    const saveWithCustomer = async (existingCustomerId) => {
        setIsSaving(true);
        setShowDuplicateDialog(false);
        try {
            let customerId = existingCustomerId;

            if (!customerId) {
                // Create new customer
                const customerData = {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone || undefined,
                    address: "Digitalisiert"
                };
                const newCustomer = await api.createCustomer(customerData);
                customerId = newCustomer.id;
                toast.success("Neuer Kunde erstellt.");
            } else {
                const selected = similarCustomers.find(c => c.id === customerId);
                if (selected) {
                    toast.info(`Gutschrift wird ${selected.first_name} ${selected.last_name} hinzugefügt.`);
                }
            }

            const transactionData = {
                amount: parseFloat(formData.amount),
                type: "credit",
                description: `Digitalisiert: ${formData.notes || 'Beleg eingescannt'}`,
                reference_id: `DIGIT-${Date.now()}`
            };

            await api.createTransaction(customerId, transactionData);
            toast.success("Gutschrift erfolgreich gespeichert!");

            // Reset form
            setImage(null);
            setFile(null);
            setExtractedData(null);
            setFormData({
                first_name: '',
                last_name: '',
                date: '',
                amount: '',
                phone: '',
                notes: ''
            });
            setSimilarCustomers([]);

        } catch (error) {
            console.error("Save failed:", error);
            toast.error("Fehler beim Speichern: " + (error.response?.data?.detail || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const getMatchLabel = (score, isExact) => {
        if (isExact) return { text: 'Exakter Treffer', color: 'bg-green-100 text-green-800' };
        if (score >= 0.8) return { text: 'Sehr ähnlich', color: 'bg-amber-100 text-amber-800' };
        if (score >= 0.6) return { text: 'Ähnlich', color: 'bg-orange-100 text-orange-800' };
        return { text: 'Möglicherweise', color: 'bg-gray-100 text-gray-700' };
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Camera className="w-8 h-8 text-primary" />
                        Beleg Digitalisieren
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Lade ein Foto eines Belegs hoch, um Kunden und Guthaben automatisch zu erfassen.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>
                    Zurück
                </Button>
            </div>

            {/* API Key Configuration */}
            {!apiKeySet && (
                <Card className="mb-6 border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <KeyRound className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-800 mb-1">Gemini API Key benötigt</h3>
                                <p className="text-sm text-amber-700 mb-3">
                                    Hol dir einen Key von{' '}
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                                        Google AI Studio
                                    </a>
                                    {' '}und füge ihn hier ein.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        type="password"
                                        placeholder="AIzaSy..."
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="max-w-sm bg-white"
                                    />
                                    <Button onClick={handleSaveApiKey} disabled={isSavingKey}>
                                        {isSavingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {apiKeySet && (
                <div className="mb-6 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span>Gemini API Key konfiguriert</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-xs h-7"
                        onClick={() => {
                            setApiKeySet(false);
                            setApiKey('');
                        }}
                    >
                        Ändern
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Image Upload & Preview */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div
                                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all duration-200 ${isDragging
                                    ? 'border-primary bg-primary/10 scale-[1.02]'
                                    : image
                                        ? 'border-primary/20 bg-primary/5'
                                        : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !image && fileInputRef.current?.click()}
                            >
                                {image ? (
                                    <div className="relative w-full aspect-[3/4] max-h-[500px]">
                                        <img
                                            src={image}
                                            alt="Beleg Vorschau"
                                            className="w-full h-full object-contain rounded-lg"
                                        />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 rounded-full shadow-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImage(null);
                                                setFile(null);
                                                setExtractedData(null);
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center cursor-pointer pointer-events-none">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-semibold text-lg mb-1">Foto hochladen</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Klicken oder Datei hierher ziehen
                                        </p>
                                        <Button variant="secondary" size="sm" className="pointer-events-auto">
                                            <ImageIcon className="w-4 h-4 mr-2" />
                                            Datei auswählen
                                        </Button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            {image && !extractedData && (
                                <div className="mt-4">
                                    <Button
                                        className="w-full h-12 text-lg"
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                KI analysiert Bild...
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="w-5 h-5 mr-2" />
                                                Jetzt Analysieren
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground mt-2">
                                        Powered by Google Gemini 3 Flash
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Results & Form */}
                <div className="space-y-6">
                    <Card className={!extractedData ? 'opacity-50 pointer-events-none' : ''}>
                        <CardHeader>
                            <CardTitle>Erfasste Daten</CardTitle>
                            <CardDescription>
                                Bitte überprüfe und korrigiere die Daten vor dem Speichern.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">Vorname</Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        placeholder="Maria"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Nachname</Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        placeholder="Muster"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Guthaben (CHF)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.05"
                                        className="font-mono font-bold text-lg"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Datum</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefon (optional)</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+41 79 123 45 67"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notizen / Kontext</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Zusätzliche Infos vom Beleg..."
                                    className="min-h-[80px]"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    size="lg"
                                    onClick={handleSave}
                                    disabled={isSaving || isSearchingDuplicates}
                                >
                                    {isSearchingDuplicates ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Prüfe Duplikate...
                                        </>
                                    ) : isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Speichere...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
                                            Kunde &amp; Guthaben Speichern
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Duplicate Detection Dialog */}
            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Ähnliche Kunden gefunden
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <p className="text-sm text-muted-foreground mb-4">
                            Für <strong>{formData.first_name} {formData.last_name}</strong> wurden ähnliche Einträge gefunden.
                            Möchtest du die Gutschrift einem bestehenden Kunden hinzufügen?
                        </p>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {similarCustomers.map((customer) => {
                                const label = getMatchLabel(customer.score, customer.isExact);
                                return (
                                    <button
                                        key={customer.id}
                                        className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group"
                                        onClick={() => saveWithCustomer(customer.id)}
                                        disabled={isSaving}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">
                                                    {customer.first_name} {customer.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Guthaben: {customer.current_balance?.toFixed(2) || '0.00'} CHF
                                                    {customer.email && customer.email !== 'placeholder' && ` • ${customer.email}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${label.color}`}>
                                            {label.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDuplicateDialog(false)}
                            className="sm:order-1"
                        >
                            Abbrechen
                        </Button>
                        <Button
                            onClick={() => saveWithCustomer(null)}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 sm:order-2"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4 mr-2" />
                            )}
                            Trotzdem neuen Kunden erstellen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
