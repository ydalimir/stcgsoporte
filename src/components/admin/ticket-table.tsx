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
      user: "John Doe",
      email: "john.d@example.com",
      equipment: "Industrial",
      description: "Main conveyor belt is offline. Production stopped.",
      urgency: "High",
      priority: "High",
      status: "Received",
      createdAt: "2023-10-26",
    },
    {
      id: "TICK-4331",
      user: "Jane Smith",
      email: "jane.s@example.com",
      equipment: "Commercial",
      description: "Walk-in freezer temperature is fluctuating.",
      urgency: "Medium",
      priority: "High",
      status: "In Progress",
      createdAt: "2023-10-25",
    },
    {
      id: "TICK-2345",
      user: "Bob Johnson",
      email: "bob.j@example.com",
      equipment: "Home",
      description: "Dishwasher is not draining properly.",
      urgency: "Low",
      priority: "Low",
      status: "Received",
      createdAt: "2023-10-26",
    },
    {
      id: "TICK-9876",
      user: "Alice Williams",
      email: "alice.w@example.com",
      equipment: "Commercial",
      description: "Office HVAC unit is making a loud noise.",
      urgency: "Medium",
      priority: "Medium",
      status: "Resolved",
      createdAt: "2023-10-22",
    },
     {
      id: "TICK-5432",
      user: "Charlie Brown",
      email: "charlie.b@example.com",
      equipment: "Industrial",
      description: "Hydraulic press is leaking fluid. Minor leak, but needs attention.",
      urgency: "Low",
      priority: "Medium",
      status: "Received",
      createdAt: "2023-10-26",
    },
  ]

export type Ticket = {
  id: string
  user: string
  email: string
  equipment: "Home" | "Commercial" | "Industrial"
  description: string
  urgency: "Low" | "Medium" | "High"
  priority: "Low" | "Medium" | "High"
  status: "Received" | "In Progress" | "Resolved"
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
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue("user")}</div>,
  },
   {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={status === 'Resolved' ? 'secondary' : 'default'} className={cn(
        status === 'Received' && 'bg-blue-500',
        status === 'In Progress' && 'bg-yellow-500 text-black',
        status === 'Resolved' && 'bg-green-500'
      )}>{status}</Badge>;
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return <Badge variant="outline" className={cn(
        priority === 'High' && 'border-red-500 text-red-500',
        priority === 'Medium' && 'border-yellow-500 text-yellow-500',
        priority === 'Low' && 'border-green-500 text-green-500'
      )}>{priority}</Badge>
    },
  },
   {
    accessorKey: "equipment",
    header: "Equipment",
    cell: ({ row }) => <div>{row.getValue("equipment")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
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
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>View Ticket Details</DropdownMenuItem>
            <DropdownMenuItem>Assign to Team</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mark as In Progress</DropdownMenuItem>
            <DropdownMenuItem>Mark as Resolved</DropdownMenuItem>
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
          placeholder="Filter by user..."
          value={(table.getColumn("user")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("user")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} ticket(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
