
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
import { useState, useMemo, useEffect } from "react";
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
  DialogDescription,
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
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const serviceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5, { message: "El título debe tener al menos 5 caracteres." }),
  sku: z.string().min(3, { message: "El SKU es requerido." }),
  price: z.coerce.number().min(0, { message: "El precio es requerido." }),
  description: z.string().min(20, { message: "La descripción debe tener al menos 20 caracteres." }),
  serviceType: z.enum(["correctivo", "preventivo"], { required_error: "Debe seleccionar un tipo de servicio." }),
});

export type Service = z.infer<typeof serviceSchema>;


export function ServiceManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "services"), (snapshot) => {
        const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(servicesData);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveService = async (data: Omit<Service, 'id'>) => {
    try {
        if (selectedService && selectedService.id) {
            // Update
            const serviceDoc = doc(db, "services", selectedService.id);
            await updateDoc(serviceDoc, data);
            toast({ title: "Servicio Actualizado", description: `El servicio "${data.title}" fue actualizado.` });
        } else {
            // Create
            await addDoc(collection(db, "services"), data);
            toast({ title: "Servicio Creado", description: `El servicio "${data.title}" ha sido añadido.` });
        }
        setIsFormOpen(false);
        setSelectedService(null);
    } catch(error) {
        console.error("Error saving service:", error);
        toast({ title: "Error al guardar", description: "No se pudo guardar el servicio.", variant: "destructive" });
    }
  };

  const handleDeleteService = async (id?: string) => {
      if(!id) return;
      try {
        await deleteDoc(doc(db, "services", id));
        toast({ title: "Servicio Eliminado", variant: "destructive" });
      } catch(error) {
         console.error("Error deleting service:", error);
         toast({ title: "Error al eliminar", description: "No se pudo eliminar el servicio.", variant: "destructive" });
      }
  };
  
  const columns: ColumnDef<Service>[] = useMemo(() => [
      { accessorKey: "title", header: "Título" },
      { accessorKey: "serviceType", header: "Tipo" },
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "price", header: "Precio", cell: ({ row }) => `$${parseFloat(row.original.price as any).toFixed(2)}` },
      { id: "actions",
        cell: ({ row }) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => { setSelectedService(row.original); setIsFormOpen(true); }}>
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
                                <AlertDialogDescription>Esta acción no se puede deshacer. El servicio será eliminado permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteService(row.original.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        )
      }
  ], []);
  
  const table = useReactTable({ data: services, columns, getCoreRowModel: getCoreRowModel() });
  
  if (isLoading) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div>
        <div className="flex justify-end mb-4">
            <Button onClick={() => { setSelectedService(null); setIsFormOpen(true);}}>
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Servicio
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
                                No hay servicios. Empieza creando uno.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

      <ServiceFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveService}
        service={selectedService}
      />
    </div>
  );
}


// Sub-component for the form in a dialog
interface ServiceFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<Service, 'id'>) => void;
  service: Service | null;
}

function ServiceFormDialog({ isOpen, onOpenChange, onSave, service }: ServiceFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof serviceSchema>>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            title: "",
            sku: "",
            price: 0,
            description: "",
            serviceType: undefined,
        }
    });

    useEffect(() => {
        if (isOpen) {
          if (service) {
            form.reset(service);
          } else {
            form.reset({ title: "", sku: "", price: 0, description: "", serviceType: undefined });
          }
        }
      }, [service, isOpen, form]);

    const handleSubmit = async (data: z.infer<typeof serviceSchema>) => {
        setIsSubmitting(true);
        await onSave(data);
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{service ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Título del Servicio</FormLabel>
                            <FormControl><Input placeholder="Ej: Limpieza de Campanas" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="serviceType" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tipo de Servicio</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    <SelectItem value="correctivo">Correctivo</SelectItem>
                                    <SelectItem value="preventivo">Preventivo</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="sku" render={({ field }) => (
                                <FormItem>
                                <FormLabel>SKU</FormLabel>
                                <FormControl><Input placeholder="Ej: PREV-CAM-01" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Precio</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="Ej: 1800.00" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Descripción del Servicio</FormLabel>
                            <FormControl><Textarea placeholder="Describa el servicio..." {...field} /></FormControl>
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
