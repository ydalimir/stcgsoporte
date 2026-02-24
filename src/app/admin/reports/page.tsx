
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Loader2, DollarSign, TrendingUp, TrendingDown, FileText, ShoppingCart, Users, AreaChart } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, sub, differenceInDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import type { Quote } from '@/components/admin/quote-manager';
import type { PurchaseOrder } from '@/components/admin/purchase-order-manager';
import type { Supplier } from '@/components/admin/supplier-manager';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { useRouter } from 'next/navigation';

type UserProfile = {
  role: 'admin' | 'employee';
  permissions?: { [key: string]: boolean };
};

const StatCard = ({ title, value, comparison, icon }: { title: string, value: string, comparison: string, icon: React.ReactNode }) => {
    const isPositive = comparison.startsWith('+');
    const isNegative = comparison.startsWith('-');
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className={cn("text-xs", isPositive && "text-green-500", isNegative && "text-red-500", !isPositive && !isNegative && "text-muted-foreground")}>
                    {comparison}
                </p>
            </CardContent>
        </Card>
    );
};

export default function ReportsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [date, setDate] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/');
            return;
        }
        const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
            const profile = doc.data() as UserProfile;
            setUserProfile(profile);
            if (profile.role !== 'admin' && !profile.permissions?.reports) {
                router.push('/admin');
            }
        });
        return () => unsub();
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!userProfile) return;
        setIsLoading(true);

        const unsubs: (()=>void)[] = [];

        unsubs.push(onSnapshot(collection(db, 'quotes'), (snapshot) => {
            setQuotes(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Quote)));
        }, (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({path: 'quotes', operation: 'list'}))));
        
        unsubs.push(onSnapshot(collection(db, 'purchase_orders'), (snapshot) => {
            setPurchaseOrders(snapshot.docs.map(d => ({id: d.id, ...d.data()} as PurchaseOrder)));
        }, (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({path: 'purchase_orders', operation: 'list'}))));

        unsubs.push(onSnapshot(collection(db, 'suppliers'), (snapshot) => {
            setSuppliers(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Supplier)));
        }, (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({path: 'suppliers', operation: 'list'}))));

        setIsLoading(false);
        return () => unsubs.forEach(unsub => unsub());

    }, [userProfile]);

    if (isLoading || authLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <AreaChart className="w-6 h-6" />
                    <h1 className="text-2xl font-bold">Reportes</h1>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "d 'de' LLL, y", { locale: es })} -{" "}
                                        {format(date.to, "d 'de' LLL, y", { locale: es })}
                                    </>
                                ) : format(date.from, "d 'de' LLL, y", { locale: es })
                            ) : <span>Seleccionar rango de fechas</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <Tabs defaultValue="sales">
                <TabsList>
                    <TabsTrigger value="sales">Ventas</TabsTrigger>
                    <TabsTrigger value="purchases">Compras</TabsTrigger>
                </TabsList>
                <TabsContent value="sales" className="mt-4">
                    <VentasReportTab allQuotes={quotes} range={date} />
                </TabsContent>
                <TabsContent value="purchases" className="mt-4">
                    <ComprasReportTab allPurchaseOrders={purchaseOrders} allSuppliers={suppliers} range={date} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function VentasReportTab({ allQuotes, range }: { allQuotes: Quote[], range?: DateRange }) {
    const { currentPeriodStats, prevPeriodStats, dailyData } = useMemo(() => {
        if (!range?.from || !range?.to) return { currentPeriodStats: null, prevPeriodStats: null, dailyData: [] };

        const periodDuration = differenceInDays(range.to, range.from);
        const prevPeriodStart = sub(range.from, { days: periodDuration + 1 });
        const prevPeriodEnd = sub(range.to, { days: periodDuration + 1 });

        const processData = (startDate: Date, endDate: Date) => {
            const filteredQuotes = allQuotes.filter(q => {
                const quoteDate = new Date(q.date);
                return quoteDate >= startDate && quoteDate <= endDate;
            });
            
            const accepted = filteredQuotes.filter(q => q.status === 'Aceptada');
            const rejected = filteredQuotes.filter(q => q.status === 'Rechazada');
            const totalIncome = accepted.reduce((sum, q) => sum + q.total, 0);

            return {
                acceptedCount: accepted.length,
                rejectedCount: rejected.length,
                totalIncome: totalIncome,
            };
        };

        const currentPeriodStats = processData(range.from, range.to);

        const dailyData = Array.from({ length: periodDuration + 1 }, (_, i) => {
            const date = new Date(range.from!);
            date.setDate(date.getDate() + i);
            const dailyQuotes = allQuotes.filter(q => isSameDay(new Date(q.date), date));
            const dailyIncome = dailyQuotes.filter(q => q.status === 'Aceptada').reduce((sum, q) => sum + q.total, 0);
            return {
                name: format(date, 'd MMM', { locale: es }),
                Ingresos: dailyIncome,
            };
        });

        const prevPeriodStats = processData(prevPeriodStart, prevPeriodEnd);

        return { currentPeriodStats, prevPeriodStats, dailyData };

    }, [allQuotes, range]);

    const getComparison = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? "+100.00% (desde 0)" : "Sin cambios";
        const diff = ((current - previous) / previous) * 100;
        if (diff === 0) return "Sin cambios vs período anterior";
        return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}% vs período anterior`;
    };

    if (!currentPeriodStats) return <div>Seleccione un rango de fechas para ver el reporte.</div>;

    const incomeComparison = getComparison(currentPeriodStats.totalIncome, prevPeriodStats.totalIncome);
    const acceptedComparison = getComparison(currentPeriodStats.acceptedCount, prevPeriodStats.acceptedCount);

    const quoteStatusData = [
        { name: 'Aceptadas', value: currentPeriodStats.acceptedCount, fill: 'hsl(var(--chart-2))' },
        { name: 'Rechazadas', value: currentPeriodStats.rejectedCount, fill: 'hsl(var(--destructive))' },
    ];

    return (
        <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard title="Ingresos Totales" value={`$${currentPeriodStats.totalIncome.toLocaleString('es-MX')}`} comparison={incomeComparison} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Cotizaciones Aceptadas" value={`${currentPeriodStats.acceptedCount}`} comparison={acceptedComparison} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Cotizaciones Rechazadas" value={`${currentPeriodStats.rejectedCount}`} comparison={getComparison(currentPeriodStats.rejectedCount, prevPeriodStats.rejectedCount)} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ingresos por Día</CardTitle>
                        <CardDescription>Total de ingresos de cotizaciones aceptadas en el período.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`, 'Ingresos']} />
                                <Legend />
                                <Line type="monotone" dataKey="Ingresos" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Estado de Cotizaciones</CardTitle>
                        <CardDescription>Total de cotizaciones aceptadas vs. rechazadas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={quoteStatusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ComprasReportTab({ allPurchaseOrders, allSuppliers, range }: { allPurchaseOrders: PurchaseOrder[], allSuppliers: Supplier[], range?: DateRange }) {
     const { currentPeriodStats, prevPeriodStats, topSuppliersData } = useMemo(() => {
        if (!range?.from || !range?.to) return { currentPeriodStats: null, prevPeriodStats: null, topSuppliersData: [] };

        const periodDuration = differenceInDays(range.to, range.from);
        const prevPeriodStart = sub(range.from, { days: periodDuration + 1 });
        const prevPeriodEnd = sub(range.to, { days: periodDuration + 1 });

        const processData = (startDate: Date, endDate: Date) => {
            const filteredPOs = allPurchaseOrders.filter(po => {
                const poDate = new Date(po.date);
                return poDate >= startDate && poDate <= endDate;
            });
            
            const totalSpending = filteredPOs.reduce((sum, po) => sum + po.total, 0);
            
            const supplierCounts: Record<string, number> = {};
            filteredPOs.forEach(po => {
                supplierCounts[po.supplierName] = (supplierCounts[po.supplierName] || 0) + 1;
            });

            return {
                totalSpending,
                supplierCounts,
                poCount: filteredPOs.length
            };
        };

        const currentPeriodStats = processData(range.from, range.to);
        const prevPeriodStats = processData(prevPeriodStart, prevPeriodEnd);

        const topSuppliersData = Object.entries(currentPeriodStats.supplierCounts)
            .map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        return { currentPeriodStats, prevPeriodStats, topSuppliersData };

    }, [allPurchaseOrders, range]);

    const getComparison = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? "+100.00% (desde 0)" : "Sin cambios";
        const diff = ((current - previous) / previous) * 100;
        if (diff === 0) return "Sin cambios vs período anterior";
        return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}% vs período anterior`;
    };

    if (!currentPeriodStats) return <div>Seleccione un rango de fechas para ver el reporte.</div>;

    const spendingComparison = getComparison(currentPeriodStats.totalSpending, prevPeriodStats.totalSpending);
    const poCountComparison = getComparison(currentPeriodStats.poCount, prevPeriodStats.poCount);

    return (
         <div className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
                <StatCard title="Gasto Total" value={`$${currentPeriodStats.totalSpending.toLocaleString('es-MX')}`} comparison={spendingComparison} icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Órdenes de Compra" value={`${currentPeriodStats.poCount}`} comparison={poCountComparison} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Top 5 Proveedores</CardTitle>
                    <CardDescription>Proveedores con más órdenes de compra en el período seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topSuppliersData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} />
                            <Tooltip formatter={(value) => [value, 'Órdenes']} />
                            <Bar dataKey="value" name="Órdenes" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
