import { TicketTable } from "@/components/admin/ticket-table";
import { LayoutDashboard } from "lucide-react";

export default function AdminDashboardPage() {
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
