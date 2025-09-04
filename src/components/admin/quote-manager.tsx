
"use client";

import { useState, useMemo } from "react";
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
import { MoreHorizontal, PlusCircle, Download, Trash2, Edit } from "lucide-react";
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
import { QuoteForm } from "@/components/forms/quote-form"; // We will create this
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Mock data, to be replaced with Firestore data
const initialData: Quote[] = [
  {
    id: "QUO-001",
    clientName: "La Trattoria",
    date: "2024-07-20",
    total: 4500,
    status: "Enviada",
    items: [
      {
        description: "Mantenimiento Preventivo de Horno",
        quantity: 1,
        price: 1500,
      },
      {
        description: "Limpieza de Campana de Extracción",
        quantity: 2,
        price: 1500,
      },
    ],
  },
  {
    id: "QUO-002",
    clientName: "Mariscos El Faro",
    date: "2024-07-18",
    total: 1200,
    status: "Aceptada",
    items: [
      {
        description: "Reparación Urgente de Refrigerador",
        quantity: 1,
        price: 1200,
      },
    ],
  },
];

type QuoteItem = {
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
  const [quotes, setQuotes] = useState<Quote[]>(initialData);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const handleSave = (quoteData: Quote) => {
    if (selectedQuote) {
      // Update existing quote
      setQuotes(
        quotes.map((q) => (q.id === quoteData.id ? quoteData : q))
      );
      toast({ title: "Cotización Actualizada", description: `La cotización ${quoteData.id} ha sido actualizada.` });
    } else {
      // Create new quote
      setQuotes([...quotes, quoteData]);
      toast({ title: "Cotización Creada", description: `La cotización ${quoteData.id} ha sido creada.` });
    }
    setSelectedQuote(null);
  };
  
  const handleDelete = (id: string) => {
    setQuotes(quotes.filter((q) => q.id !== id));
    toast({ title: "Cotización Eliminada", description: `La cotización ${id} ha sido eliminada.` });
  };

  const downloadPDF = (quote: Quote) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(`Cotización #${quote.id}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Cliente: ${quote.clientName}`, 14, 32);
    doc.text(`Fecha: ${new Date(quote.date).toLocaleDateString('es-MX')}`, 14, 42);
    
    // Table
    autoTable(doc, {
      startY: 50,
      head: [['Descripción', 'Cantidad', 'Precio Unitario', 'Importe']],
      body: quote.items.map(item => [item.description, item.quantity, `$${item.price.toFixed(2)}`, `$${(item.quantity * item.price).toFixed(2)}`]),
      foot: [['', '', 'Total', `$${quote.total.toFixed(2)}`]],
      headStyles: { fillColor: [46, 154, 254] }, // Primary color
    });
    
    doc.save(`cotizacion-${quote.id}.pdf`);
  }

  const columns: ColumnDef<Quote>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
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

