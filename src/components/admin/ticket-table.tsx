
"use client"

import * as React from "react"
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Loader2,
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

export type Ticket = {
  id: string
  userId: string
  userEmail: string
  serviceType: "Correctivo" | "Preventivo"
  equipmentType: string
  description: string
  urgency: "Baja" | "Media" | "Alta"
  status: "Recibido" | "En Progreso" | "Resuelto"
  createdAt: Timestamp
}

export function TicketTable() {
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
  const { toast } = useToast()

  React.useEffect(() => {
    setIsLoading(true)
    const q = query(collection(db, "tickets"))

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedTickets = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Ticket[]
        setTickets(fetchedTickets)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching tickets:", error)
        toast({
          title: "Error al cargar los tickets",
          description: "No se pudieron obtener los datos. Intente de nuevo.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [toast])

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

  const columns: ColumnDef<Ticket>[] = React.useMemo(
    () => [
      {
        accessorKey: "userEmail",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Cliente
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue("userEmail")}</div>,
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
          const urgency = row.getValue("urgency") as string
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
            <div>{timestamp?.toDate().toLocaleDateString() || "N/A"}</div>
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
                  onClick={() => alert(`Detalles para ${ticket.id}`)}
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
                 <DropdownMenuItem
                  onClick={() => alert(`Asignar ticket ${ticket.id}`)}
                >
                  Asignar a Técnico
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => alert(`Crear cotización para ${ticket.id}`)}
                >
                  Crear Cotización
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [toast]
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

  if (isLoading) {
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
          placeholder="Filtrar por email..."
          value={
            (table.getColumn("userEmail")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("userEmail")?.setFilterValue(event.target.value)
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
                    {column.accessorKey as string}
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
