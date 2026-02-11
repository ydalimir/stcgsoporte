
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
import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "../ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";
import type { Quote } from "./quote-manager";

export type PurchaseOrderItem = {
  description: string;
  unit: string;
  quantity: number;
  price: number;
};

export type PurchaseOrder = {
  id: string;
  purchaseOrderNumber: number;
  date: string;
  deliveryDate?: string;
  supplierId?: string;
  supplierName: string;
  supplierDetails: string;
  billToDetails: string;
  quoteId?: string;
  shippingMethod?: string;
  paymentMethod?: string;
  status: "Borrador" | "Enviada" | "Recibida Parcialmente" | "Recibida";
  items: PurchaseOrderItem[];
  observations?: string;
  discountPercentage?: number;
  subtotal: number;
  iva: number;
  total: number;
};

const downloadPDF = (po: PurchaseOrder, quotes: Quote[]) => {
    const doc = new jsPDF();
    const poId = `OC01-${String(po.purchaseOrderNumber).padStart(4, '0')}`;
    let yPos = 20;

    // --- Header ---
    doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(41, 71, 121);
    doc.text("LEBAREF", 14, yPos);
    
    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(41, 71, 121);
    doc.text("ORDEN DE COMPRA", 200, yPos, { align: 'right' });
    yPos += 8;

    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 100, 100);
    const poDate = po.date ? new Date(po.date).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'N/A';
    doc.text(`FECHA: ${poDate}`, 200, yPos, { align: 'right' });
    yPos += 4;
    doc.text(`ORDEN DE COMPRA NO.: ${po.purchaseOrderNumber}`, 200, yPos, { align: 'right' });
    yPos += 15;

    // --- Addresses ---
    autoTable(doc, {
        startY: yPos,
        theme: 'plain',
        body: [
             [
                { content: 'FACTURAR A:', styles: { fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 } },
                { content: 'ENVIAR A:', styles: { fontStyle: 'bold', textColor: [0,0,0], fontSize: 9 } }
            ],
            [
                { content: po.billToDetails, styles: { fontSize: 9 } },
                { content: po.supplierDetails, styles: { fontSize: 9 } }
            ]
        ]
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;
    
    
    // --- Details Table ---
    const linkedQuote = quotes.find(q => q.id === po.quoteId);
    const quoteDisplay = linkedQuote ? `C01-${String(linkedQuote.quoteNumber).padStart(4, '0')}` : 'N/A';
    const deliveryDate = po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'N/A'

    autoTable(doc, {
        startY: yPos,
        body: [[
            { content: `COTIZACIÓN:\n${quoteDisplay}`},
            { content: `ENVIAR VÍA:\n${po.shippingMethod || 'N/A'}`},
            { content: `PAGO:\n${po.paymentMethod || 'N/A'}`},
            { content: `FECHA APROX ENTREGA:\n${deliveryDate}`},
        ]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [255, 255, 255], textColor: 0 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;


    // --- Items Table ---
    const subtotal = po.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
    const discountAmount = subtotal * ((po.discountPercentage || 0) / 100);
    const subTotalAfterDiscount = subtotal - discountAmount;
    const ivaAmount = subTotalAfterDiscount * (po.iva / 100);
    const total = subTotalAfterDiscount + ivaAmount;
    
    autoTable(doc, {
      startY: yPos,
      head: [['ARTÍCULO NO.', 'DESCRIPCIÓN', 'UNIDAD', 'CANTIDAD', 'PRECIO POR UNIDAD', 'TOTAL']],
      body: po.items.map((item, index) => [
        index + 1,
        item.description, 
        item.unit || 'PZA',
        (item.quantity || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        `$${(item.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${((item.quantity || 0) * (item.price || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: 0, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 5: { halign: 'right' }},
      didDrawPage: (data) => {
        yPos = data.cursor?.y ?? yPos;
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // --- Totals ---
    const totalsX = 140;
    const totalsY = finalY + 5;
    doc.setFontSize(9);
    doc.text('SUBTOTAL', totalsX, totalsY, { align: 'left'});
    doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 200, totalsY, { align: 'right'});
    if(po.discountPercentage) {
        doc.text(`DESCUENTO ${po.discountPercentage}%`, totalsX, totalsY + 5, { align: 'left'});
        doc.text(`-$${discountAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 200, totalsY + 5, { align: 'right'});
    }
    doc.text('IVA', totalsX, totalsY + 10, { align: 'left'});
    doc.text(`$${ivaAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 200, totalsY + 10, { align: 'right'});
    doc.setFont("helvetica", "bold");
    doc.text('TOTAL', totalsX, totalsY + 15, { align: 'left'});
    doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 200, totalsY + 15, { align: 'right'});
    
    // --- Observations & Signature ---
    const obsY = finalY + 5;
    doc.setFont("helvetica", "normal");
    doc.text('Observaciones / Instrucciones:', 14, obsY);
    const splitObservations = doc.splitTextToSize(po.observations || '', 120); // Split text to fit width
    doc.text(splitObservations, 14, obsY + 5);

    const signatureY = Math.max(obsY + 30, totalsY + 30);
    doc.text('FIRMA AUTORIZADA', 14, signatureY);
    doc.rect(14, signatureY + 2, 80, 20); // Signature box

    doc.setFontSize(8).setTextColor(150);
    doc.text("Para preguntas relacionadas con esta orden de compra, póngase en contacto al correo electrónico:", 105, doc.internal.pageSize.height - 15, {align: 'center'});
    doc.text("lebarefmantenimiento@gmail.com / corporativo@lebaref.com", 105, doc.internal.pageSize.height - 10, {align: 'center'});
    
    doc.save(`${poId}.pdf`);
}

export function PurchaseOrderManager() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setIsLoading(false);
      setPurchaseOrders([]);
      return;
    }

    setIsLoading(true);
    const q = collection(db, "purchase_orders");
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const poData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
        setPurchaseOrders(poData.sort((a, b) => (b.purchaseOrderNumber || 0) - (a.purchaseOrderNumber || 0)));
        setIsLoading(false);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'purchase_orders',
            operation: 'list',
        }));
        toast({ title: "Error al cargar", description: "No se pudieron cargar las órdenes de compra.", variant: "destructive"});
        setIsLoading(false);
    });

    const qQuotes = collection(db, "quotes");
    const unsubscribeQuotes = onSnapshot(qQuotes, (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
        setQuotes(quotesData);
    }, (error) => {
        console.error("Could not load quotes", error);
    });


    return () => {
      unsubscribe();
      unsubscribeQuotes();
    };
  }, [user, authIsLoading, toast]);

  const handleSave = useCallback(async (poData: any) => {
    try {
        if (selectedPO) { // UPDATE
            const poRef = doc(db, "purchase_orders", selectedPO.id);
            await updateDoc(poRef, poData);
            toast({ title: "Orden de Compra Actualizada", description: `La orden para ${poData.supplierName} ha sido actualizada.` });
        } else { // CREATE
            await runTransaction(db, async (transaction) => {
                const counterRef = doc(db, "counters", "purchaseOrders");
                const counterDoc = await transaction.get(counterRef);
                let newPoNumber = 1;
                if (counterDoc.exists()) {
                    newPoNumber = counterDoc.data().lastNumber + 1;
                }
                transaction.set(counterRef, { lastNumber: newPoNumber }, { merge: true });
                const newPoRef = doc(collection(db, "purchase_orders"));
                transaction.set(newPoRef, { ...poData, purchaseOrderNumber: newPoNumber });
            });
            toast({ title: "Orden de Compra Creada", description: `Una nueva orden ha sido creada.` });
        }
        setIsFormOpen(false);
        setSelectedPO(null);
    } catch (error) {
        console.error("Error saving purchase order:", error);
        toast({ title: "Error al guardar", description: "No se pudo guardar la orden.", variant: "destructive"});
    }
  }, [selectedPO, toast]);
  
  const handleDelete = useCallback(async (id: string) => {
    try {
        await deleteDoc(doc(db, "purchase_orders", id));
        toast({ title: "Orden Eliminada", description: `La orden ha sido eliminada.` });
    } catch (error) {
        console.error("Error deleting purchase order:", error);
        toast({ title: "Error al eliminar", description: "No se pudo eliminar la orden.", variant: "destructive" });
    }
  }, [toast]);

  const handleStatusChange = useCallback(async (po: PurchaseOrder, newStatus: PurchaseOrder['status']) => {
    try {
        const poRef = doc(db, "purchase_orders", po.id);
        await updateDoc(poRef, { status: newStatus });
        toast({ title: "Estado Actualizado", description: `La orden para ${po.supplierName} ahora está ${newStatus}.` });
    } catch (error) {
        console.error("Error updating status:", error);
        toast({ title: "Error al actualizar", description: "No se pudo cambiar el estado.", variant: "destructive"});
    }
  }, [toast]);

  const columns: ColumnDef<PurchaseOrder>[] = useMemo(
    () => [
      { 
        accessorKey: "purchaseOrderNumber", 
        header: "ID",
        cell: ({ row }) => {
          const poNumber = row.original.purchaseOrderNumber;
          return poNumber ? `OC01-${String(poNumber).padStart(4, '0')}` : 'N/A';
        }
      },
      { accessorKey: "supplierName", header: "Proveedor" },
      { 
        accessorKey: "date", 
        header: "Fecha", 
        cell: ({ row }) => {
            const date = row.original.date;
            if (!date) return 'N/A';
            const localDate = new Date(date);
            return localDate.toLocaleDateString('es-MX', {timeZone: 'UTC'});
        } 
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => `$${row.original.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      { accessorKey: "status", header: "Estado", cell: ({row}) => <Badge>{row.original.status}</Badge> },
      {
        id: "actions",
        cell: ({ row }) => {
           const po = row.original;
           return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { setSelectedPO(po); setIsFormOpen(true); }}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadPDF(po, quotes)}>
                  <Download className="mr-2 h-4 w-4" /> Descargar PDF
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Cambiar Estado</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup 
                            value={po.status} 
                            onValueChange={(newStatus) => handleStatusChange(po, newStatus as PurchaseOrder['status'])}
                         >
                             <DropdownMenuRadioItem value="Borrador">Borrador</DropdownMenuRadioItem>
                             <DropdownMenuRadioItem value="Enviada">Enviada</DropdownMenuRadioItem>
                             <DropdownMenuRadioItem value="Recibida Parcialmente">Recibida Parcialmente</DropdownMenuRadioItem>
                             <DropdownMenuRadioItem value="Recibida">Recibida</DropdownMenuRadioItem>
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
                        Esta acción eliminará permanentemente la orden de compra.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(po.id)} className="bg-destructive hover:bg-destructive/90">
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
    [handleDelete, handleStatusChange, quotes]
  );

  const table = useReactTable({
    data: purchaseOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: filter,
    },
    onGlobalFilterChange: setFilter,
  });

  if (isLoading && authIsLoading) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Buscar por proveedor..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => { setSelectedPO(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Orden de Compra
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
                        No hay órdenes de compra. Empieza creando una.
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
      <PurchaseOrderForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
        purchaseOrder={selectedPO}
      />
    </div>
  );
}
