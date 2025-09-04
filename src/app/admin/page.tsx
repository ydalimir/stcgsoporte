
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TicketTable } from "@/components/admin/ticket-table";
import { LayoutDashboard, Loader2, List, Wrench, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceManager } from "@/components/admin/service-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuoteManager } from "@/components/admin/quote-manager";
import { SparePartsManager } from "@/components/admin/spare-parts-manager";


export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authIsLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authIsLoading) {
      return; 
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const checkAdminRole = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          toast({
            title: "Acceso Denegado",
            description: "No tienes permiso para ver esta página.",
            variant: "destructive",
          });
          router.push("/");
        }
      } catch (error) {
        console.error("Error al verificar el rol de admin:", error);
        setIsAdmin(false);
        toast({
          title: "Error de Permisos",
          description: "No se pudo verificar tu rol. Intenta más tarde.",
          variant: "destructive",
        });
        router.push("/");
      }
    };

    checkAdminRole();

  }, [user, authIsLoading, router, toast]);
  
  if (authIsLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Verificando permisos...</p>
      </div>
    );
  }
  
  if (isAdmin) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold font-headline">Panel de Administración</h1>
        </div>
        
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tickets">
              <List className="mr-2"/>
              Tickets
            </TabsTrigger>
            <TabsTrigger value="services">
              <Wrench className="mr-2"/>
              Servicios
            </TabsTrigger>
            <TabsTrigger value="quotes">
              <FileText className="mr-2"/>
              Cotizaciones
            </TabsTrigger>
            <TabsTrigger value="spare-parts">
              <Package className="mr-2"/>
              Refacciones
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tickets">
             <Card>
              <CardHeader>
                <CardTitle>Gestión de Tickets</CardTitle>
                <CardDescription>Ver, gestionar y asignar todos los tickets de soporte desde este panel central.</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
             <Card>
              <CardHeader>
                <CardTitle>Gestión de Servicios</CardTitle>
                <CardDescription>Añadir, editar y eliminar servicios de mantenimiento preventivo y correctivo.</CardDescription>
              </CardHeader>
              <CardContent>
                <ServiceManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes">
             <Card>
              <CardHeader>
                <CardTitle>Gestión de Cotizaciones</CardTitle>
                <CardDescription>Crear, ver, editar y eliminar cotizaciones para los clientes.</CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spare-parts">
             <Card>
              <CardHeader>
                <CardTitle>Gestión de Refacciones</CardTitle>
                <CardDescription>Añadir, editar y eliminar refacciones del inventario.</CardDescription>
              </CardHeader>
              <CardContent>
                <SparePartsManager />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    );
  }

  return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
}
