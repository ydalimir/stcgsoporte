
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
import { useState, useMemo } from "react";
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

const serviceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5, { message: "El título debe tener al menos 5 caracteres." }),
  sku: z.string().min(3, { message: "El SKU es requerido." }),
  price: z.string().min(1, { message: "El precio es requerido." }),
  description: z.string().min(20, { message: "La descripción debe tener al menos 20 caracteres." }),
  serviceType: z.enum(["correctivo", "preventivo"], { required_error: "Debe seleccionar un tipo de servicio." }),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const initialServices: ServiceFormValues[] = [
    { id: '1', title: 'Diagnóstico y Reparación de Estufas', sku: 'CORR-EST-01', price: 'Desde $800 MXN', description: 'Servicio completo para identificar y reparar cualquier tipo de falla en estufas industriales y comerciales.', serviceType: 'correctivo' },
    { id: '2', title: 'Plan de Mantenimiento Anual para Cocinas', sku: 'PREV-FULL-12', price: 'Cotización Personalizada', description: 'Paquete integral que incluye revisiones trimestrales de todos sus equipos.', serviceType: 'preventivo' },
];


export function ServiceManager() {
  const [services, setServices] = useState<ServiceFormValues[]>(initialServices);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceFormValues | null>(null);
  const { toast } = useToast();

  const handleSaveService = (data: ServiceFormValues) => {
    if (selectedService) {
      // Update
      setServices(services.map(s => s.id === selectedService.id ? { ...data, id: s.id } : s));
      toast({ title: "Servicio Actualizado", description: `El servicio "${data.title}" fue actualizado.` });
    } else {
      // Create
      const newService = { ...data, id: String(Date.now()) };
      setServices([...services, newService]);
      toast({ title: "Servicio Creado", description: `El servicio "${data.title}" ha sido añadido.` });
    }
    setIsFormOpen(false);
    setSelectedService(null);
  };

  const handleDeleteService = (id?: string) => {
      if(!id) return;
      setServices(services.filter(s => s.id !== id));
      toast({ title: "Servicio Eliminado", variant: "destructive" });
  };
  
  const columns: ColumnDef<ServiceFormValues>[] = useMemo(() => [
      { accessorKey: "title", header: "Título" },
      { accessorKey: "serviceType", header: "Tipo" },
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "price", header: "Precio" },
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
                    {table.getRowModel().rows.map(row => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map(cell => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
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
  onSave: (data: ServiceFormValues) => void;
  service: ServiceFormValues | null;
}

function ServiceFormDialog({ isOpen, onOpenChange, onSave, service }: ServiceFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceSchema),
    });

    useState(() => {
        if(service) {
            form.reset(service);
        } else {
            form.reset({ title: "", sku: "", price: "", description: "" });
        }
    }, [service, isOpen, form]);

    const handleSubmit = async (data: ServiceFormValues) => {
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        onSave(data);
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
                            <FormControl><Input placeholder="Ej: $1,800 MXN o Cotización Personalizada" {...field} /></FormControl>
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
