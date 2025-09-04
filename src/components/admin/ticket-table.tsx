
"use client"

import * as React from "react"
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
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
  DropdownMenuSeparator,
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

const data: Ticket[] = [
    {
      id: "TICK-8782",
      user: "Restaurante La Tradición",
      email: "compras@latradicion.com",
      equipment: "Horno de convección",
      serviceType: "Correctivo",
      urgency: "Alta",
      status: "Recibido",
      createdAt: "2024-07-26",
    },
    {
      id: "TICK-4331",
      user: "Hotel Casa de Piedra",
      email: "mantenimiento@casadepiedra.com",
      equipment: "Sistema de refrigeración",
      serviceType: "Preventivo",
      urgency: "Media",
      status: "En Progreso",
      createdAt: "2024-07-25",
    },
    {
      id: "TICK-2345",
      user: "Cafetería El Buen Café",
      email: "gerencia@buencafe.com",
      equipment: "Máquina de espresso",
      serviceType: "Correctivo",
      urgency: "Media",
      status: "Recibido",
      createdAt: "2024-07-26",
    },
    {
      id: "TICK-9876",
      user: "Cocina Económica Doña Mary",
      email: "mary@cocina.com",
      equipment: "Estufa de 6 quemadores",
      serviceType: "Correctivo",
      urgency: "Baja",
      status: "Resuelto",
      createdAt: "2024-07-22",
    },
     {
      id: "TICK-5432",
      user: "Banquetería Royal",
      email: "eventos@royal.com",
      equipment: "Freidoras industriales",
      serviceType: "Preventivo",
      urgency: "Baja",
      status: "Recibido",
      createdAt: "2024-07-26",
    },
  ]

export type Ticket = {
  id: string
  user: string
  email: string
  equipment: string
  serviceType: "Correctivo" | "Preventivo"
  urgency: "Baja" | "Media" | "Alta"
  status: "Recibido" | "En Progreso" | "Resuelto"
  createdAt: string
}

export const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "id",
    header: "Ticket ID",
    cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "user",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Cliente
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue("user")}</div>,
  },
   {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={status === 'Resuelto' ? 'secondary' : 'default'} className={cn(
        'text-white',
        status === 'Recibido' && 'bg-blue-500',
        status === 'En Progreso' && 'bg-yellow-500 text-black',
        status === 'Resuelto' && 'bg-green-500'
      )}>{status}</Badge>;
    },
  },
  {
    accessorKey: "urgency",
    header: "Urgencia",
    cell: ({ row }) => {
      const urgency = row.getValue("urgency") as string;
      return <Badge variant="outline" className={cn(
        urgency === 'Alta' && 'border-red-500 text-red-500',
        urgency === 'Media' && 'border-yellow-500 text-yellow-500',
        urgency === 'Baja' && 'border-green-500 text-green-500'
      )}>{urgency}</Badge>
    },
  },
   {
    accessorKey: "equipment",
    header: "Equipo",
    cell: ({ row }) => <div>{row.getValue("equipment")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
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
            <DropdownMenuItem>Ver Detalles del Ticket</DropdownMenuItem>
            <DropdownMenuItem>Asignar a Técnico</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Marcar como "En Progreso"</DropdownMenuItem>
            <DropdownMenuItem>Marcar como "Resuelto"</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function TicketTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
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

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrar por cliente..."
          value={(table.getColumn("user")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("user")?.setFilterValue(event.target.value)
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
