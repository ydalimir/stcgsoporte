
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Quote, QuoteItem } from "@/components/admin/quote-manager";
import type { Service } from "@/components/admin/service-manager";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";


const quoteItemSchema = z.object({
  description: z.string().min(1, "La descripción es requerida."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  price: z.coerce.number().min(0, "El precio no puede ser negativo."),
});

const quoteFormSchema = z.object({
  clientName: z.string().min(2, "El nombre del cliente es requerido."),
  date: z.string().min(1, "La fecha es requerida."),
  status: z.enum(["Borrador", "Enviada", "Aceptada", "Rechazada"]),
  items: z.array(quoteItemSchema).min(1, "Debe agregar al menos un ítem."),
  expirationDate: z.string().optional(),
  rfc: z.string().optional(),
  policies: z.string().optional(),
  iva: z.coerce.number().min(0, "El IVA no puede ser negativo.").default(16),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (quote: Omit<Quote, 'id' | 'quoteNumber'>) => void;
  quote: Quote | null;
}

export function QuoteForm({ isOpen, onOpenChange, onSave, quote }: QuoteFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
      const unsubscribe = onSnapshot(collection(db, "services"), (snapshot) => {
          const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
          setServices(servicesData);
      });
      return () => unsubscribe();
  }, []);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      clientName: "",
      date: new Date().toISOString().split("T")[0],
      status: "Borrador",
      items: [],
      expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Default 15 days
      rfc: "",
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
            date: new Date().toISOString().split("T")[0],
            status: "Borrador",
            items: [],
            expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            rfc: "",
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
  
  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      append({ description: service.title, quantity: 1, price: service.price });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{quote ? `Editar Cotización #${quote.quoteNumber}` : "Crear Cotización"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="clientName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="rfc" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>RFC (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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

            <div className="space-y-4">
                <FormLabel>Items de la Cotización</FormLabel>
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <FormField name={`items.${index}.description`} control={form.control} render={({ field }) => (
                                <FormItem className="flex-grow"><FormControl><Input placeholder="Descripción" {...field} /></FormControl></FormItem>
                            )} />
                             <FormField name={`items.${index}.quantity`} control={form.control} render={({ field }) => (
                                <FormItem className="w-24"><FormControl><Input type="number" placeholder="Cant." {...field} /></FormControl></FormItem>
                            )} />
                             <FormField name={`items.${index}.price`} control={form.control} render={({ field }) => (
                                <FormItem className="w-32"><FormControl><Input type="number" step="0.01" placeholder="Precio" {...field} /></FormControl></FormItem>
                            )} />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                </div>
                 <div className="flex items-center gap-4">
                    <Select onValueChange={handleServiceSelect}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Agregar servicio existente" />
                        </SelectTrigger>
                        <SelectContent>
                            {services.map(service => (
                                <SelectItem key={service.id} value={service.id!}>{service.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Button type="button" variant="outline" onClick={() => append({ description: '', quantity: 1, price: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Item Manual
                    </Button>
                </div>
                {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items?.root?.message || form.formState.errors.items.message}</p>}
            </div>

            <FormField name="policies" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Políticas y Términos</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
             <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                    <FormField name="iva" control={form.control} render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                            <FormLabel>IVA (%)</FormLabel>
                            <FormControl><Input type="number" className="w-24" {...field} /></FormControl>
                        </FormItem>
                    )} />
                    <div className="flex justify-between font-medium">
                        <span>Subtotal:</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>IVA ({ivaPercentage}%):</span>
                        <span>${ivaAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <DialogFooter className="pt-4">
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
