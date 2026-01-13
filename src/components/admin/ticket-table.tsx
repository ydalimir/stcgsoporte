
"use client"

import * as React from "react"
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  orderBy,
  deleteDoc
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Loader2,
  Download,
  Trash2,
} from "lucide-react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/hooks/use-auth"
import { errorEmitter } from "@/lib/error-emitter"
import { FirestorePermissionError } from "@/lib/errors"


export type Ticket = {
  id: string;
  ticketNumber?: number;
  userId: string
  clientName: string,
  clientPhone: string,
  clientAddress: string,
  serviceType: "correctivo" | "preventivo" | "instalacion"
  equipmentType: string
  description: string
  urgency: "baja" | "media" | "alta"
  status: "Recibido" | "En Progreso" | "Resuelto"
  createdAt: Timestamp
  price?: number
  quantity?: number
}

const downloadServiceOrderPDF = (ticket: Ticket) => {
    const doc = new jsPDF();
    const ticketId = ticket.ticketNumber ? `ORD-${String(ticket.ticketNumber).padStart(3, '0')}` : ticket.id;
    let yPos = 15;

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("LEBAREF", 14, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Orden de Servicio", 14, yPos + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Orden #${ticketId}`, 196, yPos, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Fecha: ${ticket.createdAt?.toDate().toLocaleDateString('es-MX') || "N/A"}`, 196, yPos + 5, { align: 'right' });
    
    yPos += 20;
    doc.setDrawColor(221, 221, 221); // A light grey color
    doc.line(14, yPos, 196, yPos);
    yPos += 10;

    // --- Client and Service Info in two columns ---
    autoTable(doc, {
      startY: yPos,
      body: [
        [
          { content: 'CLIENTE', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: 'DETALLES DEL SERVICIO', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ],
        [
          { content: `Nombre: ${ticket.clientName}\nDirección: ${ticket.clientAddress}\nTeléfono: ${ticket.clientPhone}`, styles: { cellWidth: 91 } },
          { content: `Tipo: ${ticket.serviceType}\nEquipo: ${ticket.equipmentType}\nUrgencia: ${ticket.urgency.charAt(0).toUpperCase() + ticket.urgency.slice(1)}`, styles: { cellWidth: 91 } }
        ]
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // --- Description ---
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text("Descripción del Problema / Necesidad:", 14, yPos);
    yPos += 6;
    doc.setFontSize(9).setFont(undefined, 'normal');
    const splitDescription = doc.splitTextToSize(ticket.description, 180);
    doc.text(splitDescription, 15, yPos + 4);
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, yPos, 182, 35); // Box for the description
    yPos += 45;

    // --- Technician Notes ---
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text("Notas del Técnico:", 14, yPos);
    yPos += 6;
    doc.rect(14, yPos, 182, 50); // Box for technician notes
    yPos += 60;
    
    // --- Signatures ---
    const signatureY = doc.internal.pageSize.height - 40;
    doc.setDrawColor(150, 150, 150);
    doc.line(20, signatureY, 80, signatureY);
    doc.setFontSize(10).setFont(undefined, 'normal');
    doc.text("Firma del Cliente", 50, signatureY + 5, { align: 'center' });

    doc.line(116, signatureY, 176, signatureY);
    doc.text("Firma del Técnico", 146, signatureY + 5, { align: 'center' });


    doc.save(`${ticketId}.pdf`);
}


export function TicketTable() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const { toast } = useToast();
  const router = useRouter();


  React.useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setIsLoading(false);
      setTickets([]); // Clear tickets if user is logged out
      return;
    }
  
    setIsLoading(true);
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
  
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTickets = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Ticket[];
        setTickets(fetchedTickets);
        setIsLoading(false);
      },
      (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'tickets',
            operation: 'list',
        }));
        toast({
          title: "Error al cargar los tickets",
          description: "No se pudieron obtener los datos. Intente de nuevo.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );
  
    return () => unsubscribe();
  }, [user, authIsLoading, toast]);
  

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const ticketRef = doc(db, "tickets", ticketId)
    try {
      await updateDoc(ticketRef, { status })
      toast({
        title: "Ticket Actualizado",
        description: `El estado del ticket se ha cambiado a "${status}".`,
      })
    } catch (error) {
      console.error("Error updating ticket status:", error)
      toast({
        title: "Error al actualizar",
        description: "No se pudo cambiar el estado del ticket.",
        variant: "destructive",
      })
    }
  }
  
  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteDoc(doc(db, "tickets", ticketId));
      toast({
        title: "Ticket Eliminado",
        description: "El ticket ha sido eliminado permanentemente.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el ticket.",
        variant: "destructive",
      });
    }
  };


  const columns: ColumnDef<Ticket>[] = React.useMemo(
    () => [
      {
        accessorKey: "ticketNumber",
        header: "ID",
        cell: ({ row }) => {
            const ticketNumber = row.original.ticketNumber;
            return ticketNumber ? `ORD-${String(ticketNumber).padStart(3, '0')}` : row.original.id.substring(0, 7);
        }
      },
      {
        accessorKey: "clientName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Cliente
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue("clientName")}</div>,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const status = row.getValue("status") as string
          return (
            <Badge
              variant={status === "Resuelto" ? "secondary" : "default"}
              className={cn(
                "text-white",
                status === "Recibido" && "bg-blue-500",
                status === "En Progreso" && "bg-yellow-500 text-black",
                status === "Resuelto" && "bg-green-500"
              )}
            >
              {status}
            </Badge>
          )
        },
      },
      {
        accessorKey: "urgency",
        header: "Urgencia",
        cell: ({ row }) => {
          const urgency = row.getValue("urgency") as Ticket['urgency'];
          return (
            <Badge
              variant="outline"
              className={cn(
                urgency === "alta" && "border-red-500 text-red-500",
                urgency === "media" && "border-yellow-500 text-yellow-500",
                urgency === "baja" && "border-green-500 text-green-500"
              )}
            >
              {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
            </Badge>
          )
        },
      },
      {
        accessorKey: "equipmentType",
        header: "Asunto / Equipo",
        cell: ({ row }) => <div>{row.getValue("equipmentType")}</div>,
      },
       {
        accessorKey: "price",
        header: "Precio",
        cell: ({ row }) => {
          const price = row.getValue("price") as number | undefined;
          return price ? `$${price.toFixed(2)}` : "N/A";
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const timestamp = row.getValue("createdAt") as Timestamp
          return (
            <div>{timestamp?.toDate().toLocaleDateString('es-MX') || "N/A"}</div>
          )
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const ticket = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => downloadServiceOrderPDF(ticket)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Orden
                </DropdownMenuItem>
                 <DropdownMenuItem
                  onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                >
                  Ver Detalles del Ticket
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Cambiar Estado</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={ticket.status}
                      onValueChange={(value) =>
                        updateTicketStatus(ticket.id, value)
                      }
                    >
                      <DropdownMenuRadioItem value="Recibido">
                        Recibido
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="En Progreso">
                        En Progreso
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Resuelto">
                        Resuelto
                      </DropdownMenuRadioItem>
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
                      <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el ticket y todos sus datos asociados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTicket(ticket.id)} className="bg-destructive hover:bg-destructive/90">
                        Sí, eliminar ticket
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [toast, router]
  )

  const table = useReactTable({
    data: tickets,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  if (isLoading && authIsLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Cargando tickets...</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrar por cliente..."
          value={
            (table.getColumn("clientName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("clientName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columnas <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                   onDoubleClick={() => router.push(`/admin/tickets/${row.original.id}`)}
                   className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} ticket(s) encontrado(s).
        </div>
        <div className="space-x-2">
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
      </div>
    </div>
  )
}
