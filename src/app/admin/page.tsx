"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { TicketTable } from "@/components/admin/ticket-table";
import { LayoutDashboard, Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          router.push("/"); 
        }
      } else {
        router.push("/login");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // or a message, but we are redirecting
  }

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
