
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Download, Trash2, Edit, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { QuoteForm } from "@/components/forms/quote-form";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "../ui/badge";


export type QuoteItem = {
  description: string;
  quantity: number;
  price: number;
};

export type Quote = {
  id: string;
  clientName: string;
  date: string;
  expirationDate?: string;
  rfc?: string;
  policies?: string;
  subtotal: number;
  total: number;
  iva?: number;
  status: "Borrador" | "Enviada" | "Aceptada" | "Rechazada";
  items: QuoteItem[];
};

const createTicketFromQuote = async (quote: Quote, toast: (options: any) => void) => {
    if (!quote.items || quote.items.length === 0) {
      toast({ title: "Error", description: "La cotización no tiene items para crear un ticket.", variant: "destructive" });
      return;
    }
  
    const ticketData = {
      userId: 'admin_generated', 
      clientName: quote.clientName,
      clientPhone: "N/A", 
      clientAddress: "N/A",
      clientEmail: "N/A", 
      clientRfc: quote.rfc || "N/A",
      serviceType: "correctivo" as "correctivo" | "preventivo", 
      equipmentType: quote.items.map(item => item.description).join(', '),
      description: `Ticket generado a partir de la cotización #${quote.id.substring(0,7)}. ${quote.policies || ''}`,
      urgency: "media" as "baja" | "media" | "alta",
      status: "Recibido",
      createdAt: serverTimestamp(),
      price: quote.total,
    };
  
    try {
        await addDoc(collection(db, "tickets"), ticketData);
        toast({ title: "¡Cotización Aceptada!", description: `Se ha generado un nuevo ticket de servicio.`});
    } catch (error) {
        console.error("Error creating ticket from quote:", error);
        toast({ title: "Error", description: "No se pudo generar el ticket a partir de la cotización.", variant: "destructive" });
    }
};

const downloadPDF = (quote: Quote) => {
    const doc = new jsPDF();
    let yPos = 22;
    
    doc.setFontSize(20);
    doc.text(`Cotización #${quote.id.substring(0, 7)}`, 14, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text(`Cliente: ${quote.clientName}`, 14, yPos);
    yPos += 7;

    if (quote.rfc) {
      doc.text(`RFC: ${quote.rfc}`, 14, yPos);
      yPos += 7;
    }

    doc.text(`Fecha de Emisión: ${new Date(quote.date).toLocaleDateString('es-MX')}`, 14, yPos);
    if(quote.expirationDate) {
        doc.text(`Válida hasta: ${new Date(quote.expirationDate).toLocaleDateString('es-MX')}`, 120, yPos);
    }
    yPos += 10;

    // Defensively calculate totals in case they are missing from older records
    const subtotal = quote.subtotal ?? quote.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
    const ivaPercentage = quote.iva ?? 16;
    const ivaAmount = subtotal * (ivaPercentage / 100);
    const total = quote.total ?? subtotal + ivaAmount;


    const foot = [
        ['', '', 'Subtotal', `$${subtotal.toFixed(2)}`],
        ['', '', `IVA (${ivaPercentage}%)`, `$${ivaAmount.toFixed(2)}`],
        [{ content: 'Total', styles: { fontStyle: 'bold' } }, '', '', { content: `$${total.toFixed(2)}`, styles: { fontStyle: 'bold' } }],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Descripción', 'Cantidad', 'Precio Unitario', 'Importe']],
      body: quote.items.map(item => [item.description, item.quantity, `$${item.price.toFixed(2)}`, `$${(item.quantity * item.price).toFixed(2)}`]),
      foot: foot,
      headStyles: { fillColor: [46, 154, 254] },
      didDrawPage: (data) => {
        const cursorY = data.cursor?.y;
        if(cursorY) yPos = cursorY;
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (quote.policies) {
        doc.setFontSize(10);
        doc.text("Políticas y Términos:", 14, yPos);
        yPos += 5;
        const splitPolicies = doc.splitTextToSize(quote.policies, 180);
        doc.text(splitPolicies, 14, yPos);
    }
    
    doc.save(`cotizacion-${quote.id.substring(0,7)}.pdf`);
}

export function QuoteManager() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, "quotes"), (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
        setQuotes(quotesData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching quotes:", error);
        toast({ title: "Error al cargar", description: "No se pudieron cargar las cotizaciones.", variant: "destructive"});
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleSave = useCallback(async (quoteData: Omit<Quote, 'id' | 'total'> & { total: number; subtotal: number }) => {
    try {
        if (selectedQuote) {
            const quoteDoc = doc(db, "quotes", selectedQuote.id);
            await updateDoc(quoteDoc, quoteData);
            toast({ title: "Cotización Actualizada", description: `La cotización para ${quoteData.clientName} ha sido actualizada.` });
        } else {
            const newDocRef = await addDoc(collection(db, "quotes"), quoteData);
            toast({ title: "Cotización Creada", description: `La cotización ${newDocRef.id.substring(0,7)} ha sido creada.` });
        }
        setIsFormOpen(false);
        setSelectedQuote(null);
    } catch (error) {
        console.error("Error saving quote:", error);
        toast({ title: "Error al guardar", description: "No se pudo guardar la cotización.", variant: "destructive"});
    }
  }, [selectedQuote, toast]);
  
  const handleDelete = useCallback(async (id: string) => {
    try {
        await deleteDoc(doc(db, "quotes", id));
        toast({ title: "Cotización Eliminada", description: `La cotización ${id.substring(0,7)} ha sido eliminada.` });
    } catch (error) {
        console.error("Error deleting quote:", error);
        toast({ title: "Error al eliminar", description: "No se pudo eliminar la cotización.", variant: "destructive" });
    }
  }, [toast]);

  const handleStatusChange = useCallback(async (quote: Quote, newStatus: Quote['status']) => {
    try {
        const quoteDoc = doc(db, "quotes", quote.id);
        await updateDoc(quoteDoc, { status: newStatus });

        if (newStatus === "Aceptada") {
            await createTicketFromQuote(quote, toast);
        } else {
            toast({ title: "Estado Actualizado", description: `La cotización para ${quote.clientName} ahora está ${newStatus}.` });
        }
    } catch (error) {
        console.error("Error updating status:", error);
        toast({ title: "Error al actualizar", description: "No se pudo cambiar el estado.", variant: "destructive"});
    }
  }, [toast]);

  const columns: ColumnDef<Quote>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.substring(0, 7)}</span> },
      { accessorKey: "clientName", header: "Cliente" },
      { accessorKey: "date", header: "Fecha", cell: ({ row }) => new Date(row.original.date).toLocaleDateString('es-MX') },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => `$${(row.original.total || 0).toFixed(2)}`,
      },
      { accessorKey: "status", header: "Estado", cell: ({row}) => <Badge>{row.original.status}</Badge> },
      {
        id: "actions",
        cell: ({ row }) => {
           const quote = row.original;
           return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { setSelectedQuote(quote); setIsFormOpen(true); }}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadPDF(quote)}>
                  <Download className="mr-2 h-4 w-4" /> Descargar PDF
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Cambiar Estado</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup 
                            value={quote.status} 
                            onValueChange={(newStatus) => handleStatusChange(quote, newStatus as Quote['status'])}
                         >
                             <DropdownMenuRadioItem value="Borrador">Borrador</DropdownMenuRadioItem>
                             <DropdownMenuRadioItem value="Enviada">Enviada</DropdownMenuRadioItem>
                             <DropdownMenuRadioItem value="Aceptada">Aceptada</DropdownMenuRadioItem>
                             <DropdownMenuRadioItem value="Rechazada">Rechazada</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500">
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la cotización.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(quote.id)} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
           );
        },
      },
    ],
    [handleDelete, handleStatusChange]
  );

  const table = useReactTable({
    data: quotes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
        pagination: {
            pageSize: 5,
        }
    },
    state: {
      globalFilter: filter,
    },
    onGlobalFilterChange: setFilter,
  });

  if (isLoading) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Buscar cotización por cliente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => { setSelectedQuote(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Cotización
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
             {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    ))}
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        No hay cotizaciones. Empieza creando una.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
      <QuoteForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
        quote={selectedQuote}
      />
    </div>
  );
}

    