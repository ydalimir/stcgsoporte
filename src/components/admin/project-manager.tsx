
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import type { Quote } from "./quote-manager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


const projectSchema = z.object({
  id: z.string().optional(),
  client: z.string().min(2, { message: "El nombre del cliente es requerido." }),
  description: z.string().min(10, { message: "La descripción es requerida (mínimo 10 caracteres)." }),
  responsible: z.string().min(2, { message: "El nombre del responsable es requerido." }),
  status: z.enum(["Nuevo", "En Progreso", "En Pausa", "Completado"]),
  programmedDate: z.string().min(1, { message: "La fecha programada es requerida." }),
  priority: z.enum(["Baja", "Media", "Alta"]),
  quoteId: z.string().optional().nullable(),
  purchaseOrderId: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema> & {
    id: string;
    lastUpdated: any; // Using any for Firestore Timestamp flexibility
    createdAt: any;
};


export function ProjectManager() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

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
        // Not showing a toast here to avoid spamming if permissions are missing for quotes
        console.error("Could not load quotes for project linking.");
    });


    return () => {
        unsubscribeProjects();
        unsubscribeQuotes();
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
  
  const columns: ColumnDef<Project>[] = useMemo(() => [
      { accessorKey: "client", header: "Cliente" },
      { 
        id: "quote",
        header: "Cotización",
        cell: ({ row }) => {
            const project = row.original;
            const currentQuote = quotes.find(q => q.id === project.quoteId);
            
            // Available quotes are those not linked to any other project
            const otherLinkedQuoteIds = new Set(
              projects.filter(p => p.id !== project.id).map(p => p.quoteId).filter(Boolean)
            );
            const availableQuotes = quotes.filter(q => !otherLinkedQuoteIds.has(q.id));

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="justify-start p-0 h-auto font-normal text-left w-full min-w-max">
                    {currentQuote 
                        ? <Badge variant="secondary">COT-{String(currentQuote.quoteNumber).padStart(3, '0')}</Badge> 
                        : <Badge variant="outline">Asignar cotización...</Badge>
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Seleccionar Cotización</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup 
                    value={project.quoteId || ''}
                    onValueChange={(newQuoteId) => handleLinkQuote(project.id, newQuoteId === '' ? null : newQuoteId)}
                  >
                    <DropdownMenuRadioItem value="">Ninguna</DropdownMenuRadioItem>
                    {availableQuotes.map(q => (
                      <DropdownMenuRadioItem key={q.id} value={q.id}>
                        COT-{String(q.quoteNumber).padStart(3, '0')} ({q.clientName})
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )
        }
      },
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
      { accessorKey: "status", header: "Estado", cell: ({row}) => {
         const project = row.original;
         const status = project.status;
         return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-0 h-auto">
                        <Badge variant="outline" className={cn('cursor-pointer capitalize', {
                           'text-primary border-primary': status === 'Nuevo',
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
      { accessorKey: "programmedDate", header: "Fecha Prog.", cell: ({row}) => new Date(row.original.programmedDate).toLocaleDateString() },
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
  ], [handleDeleteProject, handleStatusChange, quotes, projects, handleLinkQuote]);
  
  const table = useReactTable({ 
    data: projects, 
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

      <ProjectFormDialog isOpen={isFormOpen} onOpenChange={setIsFormOpen} onSave={handleSaveProject} project={selectedProject} quotes={quotes} />
    </div>
  );
}

interface ProjectFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<Project, 'id' | 'lastUpdated' | 'createdAt'>) => void;
  project: Project | null;
  quotes: Quote[];
}

function ProjectFormDialog({ isOpen, onOpenChange, onSave, project, quotes }: ProjectFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof projectSchema>>({
        resolver: zodResolver(projectSchema),
        defaultValues: { client: "", description: "", responsible: "", status: "Nuevo", programmedDate: new Date().toISOString().split('T')[0], priority: "Media", quoteId: undefined, purchaseOrderId: undefined }
    });

    useEffect(() => {
        if (isOpen) {
          if (project) {
            form.reset({ ...project, programmedDate: new Date(project.programmedDate).toISOString().split('T')[0]});
          } else {
            form.reset({ client: "", description: "", responsible: "", status: "Nuevo", programmedDate: new Date().toISOString().split('T')[0], priority: "Media", quoteId: undefined, purchaseOrderId: undefined });
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
                                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar cotización..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="">Ninguna</SelectItem>
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
                                <Select disabled>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Próximamente..." /></SelectTrigger></FormControl>
                                    <SelectContent></SelectContent>
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

    