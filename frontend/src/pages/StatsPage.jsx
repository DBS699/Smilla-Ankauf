import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { ArrowLeft, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from '@/lib/api';

export default function StatsPage() {
    const navigate = useNavigate();
    const [dailyStats, setDailyStats] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [daily, monthly] = await Promise.all([
                api.getDailyStats(30),
                api.getMonthlyStats(12)
            ]);
            setDailyStats(daily);
            setMonthlyStats(monthly);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => `CHF ${value.toFixed(2)}`;

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Statistiken</h1>
                        <p className="text-muted-foreground">Übersicht der Ankäufe</p>
                    </div>
                </div>

                {/* Content */}
                <Tabs defaultValue="daily" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="daily" className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Täglich (30 Tage)
                            </TabsTrigger>
                            <TabsTrigger value="monthly" className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Monatlich
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="daily" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Umsatzverlauf</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dailyStats}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(str) => new Date(str).toLocaleDateString('de-CH', { day: 'numeric', month: 'numeric' })}
                                                fontSize={12}
                                            />
                                            <YAxis fontSize={12} />
                                            <Tooltip
                                                formatter={(value) => [formatCurrency(value), 'Umsatz']}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString('de-CH')}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="total"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Anzahl Ankäufe</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dailyStats}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(str) => new Date(str).toLocaleDateString('de-CH', { day: 'numeric', month: 'numeric' })}
                                                fontSize={12}
                                            />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip
                                                labelFormatter={(label) => new Date(label).toLocaleDateString('de-CH')}
                                            />
                                            <Bar
                                                dataKey="count"
                                                name="Anzahl"
                                                fill="hsl(var(--primary))"
                                                opacity={0.8}
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="monthly" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Monatlicher Umsatz</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyStats}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="month" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip formatter={(value) => [formatCurrency(value), 'Umsatz']} />
                                            <Bar
                                                dataKey="total"
                                                name="Umsatz"
                                                fill="hsl(var(--primary))"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Ankäufe pro Monat</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyStats}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="month" fontSize={12} />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip />
                                            <Bar
                                                dataKey="count"
                                                name="Anzahl"
                                                fill="hsl(var(--muted-foreground))"
                                                opacity={0.5}
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
