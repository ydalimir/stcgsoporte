

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
import { MoreHorizontal, PlusCircle, Download, Trash2, Edit, Loader2, FileSpreadsheet } from "lucide-react";
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
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction, getDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "../ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";
import * as XLSX from "xlsx";


export type QuoteItem = {
  description: string;
  quantity: number;
  price: number;
  unidad?: string;
};

export type Quote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress: string;
  date: string;
  expirationDate?: string;
  rfc?: string;
  observations?: string;
  policies?: string;
  paymentTerms?: string;
  subtotal: number;
  total: number;
  iva?: number;
  status: "Borrador" | "Enviada" | "Aceptada" | "Rechazada";
  items: QuoteItem[];
  linkedTicketId?: string;
  tipoServicio?: string;
  tipoTrabajo?: string;
  equipoLugar?: string;
  userId: string;
};

type UserProfile = {
  role: 'admin' | 'employee';
  userCode: string;
  quoteCounter: number;
};

const createOrUpdateTicketFromQuote = async (quote: Quote) => {
    if (!quote.items || quote.items.length === 0) {
      throw new Error("La cotización no tiene items.");
    }
    
    const itemsDescription = quote.items.map(item => `${item.quantity} x ${item.description}`).join(', ');
    const finalDescription = `Servicio basado en la cotización #${quote.quoteNumber}. --- ITEMS: ${itemsDescription}. --- OBSERVACIONES: ${quote.observations || 'Ninguna.'}`;

    const ticketData = {
      clientName: quote.clientName,
      clientPhone: quote.clientPhone, 
      clientAddress: quote.clientAddress,
      clientEmail: quote.clientEmail || "N/A", 
      clientRfc: quote.rfc || "N/A",
      serviceType: "correctivo" as "correctivo" | "preventivo", 
      equipmentType: `Servicio desde cotización #${quote.quoteNumber}`,
      description: finalDescription,
      urgency: "media" as "baja" | "media" | "alta",
      status: "Recibido",
      createdAt: serverTimestamp(),
      price: quote.total,
      userId: quote.userId,
      quoteId: quote.id,
    };
  
    const quoteRef = doc(db, "quotes", quote.id);

    if (quote.linkedTicketId) {
        const ticketRef = doc(db, "tickets", quote.linkedTicketId);
        const batch = writeBatch(db);
        batch.update(ticketRef, ticketData);
        batch.update(quoteRef, { status: "Aceptada" });
        await batch.commit();
        return quote.linkedTicketId;
    } else {
        return await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, "counters", "tickets");
            const counterDoc = await transaction.get(counterRef);
            let newTicketNumber = 1;
            if (counterDoc.exists()) {
                newTicketNumber = counterDoc.data().lastNumber + 1;
            }
            transaction.set(counterRef, { lastNumber: newTicketNumber }, { merge: true });

            const newTicketRef = doc(collection(db, "tickets"));
            transaction.set(newTicketRef, { ...ticketData, ticketNumber: newTicketNumber });
            
            transaction.update(quoteRef, { linkedTicketId: newTicketRef.id, status: 'Aceptada' });

            return newTicketRef.id;
        });
    }
};

const downloadPDF = (quote: Quote) => {
    const doc = new jsPDF();
    const quoteId = quote.quoteNumber;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const pageMargin = 14;
    const bottomMargin = 40; // Reserved space for footer and signature

    const drawHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(41, 71, 121); // Primary color
        doc.text("LEBAREF", pageMargin, 20);
        
        const headerDetailsX = pageWidth - pageMargin;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`COTIZACIÓN`, headerDetailsX, 20 - 2, { align: 'right' });
        
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(128, 128, 128);
        doc.text(`${quoteId}`, headerDetailsX, 20 + 4, { align: 'right' });

        doc.setDrawColor(221, 221, 221); // A light grey color
        doc.line(pageMargin, 30, pageWidth - pageMargin, 30);
        doc.setTextColor(0, 0, 0); // Reset color
    };

    // --- Draw Header on Page 1 ---
    drawHeader();

    // --- Client and Service Info ---
    const localDate = new Date(quote.date.replace(/-/g, '\/'));
    autoTable(doc, {
        startY: 35,
        body: [
            [{ content: `Datos del cliente`, styles: { fontStyle: 'bold' } }, { content: `Fecha: ${localDate.toLocaleDateString('es-MX', {timeZone: 'UTC'})}`, styles: { halign: 'right' } }],
            [{ content: `Empresa: ${quote.clientName}` }, { content: `Ciudad: Mérida`, styles: { halign: 'right' } }],
            [{ content: `Dirección: ${quote.clientAddress}` }, { content: `Tipo de Servicio: ${quote.tipoServicio || ''}`, styles: { halign: 'right' } }],
            [{ content: `Teléfono: ${quote.clientPhone}` }, { content: `Tipo de Trabajo: ${quote.tipoTrabajo || ''}`, styles: { halign: 'right' } }],
            [{ content: `RFC: ${quote.rfc || ''}`}, ''],
            [{ content: `Equipo/Lugar: ${quote.equipoLugar || ''}`, colSpan: 2 }],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1 }
    });
    
    // --- Items Table ---
    const subtotal = quote.subtotal ?? quote.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
    const ivaPercentage = quote.iva ?? 16;
    const ivaAmount = subtotal * (ivaPercentage / 100);
    const total = quote.total ?? subtotal + ivaAmount;
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      head: [['No.', 'Descripción', 'Unidad', 'Cantidad', 'Precio', 'Importe']],
      body: quote.items.map((item, index) => [
        index + 1,
        item.description, 
        item.unidad || 'PZA',
        (item.quantity || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        `$${(item.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${((item.quantity || 0) * (item.price || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      foot: [
        ['', '', '', '', { content: 'Subtotal', styles: { halign: 'right' } }, { content: `$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } }],
        ['', '', '', '', { content: `IVA (${ivaPercentage}%)`, styles: { halign: 'right' } }, { content: `$${ivaAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } }],
        ['', '', '', '', { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, { content: `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right' } }],
      ],
      headStyles: { fillColor: [41, 71, 121], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { bottom: bottomMargin }
    });
    
    // --- Other Sections ---
    if (quote.observations) {
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            body: [
                [{ content: 'Comentarios y Diagnóstico:', styles: { fontStyle: 'bold', fontSize: 9 } }],
                [{ content: doc.splitTextToSize(quote.observations, 180), styles: { fontSize: 9 } }],
            ],
            theme: 'plain',
            margin: { bottom: bottomMargin }
        });
    }
    
    if (quote.policies) {
         autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            body: [
                [{ content: 'Garantías:', styles: { fontStyle: 'bold', fontSize: 10 } }],
                [{ content: doc.splitTextToSize(quote.policies, 180), styles: { fontSize: 7 } }],
            ],
            theme: 'plain',
            margin: { bottom: bottomMargin }
        });
    }
    
    if (quote.paymentTerms) {
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            body: [
                [{ content: 'Condiciones de Pago:', styles: { fontStyle: 'bold', fontSize: 10 } }],
                [{ content: doc.splitTextToSize(quote.paymentTerms, 180), styles: { fontSize: 8 } }],
            ],
            theme: 'plain',
            margin: { bottom: bottomMargin }
        });
    }

    // --- Footer and Signature Loop ---
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Redraw header on new pages
        if (i > 1) {
            drawHeader();
        }

        // Draw footer on all pages
        doc.setFontSize(8).setTextColor(150);
        doc.text("Gracias por su preferencia.", pageMargin, pageHeight - 15);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - pageMargin, pageHeight - 15, { align: 'right' });
    }
    
    // Draw signature only on the last page
    doc.setPage(totalPages);
    const signatureY = pageHeight - 30; // Position above the footer
    doc.setDrawColor(150, 150, 150);
    doc.line(70, signatureY, 140, signatureY); // Signature line
    doc.setFontSize(10).setFont(undefined, 'normal').setTextColor(100);
    doc.text("FIRMA DE ACEPTACIÓN", 105, signatureY + 5, { align: 'center' });
    
    doc.save(`${quoteId}.pdf`);
};

const downloadExcel = (quote: Quote) => {
    const quoteId = quote.quoteNumber;
    
    // Items table
    const itemsHeader = ["Descripción", "Unidad", "Cantidad", "Precio Unitario", "Importe"];
    const itemsData = quote.items.map(item => [
      item.description,
      item.unidad || 'PZA',
      item.quantity,
      item.price,
      (item.quantity || 0) * (item.price || 0)
    ]);

    const ws = XLSX.utils.aoa_to_sheet([itemsHeader]);
    XLSX.utils.sheet_add_json(ws, itemsData, {origin: -1, skipHeader: true});

    // Totals
    const subtotal = quote.subtotal ?? quote.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
    const ivaPercentage = quote.iva ?? 16;
    const ivaAmount = subtotal * (ivaPercentage / 100);
    const total = quote.total ?? subtotal + ivaAmount;

    const totalsData = [
        [], // Spacer
        ["", "", "", "Subtotal", subtotal],
        ["", "", "", `IVA (${ivaPercentage}%)`, ivaAmount],
        ["", "", "", "Total", total],
    ];

    XLSX.utils.sheet_add_aoa(ws, totalsData, {origin: -1});

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotizacion");
    XLSX.writeFile(wb, `${quoteId}.xlsx`);
};

export function QuoteManager() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (authIsLoading) return;
    if (!user) {
      setIsProfileLoading(false);
      setIsLoading(false);
      setQuotes([]);
      return;
    }
    const profileUnsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
        }
        setIsProfileLoading(false);
    });
    return () => profileUnsub();
  }, [user, authIsLoading]);

  useEffect(() => {
    if (!user || !userProfile) {
        if (!isProfileLoading) setIsLoading(false);
        return;
    };

    setIsLoading(true);
    const is_admin = userProfile.role === 'admin';
    const baseQuotesQuery = collection(db, "quotes");
    const q = is_admin ? query(baseQuotesQuery) : query(baseQuotesQuery, where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
        setQuotes(quotesData.sort((a, b) => (b.quoteNumber || "").localeCompare(a.quoteNumber || "")));
        setIsLoading(false);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'quotes',
            operation: 'list',
        }));
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, userProfile, isProfileLoading, toast]);

  const handleSave = useCallback(async (quoteData: Omit<Quote, 'id' | 'quoteNumber' | 'userId'>) => {
    if (!user) return;
    try {
        if (selectedQuote) { // UPDATE
            const wasAccepted = selectedQuote.status === 'Aceptada';
            const isNowAccepted = quoteData.status === 'Aceptada';
            
            if (isNowAccepted && !wasAccepted) {
                await createOrUpdateTicketFromQuote({ ...selectedQuote, ...quoteData });
                toast({ title: "Cotización Aceptada", description: `Se ha creado o actualizado la orden de servicio.` });
            } else {
                const quoteRef = doc(db, "quotes", selectedQuote.id);
                await updateDoc(quoteRef, quoteData);
                toast({ title: "Cotización Actualizada", description: `La cotización para ${quoteData.clientName} ha sido actualizada.` });
            }
        } else { // CREATE
            await runTransaction(db, async (transaction) => {
                if (!user) throw new Error("User not authenticated");
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await transaction.get(userDocRef);
            
                if (!userDoc.exists()) {
                    throw new Error("User profile does not exist.");
                }
            
                const userData = userDoc.data();
                const newQuoteCounter = (userData.quoteCounter || 0) + 1;
                const userCode = userData.userCode || "00";
            
                const newQuoteNumber = `C${userCode}-${String(newQuoteCounter).padStart(4, '0')}`;
            
                transaction.update(userDocRef, { quoteCounter: newQuoteCounter });
            
                const newQuoteRef = doc(collection(db, "quotes"));
                transaction.set(newQuoteRef, { ...quoteData, quoteNumber: newQuoteNumber, userId: user.uid });
            });
            toast({ title: "Cotización Creada", description: `Una nueva cotización ha sido creada.` });
        }
        setIsFormOpen(false);
        setSelectedQuote(null);
    } catch (error) {
        const operation = selectedQuote ? 'update' : 'create';
        const path = selectedQuote ? `quotes/${selectedQuote.id}` : 'users';
        const data = selectedQuote ? quoteData : { ...quoteData, userId: user.uid };

        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: path,
            operation: operation === 'create' ? 'write' : 'update',
            requestResourceData: data,
        }));
    }
  }, [selectedQuote, user, toast, setIsFormOpen, setSelectedQuote]);
  
  const handleDelete = useCallback(async (id: string) => {
    const docRef = doc(db, "quotes", id);
    try {
        await deleteDoc(docRef);
        toast({ title: "Cotización Eliminada", description: `La cotización ha sido eliminada.` });
    } catch (error) {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete'
        }));
    }
  }, [toast]);

  const handleStatusChange = useCallback(async (quote: Quote, newStatus: Quote['status']) => {
    const quoteRef = doc(db, "quotes", quote.id);
    const payload = { status: newStatus };
    try {
        if (newStatus === "Aceptada") {
            await createOrUpdateTicketFromQuote(quote);
            toast({ title: "¡Cotización Aceptada!", description: `Se ha generado/actualizado el ticket de servicio.` });
        } else {
            await updateDoc(quoteRef, payload);
            toast({ title: "Estado Actualizado", description: `La cotización para ${quote.clientName} ahora está ${newStatus}.` });
        }
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: quoteRef.path,
            operation: 'update',
            requestResourceData: payload,
        }));
    }
  }, [toast]);

  const columns: ColumnDef<Quote>[] = useMemo(
    () => [
      { 
        accessorKey: "quoteNumber", 
        header: "ID",
        cell: ({ row }) => {
          return row.original.quoteNumber || 'N/A';
        }
      },
      { accessorKey: "clientName", header: "Cliente" },
      { 
        accessorKey: "date", 
        header: "Fecha", 
        cell: ({ row }) => {
            if (!row.original.date) return 'N/A';
            const localDate = new Date(row.original.date.replace(/-/g, '\/'));
            return localDate.toLocaleDateString('es-MX', {timeZone: 'UTC'});
        } 
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => {
            const total = row.original.total ?? (row.original.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * (1 + (row.original.iva ?? 16)/100));
            return `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },
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
                <DropdownMenuItem onClick={() => downloadExcel(quote)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Descargar Excel
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

  const role = userProfile?.role;

  if (isLoading || authIsLoading || isProfileLoading) {
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
        onSave={handleSave as any}
        quote={selectedQuote}
        userRole={role}
      />
    </div>
  );
}




