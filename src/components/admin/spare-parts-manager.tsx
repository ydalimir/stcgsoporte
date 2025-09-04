
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
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Loader2, PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
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
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getFilteredRowModel } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Textarea } from "../ui/textarea";


const sparePartSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  brand: z.string().min(2, { message: "La marca es requerida." }),
  sku: z.string().min(3, { message: "El SKU es requerido." }),
  price: z.coerce.number().min(0, { message: "El precio es requerido y no puede ser negativo." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
});

export type SparePart = z.infer<typeof sparePartSchema>;


export function SparePartsManager() {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "spare_parts"), (snapshot) => {
        const partsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SparePart));
        setSpareParts(partsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching spare parts:", error);
        toast({ title: "Error al cargar", description: "No se pudieron cargar las refacciones.", variant: "destructive"});
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleSavePart = useCallback(async (data: Omit<SparePart, 'id'>) => {
    try {
        if (selectedPart && selectedPart.id) {
            const partDoc = doc(db, "spare_parts", selectedPart.id);
            await updateDoc(partDoc, data);
            toast({ title: "Refacción Actualizada", description: `La refacción "${data.name}" fue actualizada.` });
        } else {
            await addDoc(collection(db, "spare_parts"), data);
            toast({ title: "Refacción Creada", description: `La refacción "${data.name}" ha sido añadida.` });
        }
        setIsFormOpen(false);
        setSelectedPart(null);
    } catch(error) {
        console.error("Error saving part:", error);
        toast({ title: "Error al guardar", description: "No se pudo guardar la refacción.", variant: "destructive" });
    }
  }, [selectedPart, toast]);

  const handleDeletePart = useCallback(async (id?: string) => {
      if(!id) return;
      try {
        await deleteDoc(doc(db, "spare_parts", id));
        toast({ title: "Refacción Eliminada", variant: "destructive" });
      } catch(error) {
         console.error("Error deleting part:", error);
         toast({ title: "Error al eliminar", description: "No se pudo eliminar la refacción.", variant: "destructive" });
      }
  }, [toast]);
  
  const columns: ColumnDef<SparePart>[] = useMemo(() => [
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "brand", header: "Marca" },
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "price", header: "Precio", cell: ({ row }) => `$${row.original.price.toFixed(2)}` },
      { id: "actions",
        cell: ({ row }) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => { setSelectedPart(row.original); setIsFormOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4"/> Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500">
                                <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer. La refacción será eliminada permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePart(row.original.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        )
      }
  ], [handleDeletePart]);
  
  const table = useReactTable({ 
    data: spareParts, 
    columns, 
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
                placeholder="Buscar refacción por nombre..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
            />
            <Button onClick={() => { setSelectedPart(null); setIsFormOpen(true);}}>
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Refacción
            </Button>
        </div>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map(row => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No hay refacciones. Empieza creando una.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

      <SparePartFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSavePart}
        part={selectedPart}
      />
    </div>
  );
}


interface SparePartFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<SparePart, 'id'>) => void;
  part: SparePart | null;
}

function SparePartFormDialog({ isOpen, onOpenChange, onSave, part }: SparePartFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof sparePartSchema>>({
        resolver: zodResolver(sparePartSchema),
        defaultValues: { name: "", brand: "", sku: "", price: 0, description: "" }
    });

    useEffect(() => {
        if (isOpen) {
          if (part) {
            form.reset(part);
          } else {
            form.reset({ name: "", brand: "", sku: "", price: 0, description: "" });
          }
        }
      }, [part, isOpen, form]);

    const handleSubmit = async (data: z.infer<typeof sparePartSchema>) => {
        setIsSubmitting(true);
        await onSave(data);
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{part ? 'Editar Refacción' : 'Agregar Nueva Refacción'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre de la Refacción</FormLabel>
                                    <FormControl><Input placeholder="Ej: Termostato" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="brand" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Marca</FormLabel>
                                    <FormControl><Input placeholder="Ej: Robertshaw" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="sku" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SKU</FormLabel>
                                    <FormControl><Input placeholder="Ej: RS-5300-123" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Precio</FormLabel>
                                    <FormControl><Input type="number" step="0.01" placeholder="Ej: 550.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descripción</FormLabel>
                                <FormControl><Textarea placeholder="Describa la refacción, para qué equipos funciona, etc." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

    