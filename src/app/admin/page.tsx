"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileText, ShoppingCart, List, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
};

type UserProfile = {
    role: 'admin' | 'employee';
};

type Project = {
    id: string;
    client: string;
    description: string;
    responsible: string;
    status: "Nuevo" | "En Progreso" | "En Pausa" | "Completado";
    programmedDate: string;
    priority: "Baja" | "Media" | "Alta";
    userId: string;
    lastUpdated: any;
    createdAt: any;
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
  const [inProgressProjects, setInProgressProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 10;

  useEffect(() => {
    if (authIsLoading) {
      return; // Wait for auth to be initialized
    }
    if (!user) {
      router.push('/');
      return; // Redirect if not logged in
    }

    // Set up a master cleanup array
    const unsubs: (() => void)[] = [];

    // First, get the user profile
    const profileUnsub = onSnapshot(doc(db, "users", user.uid), (profileDoc) => {
      if (!profileDoc.exists()) {
        setIsLoading(false);
        console.error("User profile document not found!");
        return;
      }
      
      const userProfile = profileDoc.data() as UserProfile;
      const is_admin = userProfile.role === 'admin';
      
      // Now that we have the profile, set up all other data listeners
      
      // 1. Listener for the in-progress projects table
      const baseProjectsQuery = query(collection(db, "projects"), where("status", "==", "En Progreso"), orderBy("programmedDate", "asc"));
      const projectsQuery = is_admin 
          ? baseProjectsQuery
          : query(baseProjectsQuery, where("userId", "==", user.uid));

      unsubs.push(onSnapshot(projectsQuery, (snapshot) => {
          const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
          setInProgressProjects(projectsData);
          setIsLoading(false); // Main loading is done when projects are loaded
      }, (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'projects', operation: 'list' }));
          setIsLoading(false);
      }));

      // 2. Listeners for the stats cards
      const quotesStatsQuery = is_admin 
        ? query(collection(db, "quotes"))
        : query(collection(db, "quotes"), where("userId", "==", user.uid));
        
      const projectsStatsQuery = is_admin
        ? query(collection(db, "projects"))
        : query(collection(db, "projects"), where("userId", "==", user.uid));
        
      const purchaseOrdersStatsQuery = is_admin
        ? query(collection(db, "purchase_orders"))
        : query(collection(db, "purchase_orders"), where("userId", "==", user.uid));

      unsubs.push(onSnapshot(quotesStatsQuery, (snapshot) => {
        const quotes = snapshot.docs.map(doc => doc.data());
        const pendingQuotes = quotes.filter(q => q.status === 'Enviada' || q.status === 'Borrador').length;
        setStats(prev => ({ ...prev, quotes: quotes.length, pendingQuotes }));
      }, (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: "quotes", operation: 'list' }));
      }));

      unsubs.push(onSnapshot(projectsStatsQuery, (snapshot) => {
          setStats(prev => ({ ...prev, projects: snapshot.docs.length }));
      }, (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: "projects", operation: 'list' }));
      }));
      
      unsubs.push(onSnapshot(purchaseOrdersStatsQuery, (snapshot) => {
          setStats(prev => ({ ...prev, purchaseOrders: snapshot.docs.length }));
      }, (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: "purchase_orders", operation: 'list' }));
      }));

    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${user.uid}`, operation: 'get' }));
      setIsLoading(false);
    });

    unsubs.push(profileUnsub); // Add profile unsub to the list

    // Return a single cleanup function
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, authIsLoading, router]);

  const paginatedProjects = inProgressProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  );
  const totalPages = Math.ceil(inProgressProjects.length / PROJECTS_PER_PAGE);

   if (isLoading) {
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
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : paginatedProjects.length > 0 ? (
                    <>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Responsable</TableHead>
                                        <TableHead>Prioridad</TableHead>
                                        <TableHead>Fecha Prog.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProjects.map((project) => (
                                        <TableRow key={project.id}>
                                            <TableCell>{project.client}</TableCell>
                                            <TableCell className="max-w-xs truncate">{project.description}</TableCell>
                                            <TableCell>{project.responsible}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn('capitalize', {
                                                    'text-red-600 border-red-600': project.priority === 'Alta',
                                                    'text-yellow-600 border-yellow-600': project.priority === 'Media',
                                                    'text-green-600 border-green-600': project.priority === 'Baja',
                                                })}>{project.priority}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {project.programmedDate ? new Date(project.programmedDate.replace(/-/g, '\/')).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No hay proyectos en proceso actualmente.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
