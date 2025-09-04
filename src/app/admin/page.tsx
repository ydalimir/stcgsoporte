
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TicketTable } from "@/components/admin/ticket-table";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authIsLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authIsLoading) {
      return; // Wait until Firebase auth state is determined
    }

    if (!user) {
      router.push("/login"); // If no user, redirect to login
      return;
    }

    // Now that we have a user, check their role from Firestore
    const checkAdminRole = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          toast({
            title: "Access Denied",
            description: "You do not have permission to view this page.",
            variant: "destructive",
          });
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setIsAdmin(false); // Assume not admin on error
        toast({
          title: "Permission Error",
          description: "Could not verify your role. Please try again later.",
          variant: "destructive",
        });
        router.push("/");
      }
    };

    checkAdminRole();

  }, [user, authIsLoading, router, toast]);

  // Show a loader while auth is loading OR admin check is in progress
  if (authIsLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If the user is not an admin, they will have been redirected.
  // We can safely render the admin content.
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <LayoutDashboard className="w-8 h-8 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Admin Dashboard</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        View, manage, and assign all support tickets from this central hub.
      </p>
      
      <div className="bg-card p-4 sm:p-6 rounded-lg shadow-lg">
        <TicketTable />
      </div>
    </div>
  );
}
