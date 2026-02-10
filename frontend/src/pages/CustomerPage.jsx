import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Plus, Users, Download, User, Wallet, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function CustomerPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        first_name: '',
        last_name: '',
        email: '',
        address: '',
        phone: ''
    });
    const [saving, setSaving] = useState(false);

    // Load customers
    useEffect(() => {
        loadCustomers();
    }, []);

    // Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            loadCustomers(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadCustomers = async (search = '') => {
        try {
            setLoading(true);
            const data = await api.getCustomers(search);
            setCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
            toast.error('Fehler beim Laden der Kunden');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCustomer = async () => {
        if (!newCustomer.first_name.trim() || !newCustomer.last_name.trim()) {
            toast.error('Vorname und Nachname sind erforderlich');
            return;
        }

        try {
            setSaving(true);
            await api.createCustomer(newCustomer);
            toast.success('Kunde erfolgreich erstellt');
            setShowAddDialog(false);
            setNewCustomer({ first_name: '', last_name: '', email: '', address: '', phone: '' });
            loadCustomers(searchTerm);
        } catch (error) {
            console.error('Error creating customer:', error);
            toast.error(error.response?.data?.detail || 'Fehler beim Erstellen des Kunden');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        try {
            await api.exportCustomersExcel();
            toast.success('Export gestartet');
        } catch (error) {
            console.error('Error exporting:', error);
            toast.error('Fehler beim Export');
        }
    };

    // Calculate total balance
    const totalBalance = customers.reduce((sum, c) => sum + (c.current_balance || 0), 0);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Users className="w-6 h-6 text-primary" />
                                <h1 className="text-xl font-bold">Kundenverwaltung</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleExport}>
                                <Download className="w-4 h-4 mr-2" />
                                Excel Export
                            </Button>
                            <Button size="sm" onClick={() => setShowAddDialog(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Neuer Kunde
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Anzahl Kunden</p>
                                    <p className="text-2xl font-bold">{customers.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <Wallet className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Gesamtguthaben</p>
                                    <p className="text-2xl font-bold text-green-600">{totalBalance.toFixed(2)} CHF</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Kunde suchen (Name oder E-Mail)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12 text-lg"
                    />
                </div>

                {/* Customer List */}
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Laden...
                    </div>
                ) : customers.length === 0 ? (
                    <Card className="py-12">
                        <CardContent className="text-center">
                            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg text-muted-foreground">
                                {searchTerm ? 'Keine Kunden gefunden' : 'Noch keine Kunden vorhanden'}
                            </p>
                            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Ersten Kunden erstellen
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {customers.map((customer) => (
                            <Card
                                key={customer.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/customers/${customer.id}`)}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg">
                                                    {customer.first_name} {customer.last_name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Guthaben</p>
                                                <p className={`text-xl font-bold ${customer.current_balance > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {customer.current_balance?.toFixed(2) || '0.00'} CHF
                                                </p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Customer Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Neuen Kunden erstellen
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vorname *</Label>
                                <Input
                                    value={newCustomer.first_name}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                                    placeholder="Max"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nachname *</Label>
                                <Input
                                    value={newCustomer.last_name}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                                    placeholder="Mustermann"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>E-Mail (optional)</Label>
                            <Input
                                type="email"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                placeholder="max@beispiel.ch"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Adresse (optional)</Label>
                            <Input
                                value={newCustomer.address}
                                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                placeholder="Musterstrasse 1, 8000 Zürich"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon (optional)</Label>
                            <Input
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                placeholder="+41 79 123 45 67"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleAddCustomer} disabled={saving}>
                            {saving ? 'Speichern...' : 'Kunde erstellen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
