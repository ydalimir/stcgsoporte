
import { TicketTable } from "@/components/admin/ticket-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket } from "lucide-react";

export default function TicketsPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Ticket className="w-6 h-6" />
                    <CardTitle>Gestión de Tickets</CardTitle>
                </div>
                <CardDescription>Ver, gestionar y asignar todos los tickets de soporte desde este panel central.</CardDescription>
            </CardHeader>
            <CardContent>
                <TicketTable />
            </CardContent>
        </Card>
    )
}
