
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { useEffect, useState } from "react";
import { Loader2, PlusCircle, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import type { Quote } from "@/components/admin/quote-manager";
import type { Service } from "@/components/admin/service-manager";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SparePart } from "../admin/spare-parts-manager";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";


const quoteItemSchema = z.object({
  description: z.string().min(1, "La descripción es requerida."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  price: z.coerce.number().min(0, "El precio no puede ser negativo."),
});

const quoteFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente es requerido."),
  clientPhone: z.string().min(1, "El teléfono es requerido."),
  clientEmail: z.string().email({ message: "Correo inválido." }).optional().or(z.literal('')),
  clientAddress: z.string().min(1, "La dirección es requerida."),
  date: z.string().min(1, "La fecha es requerida."),
  status: z.enum(["Borrador", "Enviada", "Aceptada", "Rechazada"]),
  items: z.array(quoteItemSchema).min(1, "Debe agregar al menos un ítem."),
  expirationDate: z.string().optional(),
  rfc: z.string().optional(),
  observations: z.string().optional(),
  policies: z.string().optional(),
  iva: z.coerce.number().min(0, "El IVA no puede ser negativo.").default(16),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (quote: Omit<Quote, 'id' | 'quoteNumber' | 'subtotal' | 'total'> & { subtotal: number, total: number }) => void;
  quote: Quote | null;
}

export function QuoteForm({ isOpen, onOpenChange, onSave, quote }: QuoteFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);


  useEffect(() => {
      const qServices = collection(db, "services");
      const unsubscribeServices = onSnapshot(qServices, (snapshot) => {
          const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
          setServices(servicesData);
      }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'services',
                operation: 'list',
            }));
      });

      const qParts = collection(db, "spare_parts");
      const unsubscribeParts = onSnapshot(qParts, (snapshot) => {
        const partsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SparePart));
        setSpareParts(partsData);
    }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'spare_parts',
            operation: 'list',
        }));
    });
      return () => {
        unsubscribeServices();
        unsubscribeParts();
      }
  }, []);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      clientAddress: "",
      date: new Date().toISOString().split("T")[0],
      status: "Borrador",
      items: [],
      expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Default 15 days
      rfc: "",
      observations: "",
      policies: "Esta cotización tiene una validez de 15 días a partir de la fecha de emisión. Los precios no incluyen IVA. El tiempo de entrega puede variar.",
      iva: 16,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if (isOpen) {
      if (quote) {
        form.reset({
          ...quote,
          date: new Date(quote.date).toISOString().split("T")[0],
          expirationDate: quote.expirationDate ? new Date(quote.expirationDate).toISOString().split("T")[0] : undefined,
          iva: quote.iva ?? 16,
        });
      } else {
         form.reset({
            clientName: "",
            clientPhone: "",
            clientEmail: "",
            clientAddress: "",
            date: new Date().toISOString().split("T")[0],
            status: "Borrador",
            items: [],
            expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            rfc: "",
            observations: "",
            policies: "Esta cotización tiene una validez de 15 días a partir de la fecha de emisión. Los precios no incluyen IVA. El tiempo de entrega puede variar.",
            iva: 16,
        });
      }
    }
  }, [quote, isOpen, form]);

  const items = form.watch('items');
  const ivaPercentage = form.watch('iva');
  
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
  const ivaAmount = subtotal * (ivaPercentage / 100);
  const total = subtotal + ivaAmount;

  const onSubmit = async (data: QuoteFormValues) => {
    setIsSubmitting(true);
    await onSave({ ...data, subtotal, total });
    setIsSubmitting(false);
    onOpenChange(false);
  };
  
  const handleItemSelect = (itemId: string, type: 'service' | 'part') => {
    if (type === 'service') {
        const service = services.find(s => s.id === itemId);
        if (service) {
          append({ description: service.title, quantity: 1, price: service.price });
        }
    } else {
        const part = spareParts.find(p => p.id === itemId);
        if (part) {
            append({ description: part.name, quantity: 1, price: part.price });
        }
    }
    setIsComboboxOpen(false);
  };

  const quoteIdDisplay = quote?.quoteNumber ? `COT-${String(quote.quoteNumber).padStart(3, '0')}` : "Nueva Cotización";


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{quote ? `Editar Cotización #${quoteIdDisplay}` : "Crear Nueva Cotización"}</DialogTitle>
          <DialogDescription>Complete los detalles para generar el documento de cotización.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            <div className="space-y-6 px-6 overflow-y-auto max-h-[calc(80vh-150px)]">
            
              {/* Client and Date Info */}
              <div className="border p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField name="clientName" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="clientPhone" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField name="clientEmail" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Email (Opcional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="rfc" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>RFC (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField name="clientAddress" control={form.control} render={({ field }) => (
                      <FormItem className="lg:col-span-2"><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="date" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Fecha de Emisión</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="expirationDate" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Fecha de Vencimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField name="status" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Borrador">Borrador</SelectItem>
                          <SelectItem value="Enviada">Enviada</SelectItem>
                          <SelectItem value="Aceptada">Aceptada</SelectItem>
                          <SelectItem value="Rechazada">Rechazada</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Items Section */}
              <div className="border p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Items de la Cotización</h3>
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <FormField name={`items.${index}.description`} control={form.control} render={({ field }) => (
                                <FormItem className="flex-grow"><FormLabel className="text-xs">Descripción</FormLabel><FormControl><Input placeholder="Descripción del item" {...field} /></FormControl></FormItem>
                            )} />
                             <FormField name={`items.${index}.quantity`} control={form.control} render={({ field }) => (
                                <FormItem className="w-24"><FormLabel className="text-xs">Cant.</FormLabel><FormControl><Input type="number" placeholder="Cant." {...field} /></FormControl></FormItem>
                            )} />
                             <FormField name={`items.${index}.price`} control={form.control} render={({ field }) => (
                                <FormItem className="w-32"><FormLabel className="text-xs">Precio Unit.</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Precio" {...field} /></FormControl></FormItem>
                            )} />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                </div>
                 <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isComboboxOpen} className="w-[300px] justify-between">
                                Agregar item existente...
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar por nombre o SKU..." />
                                <CommandList>
                                    <CommandEmpty>No se encontraron items.</CommandEmpty>
                                    <CommandGroup heading="Servicios">
                                        {services.map((service) => (
                                            <CommandItem
                                                key={service.id}
                                                value={`${service.title} ${service.sku}`}
                                                onSelect={() => handleItemSelect(service.id!, 'service')}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                                                {service.title}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    <CommandGroup heading="Refacciones">
                                        {spareParts.map((part) => (
                                            <CommandItem
                                                key={part.id}
                                                value={`${part.name} ${part.brand} ${part.sku}`}
                                                onSelect={() => handleItemSelect(part.id!, 'part')}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                                                {part.name} ({part.brand})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                     <Button type="button" variant="outline" onClick={() => append({ description: '', quantity: 1, price: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Item Manual
                    </Button>
                </div>
                {form.formState.errors.items && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.items?.root?.message || form.formState.errors.items.message}</p>}
              </div>
            
              {/* Notes and Totals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField name="observations" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea placeholder="Añadir notas u observaciones específicas para esta cotización..." className="min-h-[100px] bg-muted/20" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="policies" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Políticas y Términos</FormLabel><FormControl><Textarea className="min-h-[100px] bg-muted/20" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                
                <div className="flex flex-col justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center font-medium">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <FormField name="iva" control={form.control} render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                    <FormLabel className="m-0 p-0">IVA (%):</FormLabel>
                                    <FormControl><Input type="number" className="w-20 h-8" {...field} /></FormControl>
                                </FormItem>
                            )} />
                            <span>${ivaAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div>
                        <Separator className="my-3 bg-border" />
                        <div className="flex justify-between text-xl font-bold">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/30 border-t mt-6">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancelar</Button>
                </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cotización
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
