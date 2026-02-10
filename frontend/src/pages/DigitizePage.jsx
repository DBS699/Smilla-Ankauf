import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, Upload, Check, X, Loader2, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date: '',
        amount: '',
        phone: '',
        notes: ''
    });

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setImage(URL.createObjectURL(selectedFile));
            setExtractedData(null); // Reset previous analysis
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Bitte zuerst ein Bild auswählen");
            return;
        }

        setIsAnalyzing(true);
        try {
            const data = await api.analyzeImage(file);
            setExtractedData(data);

            // Populate form with extracted data
            setFormData({
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                date: data.date || new Date().toISOString().split('T')[0],
                amount: data.amount ? data.amount.toString() : '',
                phone: data.phone || '',
                notes: data.notes || ''
            });

            toast.success("Analyse erfolgreich!");
        } catch (error) {
            console.error("Analysis failed:", error);
            toast.error("Fehler bei der Analyse: " + (error.response?.data?.detail || error.message));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        // Validation
        if (!formData.first_name || !formData.last_name || !formData.amount) {
            toast.error("Name und Betrag sind erforderlich.");
            return;
        }

        setIsSaving(true);
        try {
            // 1. Create/Find Customer
            const customerData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: `${formData.first_name.toLowerCase()}.${formData.last_name.toLowerCase()}@placeholder.com`, // Placeholder if not found
                phone: formData.phone || undefined,
                address: "Digitalisiert"
            };

            // Check if customer exists by name to avoid duplicates (simplified check)
            // In a real scenario, we might want a search/select UI first
            let customerId;
            const searchResults = await api.getCustomers(`${formData.first_name} ${formData.last_name}`);

            // Filter for exact match
            const exactMatch = searchResults.find(c =>
                c.first_name.toLowerCase() === formData.first_name.toLowerCase() &&
                c.last_name.toLowerCase() === formData.last_name.toLowerCase()
            );

            if (exactMatch) {
                customerId = exactMatch.id;
                toast.info(`Kunde gefunden: ${exactMatch.first_name} ${exactMatch.last_name}`);
            } else {
                // Create new customer
                const newCustomer = await api.createCustomer(customerData);
                customerId = newCustomer.id;
                toast.success("Neuer Kunde erstellt.");
            }

            // 2. Create Transaction (Credit)
            const transactionData = {
                amount: parseFloat(formData.amount),
                type: "credit", // Manual credit from digitization
                description: `Digitalisiert: ${formData.notes || 'Beleg eingescannt'}`,
                reference_id: `DIGIT-${Date.now()}`
            };

            await api.createTransaction(customerId, transactionData);

            toast.success("Gutschrift erfolgreich gespeichert!");

            // Reset
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

        } catch (error) {
            console.error("Save failed:", error);
            toast.error("Fehler beim Speichern: " + (error.response?.data?.detail || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const [isDragging, setIsDragging] = useState(false);

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
            setImage(URL.createObjectURL(droppedFile));
            setExtractedData(null);
        } else if (droppedFile) {
            toast.error("Bitte nur Bilddateien hochladen");
        }
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Image Upload & Preview */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div
                                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors transition-all duration-200 ${isDragging
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
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Speichere...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        Kunde & Guthaben Speichern
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </div >
    );
}
