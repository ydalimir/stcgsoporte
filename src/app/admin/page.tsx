
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Wrench, FileText, Package, CheckCheck, List, Loader2 } from "lucide-react";
import { TicketTable } from "@/components/admin/ticket-table";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";


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
    tickets: 0,
    pendingTickets: 0,
    completedTickets: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authIsLoading) return;
    if (!user) {
        router.push('/');
        return;
    }

    const q = query(collection(db, "tickets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => doc.data());
      const pendingTickets = tickets.filter(t => t.status !== 'Resuelto').length;
      const completedTickets = tickets.filter(t => t.status === 'Resuelto').length;
      
      setStats(prev => ({ ...prev, tickets: tickets.length, pendingTickets, completedTickets }));
      setIsLoading(false);
    });

    // You can add listeners for other collections here if needed, e.g., services, quotes
    // For simplicity, we'll just get the tickets stats for now.

    return () => unsubscribe();
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
          title="Total de Tickets" 
          value={stats.tickets} 
          icon={<Ticket className="h-4 w-4 text-muted-foreground" />} 
          description="Todos los tickets históricos."
        />
        <StatCard 
          title="Tickets Pendientes" 
          value={stats.pendingTickets} 
          icon={<List className="h-4 w-4 text-muted-foreground" />}
          description="Tickets 'Recibidos' o 'En Progreso'."
        />
        <StatCard 
          title="Proyectos Completados" 
          value={stats.completedTickets} 
          icon={<CheckCheck className="h-4 w-4 text-muted-foreground" />}
          description="Total de proyectos completados."
        />
         <StatCard 
          title="Servicios" 
          value="-" 
          icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
          description="Próximamente"
        />
      </div>
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Tickets Recientes</CardTitle>
            </CardHeader>
            <CardContent>
                <TicketTable />
            </CardContent>
        </Card>
      </div>
    </>
  );
}
