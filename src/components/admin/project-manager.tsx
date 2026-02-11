

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, MoreHorizontal, Edit, Trash2, Check, ChevronsUpDown, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getFilteredRowModel, getPaginationRowModel } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import type { Quote } from "./quote-manager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QuoteForm } from "../forms/quote-form";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PurchaseOrder } from "./purchase-order-manager";
import { PurchaseOrderForm } from "../forms/purchase-order-form";


const projectSchema = z.object({
  id: z.string().optional(),
  client: z.string().min(2, { message: "El nombre del cliente es requerido." }),
  description: z.string().min(10, { message: "La descripción es requerida (mínimo 10 caracteres)." }),
  responsible: z.string().min(2, { message: "El nombre del responsable es requerido." }),
  status: z.enum(["Nuevo", "En Progreso", "En Pausa", "Completado"]),
  programmedDate: z.string().min(1, { message: "La fecha programada es requerida." }),
  priority: z.enum(["Baja", "Media", "Alta"]),
  quoteId: z.string().optional().nullable(),
  purchaseOrderId: z.string().optional().nullable(),
});

export type Project = z.infer<typeof projectSchema> & {
    id: string;
    lastUpdated: any; // Using any for Firestore Timestamp flexibility
    createdAt: any;
};

const downloadQuotePDF = (quote: Quote) => {
    const doc = new jsPDF();
    const quoteId = `COT-${String(quote.quoteNumber).padStart(4, '0')}`;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(41, 71, 121); // Primary color
    doc.text("LEBAREF", 14, yPos);
    
    const headerDetailsX = 196;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`COTIZACIÓN`, headerDetailsX, yPos - 2, { align: 'right' });
    
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(128, 128, 128);
    doc.text(`${quoteId}`, headerDetailsX, yPos + 4, { align: 'right' });

    yPos = 30;
    doc.setDrawColor(221, 221, 221); // A light grey color
    doc.line(14, yPos, 196, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0); // Reset color

    const localDate = new Date(quote.date);

    // --- Client and Service Info ---
    autoTable(doc, {
        startY: yPos,
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
    yPos = (doc as any).lastAutoTable.finalY + 10;


    // --- Items Table ---
    const subtotal = quote.subtotal ?? quote.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
    const ivaPercentage = quote.iva ?? 16;
    const ivaAmount = subtotal * (ivaPercentage / 100);
    const total = quote.total ?? subtotal + ivaAmount;
    
    autoTable(doc, {
      startY: yPos,
      head: [['No.', 'Descripción', 'Unidad', 'Cantidad', 'Precio', 'Importe']],
      body: quote.items.map((item, index) => [
        index + 1,
        item.description, 
        item.unidad || 'PZA',
        (item.quantity || 0).toFixed(2), 
        `$${(item.price || 0).toFixed(2)}`, 
        `$${((item.quantity || 0) * (item.price || 0)).toFixed(2)}`
      ]),
      foot: [
        ['', '', '', '', { content: 'Subtotal', styles: { halign: 'right' } }, { content: `$${subtotal.toFixed(2)}`, styles: { halign: 'right' } }],
        ['', '', '', '', { content: `IVA (${ivaPercentage}%)`, styles: { halign: 'right' } }, { content: `$${ivaAmount.toFixed(2)}`, styles: { halign: 'right' } }],
        ['', '', '', '', { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, { content: `$${total.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }],
      ],
      headStyles: { fillColor: [41, 71, 121] },
      didDrawPage: (data) => {
        yPos = data.cursor?.y ?? yPos;
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Comentarios y Diagnostico ---
    if (quote.observations) {
        doc.setFontSize(9).setFont(undefined, 'bold');
        doc.text("Comentarios y Diagnóstico:", 14, yPos);
        yPos += 5;
        doc.setFontSize(9).setFont(undefined, 'normal');
        const splitObservations = doc.splitTextToSize(quote.observations, 180);
        doc.text(splitObservations, 14, yPos);
        yPos += splitObservations.length * 4 + 5;
    }
    
    // --- Garantias ---
    if (quote.policies) {
        doc.setFontSize(10).setFont(undefined, 'bold');
        doc.text("Garantías:", 14, yPos);
        yPos += 5;
        doc.setFontSize(7).setFont(undefined, 'normal');
        const splitPolicies = doc.splitTextToSize(quote.policies, 180);
        doc.text(splitPolicies, 14, yPos);
        yPos += splitPolicies.length * 3 + 10;
    }
    
    // --- Payment Conditions ---
    if (quote.paymentTerms) {
        doc.setFontSize(10).setFont(undefined, 'bold');
        doc.text("Condiciones de Pago:", 14, yPos);
        yPos += 6;
        
        doc.setFontSize(8).setFont(undefined, 'normal');
        const paymentTermsLines = doc.splitTextToSize(quote.paymentTerms, 180);
        doc.text(paymentTermsLines, 14, yPos);
    }
    
    // --- Footer with Signature ---
    const finalY = pageHeight - 35;
    doc.setDrawColor(150, 150, 150);
    doc.line(70, finalY, 140, finalY); // Signature line
    doc.setFontSize(10).setFont(undefined, 'normal').setTextColor(100);
    doc.text("FIRMA DE ACEPTACIÓN", 105, finalY + 5, { align: 'center' });
    
    doc.setFontSize(8).setTextColor(150);
    doc.text("Gracias por su preferencia.", 14, pageHeight - 10);
    
    doc.save(`${quoteId}.pdf`);
}

const downloadPurchaseOrderPDF = (po: PurchaseOrder, quotes: Quote[]) => {
    const doc = new jsPDF();
    const poId = `OC-${String(po.purchaseOrderNumber).padStart(4, '0')}`;
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
    const quoteDisplay = linkedQuote ? `COT-${String(linkedQuote.quoteNumber).padStart(4, '0')}` : 'N/A';
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
        (item.quantity || 0).toFixed(2), 
        `$${(item.price || 0).toFixed(2)}`, 
        `$${((item.quantity || 0) * (item.price || 0)).toFixed(2)}`
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
    doc.text(`$${subtotal.toFixed(2)}`, 200, totalsY, { align: 'right'});
    if(po.discountPercentage) {
        doc.text(`DESCUENTO ${po.discountPercentage}%`, totalsX, totalsY + 5, { align: 'left'});
        doc.text(`-$${discountAmount.toFixed(2)}`, 200, totalsY + 5, { align: 'right'});
    }
    doc.text('IVA', totalsX, totalsY + 10, { align: 'left'});
    doc.text(`$${ivaAmount.toFixed(2)}`, 200, totalsY + 10, { align: 'right'});
    doc.setFont("helvetica", "bold");
    doc.text('TOTAL', totalsX, totalsY + 15, { align: 'left'});
    doc.text(`$${total.toFixed(2)}`, 200, totalsY + 15, { align: 'right'});
    
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


export function ProjectManager() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [linkingProject, setLinkingProject] = useState<Project | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  const [isPOFormOpen, setIsPOFormOpen] = useState(false);
  const [linkingProjectForPO, setLinkingProjectForPO] = useState<Project | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);


  useEffect(() => {
    if (authIsLoading) return;
    if (!user) {
      setIsLoading(false);
      setProjects([]);
      return;
    }
    
    setIsLoading(true);
    const projectsQuery = collection(db, "projects");
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(data.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
        setIsLoading(false);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'projects', operation: 'list' }));
        toast({ title: "Error de Permisos", description: "No se pudieron cargar los proyectos.", variant: "destructive" });
        setIsLoading(false);
    });

    const quotesQuery = collection(db, "quotes");
    const unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
        setQuotes(data);
    }, (error) => {
        console.error("Could not load quotes for project linking.");
    });
    
    const poQuery = collection(db, "purchase_orders");
    const unsubscribePOs = onSnapshot(poQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
        setPurchaseOrders(data);
    }, (error) => {
        console.error("Could not load purchase orders for project linking.");
    });


    return () => {
        unsubscribeProjects();
        unsubscribeQuotes();
        unsubscribePOs();
    };
  }, [user, authIsLoading, toast]);

  const handleSaveProject = useCallback(async (data: Omit<Project, 'id' | 'lastUpdated' | 'createdAt'>) => {
    try {
        const projectData = { ...data, lastUpdated: serverTimestamp() };
        if (selectedProject?.id) {
            const projectDoc = doc(db, "projects", selectedProject.id);
            await updateDoc(projectDoc, projectData);
            toast({ title: "Proyecto Actualizado", description: "El proyecto ha sido actualizado." });
        } else {
            await addDoc(collection(db, "projects"), { ...projectData, createdAt: serverTimestamp() });
            toast({ title: "Proyecto Creado", description: "Un nuevo proyecto ha sido creado." });
        }
        setIsFormOpen(false);
        setSelectedProject(null);
    } catch(error) {
        console.error("Error saving project:", error);
        toast({ title: "Error al guardar", variant: "destructive" });
    }
  }, [selectedProject, toast]);

  const handleDeleteProject = useCallback(async (id: string) => {
      try {
        await deleteDoc(doc(db, "projects", id));
        toast({ title: "Proyecto Eliminado", variant: "destructive" });
      } catch(error) {
         console.error("Error deleting project:", error);
         toast({ title: "Error al eliminar", variant: "destructive" });
      }
  }, [toast]);

   const handleStatusChange = useCallback(async (projectId: string, newStatus: Project['status']) => {
    const projectDoc = doc(db, "projects", projectId);
    try {
        await updateDoc(projectDoc, { status: newStatus });
        toast({ title: "Estado Actualizado", description: `El estado del proyecto ahora es ${newStatus}.` });
    } catch(error) {
        console.error("Error updating status:", error);
        toast({ title: "Error al actualizar", variant: "destructive" });
    }
  }, [toast]);

  const handleLinkQuote = useCallback(async (projectId: string, quoteId: string | null) => {
      const projectDoc = doc(db, "projects", projectId);
      try {
        await updateDoc(projectDoc, { quoteId: quoteId });
        toast({ title: "Proyecto Actualizado", description: "La cotización ha sido vinculada/desvinculada." });
      } catch(error) {
         console.error("Error linking quote:", error);
         toast({ title: "Error al vincular", variant: "destructive" });
      }
  }, [toast]);

  const handleSaveAndLinkQuote = useCallback(async (quoteData: any) => {
    if (!linkingProject) return;
    try {
        const newQuoteId = await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, "counters", "quotes");
            const counterDoc = await transaction.get(counterRef);
            let newQuoteNumber = 1;
            if (counterDoc.exists()) {
                newQuoteNumber = counterDoc.data().lastNumber + 1;
            }
            transaction.set(counterRef, { lastNumber: newQuoteNumber }, { merge: true });
            const newQuoteRef = doc(collection(db, "quotes"));
            transaction.set(newQuoteRef, { ...quoteData, quoteNumber: newQuoteNumber });
            return newQuoteRef.id;
        });

        const projectDoc = doc(db, "projects", linkingProject.id);
        await updateDoc(projectDoc, { quoteId: newQuoteId });

        toast({ title: "Cotización Creada y Vinculada", description: "La nueva cotización se ha vinculado al proyecto." });

    } catch (error) {
        console.error("Error creating and linking quote:", error);
        toast({ title: "Error al vincular", description: "No se pudo crear y vincular la cotización.", variant: "destructive" });
    } finally {
        setIsQuoteFormOpen(false);
        setLinkingProject(null);
    }
  }, [linkingProject, toast]);

    const handleUpdateQuote = useCallback(async (quoteData: any) => {
        if (!editingQuote) return;
        try {
            const quoteRef = doc(db, "quotes", editingQuote.id);
            await updateDoc(quoteRef, quoteData);
            toast({ title: "Cotización Actualizada", description: `La cotización para ${quoteData.clientName} ha sido actualizada.` });
        } catch (error) {
            console.error("Error updating quote:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `quotes/${editingQuote.id}`,
                operation: 'update',
                requestResourceData: quoteData
            }));
            toast({ title: "Error al actualizar", description: "No se pudo actualizar la cotización.", variant: "destructive" });
        } finally {
            setIsQuoteFormOpen(false);
            setEditingQuote(null);
        }
    }, [editingQuote, toast]);

    const handleEditQuote = (quote: Quote) => {
        setEditingQuote(quote);
        setIsQuoteFormOpen(true);
    };

  const handleLinkPurchaseOrder = useCallback(async (projectId: string, purchaseOrderId: string | null) => {
      const projectDoc = doc(db, "projects", projectId);
      try {
        await updateDoc(projectDoc, { purchaseOrderId: purchaseOrderId });
        toast({ title: "Proyecto Actualizado", description: "La orden de compra ha sido vinculada/desvinculada." });
      } catch(error) {
         console.error("Error linking purchase order:", error);
         toast({ title: "Error al vincular", variant: "destructive" });
      }
  }, [toast]);

  const handleSaveAndLinkPO = useCallback(async (poData: any) => {
    if (!linkingProjectForPO) return;
    try {
        const newPOId = await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, "counters", "purchaseOrders");
            const counterDoc = await transaction.get(counterRef);
            let newPoNumber = 1;
            if (counterDoc.exists()) {
                newPoNumber = counterDoc.data().lastNumber + 1;
            }
            transaction.set(counterRef, { lastNumber: newPoNumber }, { merge: true });
            const newPORef = doc(collection(db, "purchase_orders"));
            transaction.set(newPORef, { ...poData, purchaseOrderNumber: newPoNumber });
            return newPORef.id;
        });

        const projectDoc = doc(db, "projects", linkingProjectForPO.id);
        await updateDoc(projectDoc, { purchaseOrderId: newPOId });

        toast({ title: "Orden de Compra Creada y Vinculada", description: "La nueva orden de compra se ha vinculado al proyecto." });

    } catch (error) {
        console.error("Error creating and linking PO:", error);
        toast({ title: "Error al vincular", description: "No se pudo crear y vincular la orden de compra.", variant: "destructive" });
    } finally {
        setIsPOFormOpen(false);
        setLinkingProjectForPO(null);
    }
  }, [linkingProjectForPO, toast]);

  const handleUpdatePO = useCallback(async (poData: any) => {
      if (!editingPO) return;
      try {
          const poRef = doc(db, "purchase_orders", editingPO.id);
          await updateDoc(poRef, poData);
          toast({ title: "Orden de Compra Actualizada", description: `La orden para ${poData.supplierName} ha sido actualizada.` });
      } catch (error) {
          console.error("Error updating PO:", error);
          toast({ title: "Error al actualizar", description: "No se pudo actualizar la orden de compra.", variant: "destructive" });
      } finally {
          setIsPOFormOpen(false);
          setEditingPO(null);
      }
  }, [editingPO, toast]);

    const handleEditPO = (po: PurchaseOrder) => {
        setEditingPO(po);
        setIsPOFormOpen(true);
    };
  
  const columns: ColumnDef<Project>[] = useMemo(() => [
      { accessorKey: "client", header: "Cliente" },
      { accessorKey: "description", header: "Descripción", cell: ({row}) => <div className="max-w-xs whitespace-normal">{row.original.description}</div> },
      { accessorKey: "responsible", header: "Responsable", cell: ({row}) => {
          const name = row.original.responsible;
          const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
          return (
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 text-xs">
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span>{name}</span>
            </div>
          )
      } },
       { 
        id: "quote",
        header: "Cotización",
        cell: ({ row }) => {
            const project = row.original;
            const currentQuote = quotes.find(q => q.id === project.quoteId);
            const [open, setOpen] = useState(false);
            
            const otherLinkedQuoteIds = new Set(
              projects.filter(p => p.id !== project.id).map(p => p.quoteId).filter(Boolean)
            );
            const availableQuotes = quotes.filter(q => !otherLinkedQuoteIds.has(q.id));

            const onSelectQuote = (quoteId: string | null) => {
              handleLinkQuote(project.id, quoteId);
              setOpen(false);
            }

            return (
              <div className="flex items-center gap-1">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-[150px] justify-between">
                      {currentQuote 
                          ? `COT-${String(currentQuote.quoteNumber).padStart(3, '0')}`
                          : "Asignar..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar por cliente o ID..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron cotizaciones.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem key="ninguna" value="ninguna" onSelect={() => onSelectQuote(null)}>
                            <Check className={cn("mr-2 h-4 w-4", !project.quoteId ? "opacity-100" : "opacity-0")}/>
                            Ninguna
                          </CommandItem>
                          {availableQuotes.map(q => (
                            <CommandItem 
                              key={q.id} 
                              value={`COT-${String(q.quoteNumber).padStart(3, '0')} ${q.clientName}`}
                              onSelect={() => onSelectQuote(q.id)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", project.quoteId === q.id ? "opacity-100" : "opacity-0")}/>
                              COT-{String(q.quoteNumber).padStart(3, '0')} ({q.clientName})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                          <CommandGroup>
                              <CommandItem onSelect={() => { setOpen(false); setLinkingProject(project); setIsQuoteFormOpen(true); }}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Crear y Vincular Cotización
                              </CommandItem>
                          </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                 {currentQuote && (
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditQuote(currentQuote)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadQuotePDF(currentQuote)}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                )}
              </div>
            )
        }
      },
      { accessorKey: "status", header: "Estado", cell: ({row}) => {
         const project = row.original;
         const status = project.status;
         return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-0 h-auto">
                        <Badge variant="outline" className={cn('cursor-pointer capitalize', {
                           'text-blue-600 border-blue-600': status === 'Nuevo',
                           'text-yellow-600 border-yellow-600': status === 'En Progreso',
                           'text-red-600 border-red-600': status === 'En Pausa',
                           'text-green-600 border-green-600': status === 'Completado',
                        })}>{status}</Badge>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     <DropdownMenuRadioGroup value={project.status} onValueChange={(newStatus) => handleStatusChange(project.id, newStatus as Project['status'])}>
                        <DropdownMenuRadioItem value="Nuevo">Nuevo</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="En Progreso">En Progreso</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="En Pausa">En Pausa</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Completado">Completado</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
         )
      }},
      { accessorKey: "programmedDate", header: "Fecha Prog.", cell: ({row}) => {
        if (!row.original.programmedDate) return 'N/A';
        const localDate = new Date(row.original.programmedDate);
        return localDate.toLocaleDateString('es-MX', {timeZone: 'UTC'});
      }},
       { 
        id: "purchaseOrder",
        header: "Orden de Compra",
        cell: ({ row }) => {
            const project = row.original;
            const currentPO = purchaseOrders.find(po => po.id === project.purchaseOrderId);
            const [open, setOpen] = useState(false);
            
            const otherLinkedPoIds = new Set(projects.filter(p => p.id !== project.id).map(p => p.purchaseOrderId).filter(Boolean));
            const availablePOs = purchaseOrders.filter(po => !otherLinkedPoIds.has(po.id));

            const onSelectPO = (poId: string | null) => {
              handleLinkPurchaseOrder(project.id, poId);
              setOpen(false);
            }

            return (
              <div className="flex items-center gap-1">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-[150px] justify-between">
                      {currentPO 
                          ? `OC-${String(currentPO.purchaseOrderNumber).padStart(3, '0')}`
                          : "Asignar..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar por proveedor o ID..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron órdenes.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem key="ninguna-po" value="ninguna-po" onSelect={() => onSelectPO(null)}>
                            <Check className={cn("mr-2 h-4 w-4", !project.purchaseOrderId ? "opacity-100" : "opacity-0")}/>
                            Ninguna
                          </CommandItem>
                          {availablePOs.map(po => (
                            <CommandItem 
                              key={po.id} 
                              value={`OC-${String(po.purchaseOrderNumber).padStart(3, '0')} ${po.supplierName}`}
                              onSelect={() => onSelectPO(po.id)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", project.purchaseOrderId === po.id ? "opacity-100" : "opacity-0")}/>
                              OC-{String(po.purchaseOrderNumber).padStart(3, '0')} ({po.supplierName})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                          <CommandGroup>
                              <CommandItem onSelect={() => { setOpen(false); setLinkingProjectForPO(project); setIsPOFormOpen(true); }}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Crear y Vincular O.C.
                              </CommandItem>
                          </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                 {currentPO && (
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPO(currentPO)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadPurchaseOrderPDF(currentPO, quotes)}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                )}
              </div>
            )
        }
      },
      { accessorKey: "priority", header: "Prioridad", cell: ({row}) => {
         const priority = row.original.priority;
         return <Badge variant="outline" className={cn('capitalize', {
            'text-red-600 border-red-600': priority === 'Alta',
            'text-yellow-600 border-yellow-600': priority === 'Media',
            'text-green-600 border-green-600': priority === 'Baja',
         })}>{priority}</Badge>
      }},
      { accessorKey: "lastUpdated", header: "Última Act.", cell: ({row}) => row.original.lastUpdated ? new Date(row.original.lastUpdated.toDate()).toLocaleDateString() : 'N/A' },
      { id: "actions",
        cell: ({ row }) => {
            const project = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedProject(project); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500"><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta acción eliminará el proyecto permanentemente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
      }
  ], [handleDeleteProject, handleStatusChange, quotes, projects, handleLinkQuote, purchaseOrders, handleLinkPurchaseOrder, handleSaveAndLinkQuote, handleUpdateQuote, handleSaveAndLinkPO, handleUpdatePO, handleEditPO, handleEditQuote]);
  
  const table = useReactTable({ 
    data: projects, 
    columns, 
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
  });

  const quoteForForm = useMemo(() => 
    editingQuote || (linkingProject ? { clientName: linkingProject.client } : null)
  , [editingQuote, linkingProject]);

  const poForForm = useMemo(() => 
    editingPO || (linkingProjectForPO ? {} : null)
  , [editingPO, linkingProjectForPO]);

  
  if (isLoading && authIsLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
             <Input placeholder="Buscar por cliente o descripción..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm"/>
            <Button onClick={() => { setSelectedProject(null); setIsFormOpen(true);}}><PlusCircle className="mr-2 h-4 w-4" /> Crear Proyecto</Button>
        </div>
        <div className="rounded-md border">
            <Table>
                <TableHeader>{table.getHeaderGroups().map(headerGroup => (<TableRow key={headerGroup.id}>{headerGroup.headers.map(header => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>))}</TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (table.getRowModel().rows.map(row => (<TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>))) : (<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No hay proyectos. Empieza creando uno.</TableCell></TableRow>)}
                </TableBody>
            </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>

      <ProjectFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} onSave={handleSaveProject} project={selectedProject} quotes={quotes} purchaseOrders={purchaseOrders} />
      <QuoteForm 
        isOpen={isQuoteFormOpen}
        onOpenChange={(open) => {
            if (!open) {
                setLinkingProject(null);
                setEditingQuote(null);
            }
            setIsQuoteFormOpen(open);
        }}
        onSave={editingQuote ? handleUpdateQuote : handleSaveAndLinkQuote as any}
        quote={quoteForForm}
      />
      <PurchaseOrderForm
        isOpen={isPOFormOpen}
        onOpenChange={(open) => {
            if (!open) {
                setLinkingProjectForPO(null);
                setEditingPO(null);
            }
            setIsPOFormOpen(open);
        }}
        onSave={editingPO ? handleUpdatePO : handleSaveAndLinkPO}
        purchaseOrder={poForForm as PurchaseOrder}
      />
    </div>
  );
}

interface ProjectFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<Project, 'id' | 'lastUpdated' | 'createdAt'>) => void;
  project: Project | null;
  quotes: Quote[];
  purchaseOrders: PurchaseOrder[];
}

function ProjectFormDialog({ isOpen, onOpenChange, onSave, project, quotes, purchaseOrders }: ProjectFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const form = useForm<z.infer<typeof projectSchema>>({
        resolver: zodResolver(projectSchema),
        defaultValues: { client: "", description: "", responsible: "", status: "Nuevo", programmedDate: formatDate(new Date()), priority: "Media", quoteId: undefined, purchaseOrderId: undefined }
    });

    useEffect(() => {
        if (isOpen) {
          if (project) {
            form.reset({ ...project, programmedDate: new Date(project.programmedDate).toISOString().split('T')[0]});
          } else {
            form.reset({ client: "", description: "", responsible: "", status: "Nuevo", programmedDate: formatDate(new Date()), priority: "Media", quoteId: undefined, purchaseOrderId: undefined });
          }
        }
      }, [project, isOpen, form]);

    const handleSubmit = async (data: z.infer<typeof projectSchema>) => {
        setIsSubmitting(true);
        await onSave(data);
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{project ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}</DialogTitle>
                    <DialogDescription>Completa los detalles del proyecto.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
                        <FormField control={form.control} name="client" render={({ field }) => ( <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input placeholder="Nombre del cliente" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Describe el proyecto en detalle..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="responsible" render={({ field }) => ( <FormItem><FormLabel>Responsable</FormLabel><FormControl><Input placeholder="Persona a cargo" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="programmedDate" render={({ field }) => ( <FormItem><FormLabel>Fecha Programada</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="Nuevo">Nuevo</SelectItem><SelectItem value="En Progreso">En Progreso</SelectItem><SelectItem value="En Pausa">En Pausa</SelectItem><SelectItem value="Completado">Completado</SelectItem></SelectContent>
                            </Select><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="priority" render={({ field }) => (
                            <FormItem><FormLabel>Prioridad</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="Baja">Baja</SelectItem><SelectItem value="Media">Media</SelectItem><SelectItem value="Alta">Alta</SelectItem></SelectContent>
                            </Select><FormMessage /></FormItem>
                           )} />
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <FormField control={form.control} name="quoteId" render={({ field }) => (
                                <FormItem><FormLabel>Cotización Vinculada</FormLabel>
                                <Select onValueChange={(value) => field.onChange(value === 'none' ? null : value)} value={field.value || "none"}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar cotización..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguna</SelectItem>
                                        {quotes.map(q => (
                                            <SelectItem key={q.id} value={q.id}>
                                               COT-{String(q.quoteNumber).padStart(3, '0')} ({q.clientName})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="purchaseOrderId" render={({ field }) => (
                                <FormItem><FormLabel>Orden de Compra Vinculada</FormLabel>
                                 <Select onValueChange={(value) => field.onChange(value === 'none' ? null : value)} value={field.value || "none"}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar orden..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguna</SelectItem>
                                        {purchaseOrders.map(po => (
                                            <SelectItem key={po.id} value={po.id}>
                                               OC-{String(po.purchaseOrderNumber).padStart(3, '0')} ({po.supplierName})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage /></FormItem>
                            )} />
                        </div>
                         <DialogFooter className="sticky bottom-0 bg-background pt-4">
                            <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {project ? 'Guardar Cambios' : 'Crear Proyecto'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
