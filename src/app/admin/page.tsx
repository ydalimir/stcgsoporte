
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileText, ShoppingCart, List, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";


type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
};

const StatCard = ({ title, value, icon, description }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export default function AdminDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    quotes: 0,
    pendingQuotes: 0,
    purchaseOrders: 0,
    projects: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authIsLoading) return;
    if (!user) {
        router.push('/');
        return;
    }

    setIsLoading(true);
    
    const unsubs: (()=>void)[] = [];
    let loadedCount = 0;
    const totalToLoad = 3;

    const onDataLoaded = () => {
        loadedCount++;
        if(loadedCount === totalToLoad) {
            setIsLoading(false);
        }
    }
    
    const quotesQuery = query(collection(db, "quotes"));
    unsubs.push(onSnapshot(quotesQuery, (snapshot) => {
      const quotes = snapshot.docs.map(doc => doc.data());
      const pendingQuotes = quotes.filter(q => q.status === 'Enviada' || q.status === 'Borrador').length;
      setStats(prev => ({ ...prev, quotes: quotes.length, pendingQuotes }));
      onDataLoaded();
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: "quotes",
            operation: 'list',
        }));
        onDataLoaded();
    }));

    const projectsQuery = query(collection(db, "projects"));
    unsubs.push(onSnapshot(projectsQuery, (snapshot) => {
        setStats(prev => ({ ...prev, projects: snapshot.docs.length }));
        onDataLoaded();
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: "projects",
            operation: 'list',
        }));
        onDataLoaded();
    }));
    
    const purchaseOrdersQuery = query(collection(db, "purchase_orders"));
    unsubs.push(onSnapshot(purchaseOrdersQuery, (snapshot) => {
        setStats(prev => ({ ...prev, purchaseOrders: snapshot.docs.length }));
        onDataLoaded();
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: "purchase_orders",
            operation: 'list',
        }));
        onDataLoaded();
    }));

    return () => {
        unsubs.forEach(unsub => unsub());
    };
  }, [user, authIsLoading, router]);

   if (authIsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard 
          title="Total de Cotizaciones" 
          value={stats.quotes} 
          icon={<FileText className="h-4 w-4 text-muted-foreground" />} 
          description="Todas las cotizaciones históricas."
        />
        <StatCard 
          title="Pendientes General" 
          value={stats.pendingQuotes} 
          icon={<List className="h-4 w-4 text-muted-foreground" />}
          description="Cotizaciones en 'Borrador' o 'Enviada'."
        />
        <StatCard 
          title="Órdenes de Compra" 
          value={stats.purchaseOrders}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          description="Total de órdenes de compra creadas."
        />
         <StatCard 
          title="Proyectos" 
          value={stats.projects}
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
          description="Total de proyectos registrados."
        />
      </div>
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Proyectos en Proceso</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">En desarrollo</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
