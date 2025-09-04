
"use client";

import { Ticket } from "@/components/admin/ticket-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type TicketDetailsProps = {
  ticket: Ticket;
};

const downloadServiceOrderPDF = (ticket: Ticket) => {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(16);
  doc.text("Servicio Técnico, Industrial y Comercial de Gastronomía S.A. De C.V.", 14, yPos);
  yPos += 8;
  doc.setFontSize(14);
  doc.text(`Orden de Servicio - Ticket #${ticket.id}`, 14, yPos);
  yPos += 12;

  doc.setFontSize(12);
  doc.text("Información del Cliente", 14, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.text(`Nombre: ${ticket.clientName}`, 14, yPos); yPos += 6;
  doc.text(`Teléfono: ${ticket.clientPhone}`, 14, yPos); yPos += 6;
  doc.text(`Dirección: ${ticket.clientAddress}`, 14, yPos); yPos += 12;

  doc.setFontSize(12);
  doc.text("Detalles del Servicio", 14, yPos); yPos += 7;
  doc.setFontSize(10);
  const details = [
    ["Fecha de Creación", ticket.createdAt?.toDate().toLocaleDateString('es-MX') || "N/A"],
    ["Tipo de Servicio", ticket.serviceType],
    ["Nivel de Urgencia", ticket.urgency.charAt(0).toUpperCase() + ticket.urgency.slice(1)],
    ["Asunto / Equipo", ticket.equipmentType],
  ];
  autoTable(doc, { startY: yPos, head: [['Campo', 'Valor']], body: details, theme: 'striped', headStyles: { fillColor: [46, 154, 254] } });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.text("Descripción del Problema / Necesidad:", 14, yPos); yPos += 6;
  doc.setFontSize(10);
  const splitDescription = doc.splitTextToSize(ticket.description, 180);
  doc.rect(14, yPos, 182, 40);
  doc.text(splitDescription, 15, yPos + 5); yPos += 50;

  doc.setFontSize(12);
  doc.text("Notas del Técnico:", 14, yPos); yPos += 6;
  doc.rect(14, yPos, 182, 60); yPos += 70;

  doc.line(14, yPos, 80, yPos);
  doc.setFontSize(10);
  doc.text("Firma del Cliente", 35, yPos + 5);
  doc.line(116, yPos, 182, yPos);
  doc.text("Firma del Técnico", 135, yPos + 5);

  doc.save(`ORD-${ticket.id}.pdf`);
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
    const { toast } = useToast();

    const updateStatus = async (newStatus: Ticket['status']) => {
        const ticketRef = doc(db, "tickets", ticket.id);
        try {
            await updateDoc(ticketRef, { status: newStatus });
            toast({
                title: "Estado Actualizado",
                description: `El ticket ha sido marcado como ${newStatus}.`,
            });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
        }
    };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                 <CardTitle className="text-2xl font-headline">Detalles del Ticket #{ticket.id.substring(0, 7)}...</CardTitle>
                 <CardDescription>Creado el {ticket.createdAt.toDate().toLocaleString('es-MX')}</CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Estado:</span>
                <Badge variant={ticket.status === 'Resuelto' ? 'secondary' : 'default'} className={cn(
                    'text-white',
                    ticket.status === 'Recibido' && 'bg-blue-500',
                    ticket.status === 'En Progreso' && 'bg-yellow-500 text-black',
                    ticket.status === 'Resuelto' && 'bg-green-500'
                )}>{ticket.status}</Badge>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Information */}
        <section>
            <h3 className="text-lg font-semibold mb-2 font-headline">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground">Nombre:</span> {ticket.clientName}</div>
                <div><span className="font-medium text-muted-foreground">Teléfono:</span> {ticket.clientPhone}</div>
                <div className="col-span-full"><span className="font-medium text-muted-foreground">Dirección:</span> {ticket.clientAddress}</div>
            </div>
        </section>

        <Separator />

        {/* Service Details */}
        <section>
            <h3 className="text-lg font-semibold mb-2 font-headline">Detalles del Servicio</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground">Tipo de Servicio:</span> {ticket.serviceType === 'correctivo' ? 'Correctivo' : 'Preventivo'}</div>
                <div><span className="font-medium text-muted-foreground">Equipo/Asunto:</span> {ticket.equipmentType}</div>
                <div>
                    <span className="font-medium text-muted-foreground">Urgencia:</span>
                    <Badge variant="outline" className={cn('ml-2',
                        ticket.urgency === 'alta' && 'border-red-500 text-red-500',
                        ticket.urgency === 'media' && 'border-yellow-500 text-yellow-500',
                        ticket.urgency === 'baja' && 'border-green-500 text-green-500'
                    )}>{ticket.urgency.charAt(0).toUpperCase() + ticket.urgency.slice(1)}</Badge>
                </div>
                 <div><span className="font-medium text-muted-foreground">Precio:</span> {ticket.price ? `$${ticket.price.toFixed(2)}` : 'N/A'}</div>
            </div>
             <div className="mt-4">
                <p className="font-medium text-muted-foreground text-sm">Descripción del Problema:</p>
                <p className="text-sm mt-1 p-3 bg-muted/50 rounded-md">{ticket.description}</p>
            </div>
        </section>
      </CardContent>
      <CardFooter className="flex-col sm:flex-row justify-end gap-2 bg-muted/30 py-4 px-6">
        <Button variant="outline" onClick={() => downloadServiceOrderPDF(ticket)}><Download className="mr-2"/>Descargar Orden</Button>
        <Button disabled={ticket.status === 'En Progreso'} onClick={() => updateStatus("En Progreso")}>Marcar como En Progreso</Button>
        <Button disabled={ticket.status === 'Resuelto'} onClick={() => updateStatus("Resuelto")} className="bg-green-600 hover:bg-green-700">Marcar como Resuelto</Button>
      </CardFooter>
    </Card>
  );
}
