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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";

const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "El nombre es requerido." }),
  phone: z.string().min(10, { message: "El teléfono debe tener al menos 10 dígitos." }),
  email: z.string().email({ message: "Correo electrónico inválido." }).optional().or(z.literal('')),
  address: z.string().optional(),
  rfc: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema> & { id: string, createdAt: any };

export function ClientManager() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (authIsLoading) return;
    if (!user) {
      setIsLoading(false);
      setClients([]);
      return;
    }
    
    setIsLoading(true);
    const clientsQuery = collection(db, "clients");
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(data.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
        setIsLoading(false);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'clients', operation: 'list' }));
        toast({ title: "Error de Permisos", description: "No se pudieron cargar los clientes.", variant: "destructive" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authIsLoading, toast]);

  const handleSaveClient = useCallback(async (data: Omit<Client, 'id' | 'createdAt'>) => {
    try {
        const clientData = { ...data };
        if (selectedClient?.id) {
            const clientDoc = doc(db, "clients", selectedClient.id);
            await updateDoc(clientDoc, clientData);
            toast({ title: "Cliente Actualizado", description: "La información del cliente ha sido actualizada." });
        } else {
            await addDoc(collection(db, "clients"), { ...clientData, createdAt: serverTimestamp() });
            toast({ title: "Cliente Creado", description: "Un nuevo cliente ha sido añadido a la cartera." });
        }
        setIsFormOpen(false);
        setSelectedClient(null);
    } catch(error) {
        console.error("Error saving client:", error);
        toast({ title: "Error al guardar", variant: "destructive" });
    }
  }, [selectedClient, toast]);

  const handleDeleteClient = useCallback(async (id: string) => {
      try {
        await deleteDoc(doc(db, "clients", id));
        toast({ title: "Cliente Eliminado", variant: "destructive" });
      } catch(error) {
         console.error("Error deleting client:", error);
         toast({ title: "Error al eliminar", variant: "destructive" });
      }
  }, [toast]);
  
  const columns: ColumnDef<Client>[] = useMemo(() => [
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "phone", header: "Teléfono" },
      { accessorKey: "email", header: "Correo Electrónico" },
      { accessorKey: "address", header: "Dirección" },
      { accessorKey: "rfc", header: "RFC" },
      { id: "actions",
        cell: ({ row }) => {
            const client = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedClient(client); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500"><Trash2 className="mr-2 h-4 w-4"/> Eliminar</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta acción eliminará el cliente permanentemente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteClient(client.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
      }
  ], [handleDeleteClient]);
  
  const table = useReactTable({ 
    data: clients, 
    columns, 
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
  });

  if (isLoading && authIsLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
             <Input placeholder="Buscar por nombre, teléfono o RFC..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm"/>
            <Button onClick={() => { setSelectedClient(null); setIsFormOpen(true);}}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Cliente</Button>
        </div>
        <div className="rounded-md border">
            <Table>
                <TableHeader>{table.getHeaderGroups().map(headerGroup => (<TableRow key={headerGroup.id}>{headerGroup.headers.map(header => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>))}</TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (table.getRowModel().rows.map(row => (<TableRow key={row.id}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>))) : (<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No hay clientes. Empieza agregando uno.</TableCell></TableRow>)}
                </TableBody>
            </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>

      <ClientFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} onSave={handleSaveClient} client={selectedClient} />
    </div>
  );
}

interface ClientFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<Client, 'id' | 'createdAt'>) => void;
  client: Client | null;
}

function ClientFormDialog({ isOpen, onOpenChange, onSave, client }: ClientFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof clientSchema>>({
        resolver: zodResolver(clientSchema),
        defaultValues: { name: "", phone: "", email: "", address: "", rfc: "" }
    });

    useEffect(() => {
        if (isOpen) {
          if (client) {
            form.reset(client);
          } else {
            form.reset({ name: "", phone: "", email: "", address: "", rfc: "" });
          }
        }
      }, [client, isOpen, form]);

    const handleSubmit = async (data: z.infer<typeof clientSchema>) => {
        setIsSubmitting(true);
        await onSave(data);
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{client ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</DialogTitle>
                    <DialogDescription>Completa los detalles del cliente.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nombre o Razón Social</FormLabel><FormControl><Input placeholder="Nombre completo del cliente o empresa" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Número de contacto" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Correo Electrónico (Opcional)</FormLabel><FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Dirección (Opcional)</FormLabel><FormControl><Input placeholder="Dirección completa del cliente" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="rfc" render={({ field }) => ( <FormItem><FormLabel>RFC (Opcional)</FormLabel><FormControl><Input placeholder="Registro Federal de Contribuyentes" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        
                         <DialogFooter className="sticky bottom-0 bg-background pt-4">
                            <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {client ? 'Guardar Cambios' : 'Crear Cliente'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
