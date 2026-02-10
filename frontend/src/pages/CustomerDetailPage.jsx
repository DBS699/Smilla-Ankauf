import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Wallet, Plus, Minus, Edit, Trash2, Mail, MapPin, Phone, Clock, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function CustomerDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTransactionDialog, setShowTransactionDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [transactionType, setTransactionType] = useState('credit');
    const [transactionAmount, setTransactionAmount] = useState('');
    const [transactionDescription, setTransactionDescription] = useState('');
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCustomer();
    }, [id]);

    const loadCustomer = async () => {
        try {
            setLoading(true);
            const data = await api.getCustomer(id);
            setCustomer(data);
            setEditData({
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email || '',
                address: data.address || '',
                phone: data.phone || ''
            });
        } catch (error) {
            console.error('Error loading customer:', error);
            toast.error('Kunde nicht gefunden');
            navigate('/customers');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTransaction = async () => {
        const amount = parseFloat(transactionAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Bitte gültigen Betrag eingeben');
            return;
        }

        try {
            setSaving(true);
            await api.createTransaction(id, {
                amount,
                type: transactionType,
                description: transactionDescription || (transactionType === 'credit' ? 'Manuelle Gutschrift' : 'Auszahlung')
            }, user?.username || 'system');

            toast.success(transactionType === 'credit' ? 'Gutschrift erstellt' : 'Abbuchung erstellt');
            setShowTransactionDialog(false);
            setTransactionAmount('');
            setTransactionDescription('');
            loadCustomer();
        } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error('Fehler beim Erstellen der Transaktion');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateCustomer = async () => {
        if (!editData.first_name.trim() || !editData.last_name.trim()) {
            toast.error('Vorname und Nachname sind erforderlich');
            return;
        }

        try {
            setSaving(true);
            await api.updateCustomer(id, editData);
            toast.success('Kunde aktualisiert');
            setShowEditDialog(false);
            loadCustomer();
        } catch (error) {
            console.error('Error updating customer:', error);
            toast.error(error.response?.data?.detail || 'Fehler beim Aktualisieren');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCustomer = async () => {
        try {
            setSaving(true);
            await api.deleteCustomer(id);
            toast.success('Kunde gelöscht');
            navigate('/customers');
        } catch (error) {
            console.error('Error deleting customer:', error);
            toast.error('Fehler beim Löschen');
        } finally {
            setSaving(false);
        }
    };

    // Format transaction type for display
    const formatTransactionType = (type) => {
        const types = {
            'purchase_credit': 'Ankauf-Gutschrift',
            'manual_credit': 'Manuelle Gutschrift',
            'manual_debit': 'Auszahlung/Abbuchung',
            'payout': 'Auszahlung'
        };
        return types[type] || type;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Laden...</p>
            </div>
        );
    }

    if (!customer) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <User className="w-6 h-6 text-primary" />
                                <h1 className="text-xl font-bold">{customer.first_name} {customer.last_name}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Bearbeiten
                            </Button>
                            {user?.role === 'admin' && (
                                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Löschen
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Balance Card */}
                <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="py-8">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Aktuelles Guthaben</p>
                            <p className={`text-5xl font-bold ${customer.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {customer.current_balance?.toFixed(2) || '0.00'} CHF
                            </p>
                            <div className="mt-6 flex justify-center gap-4">
                                <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                        setTransactionType('credit');
                                        setShowTransactionDialog(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Gutschrift
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                        setTransactionType('debit');
                                        setShowTransactionDialog(true);
                                    }}
                                >
                                    <Minus className="w-4 h-4 mr-2" />
                                    Auszahlung
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Customer Info */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Kundendaten</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {customer.email && (
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.email}</span>
                            </div>
                        )}
                        {customer.address && (
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.address}</span>
                            </div>
                        )}
                        {customer.phone && (
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Kunde seit {customer.created_at?.substring(0, 10)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Transaction History */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Transaktionshistorie</CardTitle>
                        <span className="text-sm text-muted-foreground">
                            {customer.transactions?.length || 0} Transaktionen
                        </span>
                    </CardHeader>
                    <CardContent>
                        {!customer.transactions || customer.transactions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Noch keine Transaktionen</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {customer.transactions.map((t) => (
                                    <div key={t.id} className="py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.amount >= 0 ? 'bg-green-100' : 'bg-red-100'
                                                }`}>
                                                {t.amount >= 0 ? (
                                                    <Plus className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <Minus className="w-5 h-5 text-red-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{formatTransactionType(t.type)}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {t.description || t.reference_id}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t.timestamp?.substring(0, 10)} • {t.staff_username}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-lg font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.amount >= 0 ? '+' : ''}{t.amount?.toFixed(2)} CHF
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Transaction Dialog */}
            <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {transactionType === 'credit' ? (
                                <>
                                    <Plus className="w-5 h-5 text-green-600" />
                                    Gutschrift erstellen
                                </>
                            ) : (
                                <>
                                    <Minus className="w-5 h-5 text-red-600" />
                                    Auszahlung/Abbuchung
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Betrag (CHF) *</Label>
                            <Input
                                type="number"
                                step="0.05"
                                min="0"
                                value={transactionAmount}
                                onChange={(e) => setTransactionAmount(e.target.value)}
                                placeholder="0.00"
                                className="text-2xl h-14 text-center"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Beschreibung (optional)</Label>
                            <Textarea
                                value={transactionDescription}
                                onChange={(e) => setTransactionDescription(e.target.value)}
                                placeholder={transactionType === 'credit' ? 'z.B. Korrektur, Bonus...' : 'z.B. Barauszahlung, Einkauf im Store...'}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleCreateTransaction}
                            disabled={saving}
                            className={transactionType === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {saving ? 'Speichern...' : (transactionType === 'credit' ? 'Gutschrift buchen' : 'Abbuchung erstellen')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5" />
                            Kunde bearbeiten
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vorname *</Label>
                                <Input
                                    value={editData.first_name}
                                    onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nachname *</Label>
                                <Input
                                    value={editData.last_name}
                                    onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>E-Mail (optional)</Label>
                            <Input
                                type="email"
                                value={editData.email}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Adresse</Label>
                            <Input
                                value={editData.address}
                                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                                value={editData.phone}
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleUpdateCustomer} disabled={saving}>
                            {saving ? 'Speichern...' : 'Speichern'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Kunde löschen?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-muted-foreground">
                            Möchtest du <strong>{customer.first_name} {customer.last_name}</strong> wirklich löschen?
                            Dies löscht auch alle Transaktionen und kann nicht rückgängig gemacht werden.
                        </p>
                        {customer.current_balance > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ Dieser Kunde hat noch <strong>{customer.current_balance?.toFixed(2)} CHF</strong> Guthaben!
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Abbrechen
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteCustomer} disabled={saving}>
                            {saving ? 'Löschen...' : 'Endgültig löschen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
