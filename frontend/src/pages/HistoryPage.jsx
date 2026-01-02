import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, Package, Eye, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function HistoryPage() {
  const [purchases, setPurchases] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [todayStats, setTodayStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedPurchase, setExpandedPurchase] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchasesData, dailyData, monthlyData, todayData] = await Promise.all([
        api.getPurchases(),
        api.getDailyStats(30),
        api.getMonthlyStats(12),
        api.getTodayStats(),
      ]);
      setPurchases(purchasesData);
      setDailyStats(dailyData);
      setMonthlyStats(monthlyData);
      setTodayStats(todayData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePurchase = async (id) => {
    try {
      await api.deletePurchase(id);
      toast.success('Ankauf gelöscht');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
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

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('de-CH', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen" data-testid="history-page">
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
            <h1 className="text-xl font-bold text-primary">Ankaufs-Historie</h1>
            <p className="text-sm text-muted-foreground">Übersicht aller Ankäufe</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 lg:py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="stats-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Heute</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-today-amount">
                  CHF {todayStats.total_amount?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="stats-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Artikel heute</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-today-items">
                  {todayStats.total_items || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="stats-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ankäufe heute</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-today-purchases">
                  {todayStats.total_purchases || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="stats-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamt</p>
                <p className="font-display text-2xl font-bold" data-testid="stat-total">
                  {purchases.length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="purchases" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="purchases" data-testid="tab-purchases">Ankäufe</TabsTrigger>
            <TabsTrigger value="daily" data-testid="tab-daily">Täglich</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monatlich</TabsTrigger>
          </TabsList>

          {/* Purchases list */}
          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle>Alle Ankäufe</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Laden...</div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Noch keine Ankäufe vorhanden
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {purchases.map((purchase) => (
                        <Collapsible
                          key={purchase.id}
                          open={expandedPurchase === purchase.id}
                          onOpenChange={(open) => setExpandedPurchase(open ? purchase.id : null)}
                        >
                          <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="text-left">
                                    <p className="font-medium">{formatDate(purchase.timestamp)}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatTime(purchase.timestamp)} • {purchase.items.length} Artikel
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-display text-xl font-bold">
                                    CHF {purchase.total.toFixed(2)}
                                  </span>
                                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedPurchase === purchase.id ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t px-4 py-3 bg-muted/30">
                                <div className="space-y-2 mb-4">
                                  {purchase.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span>
                                        {item.category} ({item.price_level}, {item.condition})
                                      </span>
                                      <span className="font-display font-medium">
                                        CHF {item.price.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-2 pt-2 border-t">
                                  <Link to={`/receipt/${purchase.id}`} target="_blank">
                                    <Button variant="outline" size="sm">
                                      <Eye className="w-4 h-4 mr-1" />
                                      Quittung
                                    </Button>
                                  </Link>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Löschen
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Ankauf löschen?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Diese Aktion kann nicht rückgängig gemacht werden.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePurchase(purchase.id)}>
                                          Löschen
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily stats */}
          <TabsContent value="daily">
            <Card>
              <CardHeader>
                <CardTitle>Tagesübersicht (letzte 30 Tage)</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Daten vorhanden
                  </div>
                ) : (
                  <Table className="history-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-center">Ankäufe</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyStats.map((stat) => (
                        <TableRow key={stat.date}>
                          <TableCell className="font-medium">
                            {formatDate(stat.date)}
                          </TableCell>
                          <TableCell className="text-center">{stat.count}</TableCell>
                          <TableCell className="text-right font-display font-bold">
                            CHF {stat.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly stats */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monatsübersicht</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Daten vorhanden
                  </div>
                ) : (
                  <Table className="history-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Monat</TableHead>
                        <TableHead className="text-center">Ankäufe</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyStats.map((stat) => (
                        <TableRow key={stat.month}>
                          <TableCell className="font-medium">
                            {formatMonth(stat.month)}
                          </TableCell>
                          <TableCell className="text-center">{stat.count}</TableCell>
                          <TableCell className="text-right font-display font-bold">
                            CHF {stat.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
