
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export type QuoteItem = {
  description: string;
  quantity: number;
  price: number;
};

export type Quote = {
  id: string;
  clientName: string;
  date: string;
  total: number;
  status: "Borrador" | "Enviada" | "Aceptada" | "Rechazada";
  items: QuoteItem[];
};

export function QuoteManager() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "quotes"), (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
        setQuotes(quotesData);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (quoteData: Omit<Quote, 'id'>) => {
    try {
        if (selectedQuote) {
            const quoteDoc = doc(db, "quotes", selectedQuote.id);
            await updateDoc(quoteDoc, quoteData);
            toast({ title: "Cotización Actualizada", description: `La cotización para ${quoteData.clientName} ha sido actualizada.` });
        } else {
            const newDoc = await addDoc(collection(db, "quotes"), quoteData);
            toast({ title: "Cotización Creada", description: `La cotización ${newDoc.id} ha sido creada.` });
        }
        setSelectedQuote(null);
    } catch (error) {
        console.error("Error saving quote:", error);
        toast({ title: "Error al guardar", description: "No se pudo guardar la cotización.", variant: "destructive"});
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
        await deleteDoc(doc(db, "quotes", id));
        toast({ title: "Cotización Eliminada", description: `La cotización ${id} ha sido eliminada.` });
    } catch (error) {
        console.error("Error deleting quote:", error);
        toast({ title: "Error al eliminar", description: "No se pudo eliminar la cotización.", variant: "destructive" });
    }
  };

  const downloadPDF = (quote: Quote) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`Cotización #${quote.id.substring(0, 7)}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Cliente: ${quote.clientName}`, 14, 32);
    doc.text(`Fecha: ${new Date(quote.date).toLocaleDateString('es-MX')}`, 14, 42);
    
    autoTable(doc, {
      startY: 50,
      head: [['Descripción', 'Cantidad', 'Precio Unitario', 'Importe']],
      body: quote.items.map(item => [item.description, item.quantity, `$${item.price.toFixed(2)}`, `$${(item.quantity * item.price).toFixed(2)}`]),
      foot: [['', '', 'Total', `$${quote.total.toFixed(2)}`]],
      headStyles: { fillColor: [46, 154, 254] },
    });
    
    doc.save(`cotizacion-${quote.id.substring(0,7)}.pdf`);
  }

  const columns: ColumnDef<Quote>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.substring(0, 7)}</span> },
      { accessorKey: "clientName", header: "Cliente" },
      { accessorKey: "date", header: "Fecha" },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => `$${row.original.total.toFixed(2)}`,
      },
      { accessorKey: "status", header: "Estado" },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { setSelectedQuote(row.original); setIsFormOpen(true); }}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPDF(row.original)}>
                <Download className="mr-2 h-4 w-4" /> Descargar PDF
              </DropdownMenuItem>
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
                    <AlertDialogAction onClick={() => handleDelete(row.original.id)} className="bg-destructive hover:bg-destructive/90">
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: quotes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
          onChange={(e) => {
            setFilter(e.target.value);
            table.getColumn("clientName")?.setFilterValue(e.target.value);
          }}
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

    