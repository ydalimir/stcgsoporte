
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Loader2, Ticket, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";

export default function ProfilePage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (authIsLoading) {
      return; 
    }
    if (!user) {
      router.push("/login");
      return;
    }
    
    const syncUserProfile = async () => {
      if (!user) return;
      setIsSyncing(true);
      const userDocRef = doc(db, "users", user.uid);
      try {
        const userDoc = await getDoc(userDocRef).catch(serverError => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get',
            }));
            throw serverError; // re-throw to stop execution
        });

        if (!userDoc.exists()) {
          const newUserProfile = {
            email: user.email,
            role: "user", // Default role
            createdAt: new Date().toISOString(),
          };
          // Document doesn't exist, so create it.
          await setDoc(userDocRef, newUserProfile).catch(serverError => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: userDocRef.path,
                  operation: 'create',
                  requestResourceData: newUserProfile
              }));
          });
        }
      } catch (error) {
        // Errors are now handled by the emitter, but we can still log if needed for other reasons.
        // We avoid calling toast here to prevent duplicate notifications.
        console.error("Error syncing user profile:", error);
      } finally {
        setIsSyncing(false);
      }
    };
    
    syncUserProfile();

  }, [user, authIsLoading, router, toast]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      router.push("/");
    } catch (error: any) {
      toast({
        title: "Sign Out Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (authIsLoading || isSyncing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-20 w-20 mb-4">
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl font-headline">Panel de Cliente</CardTitle>
            <CardDescription>Gestiona tu información, tickets de servicio y más.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-b pb-4">
              <p className="text-sm font-medium text-muted-foreground">Correo Electrónico</p>
              <p className="text-lg font-semibold">{user.email}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Button asChild variant="outline">
                   <Link href="/profile/my-tickets">
                       <List className="mr-2 h-4 w-4" />
                       Ver Mis Tickets
                   </Link>
                </Button>
                <Button asChild className="bg-accent hover:bg-accent/90">
                    <Link href="/tickets/new">
                        <Ticket className="mr-2 h-4 w-4"/>
                        Crear Nuevo Ticket
                    </Link>
                </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
