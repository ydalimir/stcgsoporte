

"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Loader2, DollarSign, FileText, ShoppingCart, AreaChart, Download } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, sub, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Quote } from '@/components/admin/quote-manager';
import type { PurchaseOrder } from '@/components/admin/purchase-order-manager';
import type { Supplier } from '@/components/admin/supplier-manager';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { useRouter } from 'next/navigation';
import * as XLSX from "xlsx";

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
        const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                if (profile.role !== 'admin' && !profile.permissions?.reports) {
                    router.push('/admin');
                }
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
                            numberOfMonths={1}
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
    const { currentPeriodStats, prevPeriodStats } = useMemo(() => {
        if (!range?.from || !range?.to) return { currentPeriodStats: null, prevPeriodStats: null };

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
            const paid = filteredQuotes.filter(q => q.status === 'Pagada');
            const totalIncome = paid.reduce((sum, q) => sum + q.total, 0);

            return {
                acceptedCount: accepted.length,
                rejectedCount: rejected.length,
                paidCount: paid.length,
                totalIncome: totalIncome,
            };
        };

        const currentPeriodStats = processData(range.from, range.to);
        const prevPeriodStats = processData(prevPeriodStart, prevPeriodEnd);

        return { currentPeriodStats, prevPeriodStats };

    }, [allQuotes, range]);

    const getComparison = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? "+100.00% (desde 0)" : "Sin cambios";
        const diff = ((current - previous) / previous) * 100;
        if (diff === 0) return "Sin cambios vs período anterior";
        return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}% vs período anterior`;
    };
    
    const handleDownloadVentas = () => {
        if (!range?.from || !range?.to) return;
        const paidQuotesInRange = allQuotes.filter(q => {
            const quoteDate = new Date(q.date.replace(/-/g, '\/'));
            const isInRange = quoteDate >= range.from! && quoteDate <= range.to!;
            return q.status === 'Pagada' && isInRange;
        });

        const dataToExport = paidQuotesInRange.map(q => ({
            'ID Cotización': q.quoteNumber,
            'Cliente': q.clientName,
            'Fecha': new Date(q.date.replace(/-/g, '\/')).toLocaleDateString('es-MX', {timeZone: 'UTC'}),
            'Total': q.total,
            'Estado': q.status,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Ventas");
        XLSX.writeFile(workbook, `Reporte_Ventas_${format(range.from, "yyyy-MM-dd")}_a_${format(range.to, "yyyy-MM-dd")}.xlsx`);
    };

    if (!currentPeriodStats) return <div>Seleccione un rango de fechas para ver el reporte.</div>;

    const incomeComparison = getComparison(currentPeriodStats.totalIncome, prevPeriodStats.totalIncome);
    const acceptedComparison = getComparison(currentPeriodStats.acceptedCount, prevPeriodStats.acceptedCount);
    const paidComparison = getComparison(currentPeriodStats.paidCount, prevPeriodStats.paidCount);

    return (
        <div className="grid gap-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Ingresos Totales" value={`$${currentPeriodStats.totalIncome.toLocaleString('es-MX')}`} comparison={incomeComparison} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Cotizaciones Aceptadas" value={`${currentPeriodStats.acceptedCount}`} comparison={acceptedComparison} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Cotizaciones Pagadas" value={`${currentPeriodStats.paidCount}`} comparison={paidComparison} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Cotizaciones Rechazadas" value={`${currentPeriodStats.rejectedCount}`} comparison={getComparison(currentPeriodStats.rejectedCount, prevPeriodStats.rejectedCount)} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
            </div>
            <div className="flex justify-end mt-4">
                <Button onClick={handleDownloadVentas} disabled={!range?.from || !range.to}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Reporte de Ventas
                </Button>
            </div>
        </div>
    );
}

function ComprasReportTab({ allPurchaseOrders, range }: { allPurchaseOrders: PurchaseOrder[], allSuppliers: Supplier[], range?: DateRange }) {
     const { currentPeriodStats, prevPeriodStats } = useMemo(() => {
        if (!range?.from || !range?.to) return { currentPeriodStats: null, prevPeriodStats: null };

        const periodDuration = differenceInDays(range.to, range.from);
        const prevPeriodStart = sub(range.from, { days: periodDuration + 1 });
        const prevPeriodEnd = sub(range.to, { days: periodDuration + 1 });

        const processData = (startDate: Date, endDate: Date) => {
            const filteredPOs = allPurchaseOrders.filter(po => {
                const poDate = new Date(po.date);
                return poDate >= startDate && poDate <= endDate;
            });
            
            const totalSpending = filteredPOs.reduce((sum, po) => sum + po.total, 0);

            return {
                totalSpending,
                poCount: filteredPOs.length
            };
        };

        const currentPeriodStats = processData(range.from, range.to);
        const prevPeriodStats = processData(prevPeriodStart, prevPeriodEnd);

        return { currentPeriodStats, prevPeriodStats };

    }, [allPurchaseOrders, range]);

    const getComparison = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? "+100.00% (desde 0)" : "Sin cambios";
        const diff = ((current - previous) / previous) * 100;
        if (diff === 0) return "Sin cambios vs período anterior";
        return `${diff > 0 ? '+' : ''}${diff.toFixed(2)}% vs período anterior`;
    };
    
    const handleDownloadCompras = () => {
        if (!range?.from || !range?.to) return;
        const poInRange = allPurchaseOrders.filter(po => {
            const poDate = new Date(po.date.replace(/-/g, '\/'));
            return poDate >= range.from! && poDate <= range.to!;
        });

        const dataToExport = poInRange.map(po => ({
            'ID Orden': po.purchaseOrderNumber,
            'Proveedor': po.supplierName,
            'Fecha': new Date(po.date.replace(/-/g, '\/')).toLocaleDateString('es-MX', {timeZone: 'UTC'}),
            'Total': po.total,
            'Estado': po.status,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Compras");
        XLSX.writeFile(workbook, `Reporte_Compras_${format(range.from, "yyyy-MM-dd")}_a_${format(range.to, "yyyy-MM-dd")}.xlsx`);
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
            <div className="flex justify-end mt-4">
                <Button onClick={handleDownloadCompras} disabled={!range?.from || !range.to}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Reporte de Compras
                </Button>
            </div>
        </div>
    );
}

    
