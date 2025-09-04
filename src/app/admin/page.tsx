
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TicketTable } from "@/components/admin/ticket-table";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // If not logged in, redirect to login page
        router.push("/login");
      } else if (!isAdmin) {
        // If logged in but not an admin, show error and redirect to home
        toast({
          title: "Access Denied",
          description: "You do not have permission to view this page.",
          variant: "destructive",
        });
        router.push("/");
      }
    }
  }, [user, isLoading, isAdmin, router, toast]);

  // Show a loader while we are verifying auth and role.
  // This will prevent rendering the page content before we know if the user is an admin.
  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // At this point, we know the user is an admin.
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
