
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
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (quote: Omit<Quote, 'id'>) => void;
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
          clientName: quote.clientName,
          date: new Date(quote.date).toISOString().split("T")[0],
          status: quote.status,
          items: quote.items.map(item => ({...item}))
        });
      } else {
        form.reset({
          clientName: "",
          date: new Date().toISOString().split("T")[0],
          status: "Borrador",
          items: [],
        });
      }
    }
  }, [quote, isOpen, form]);

  const onSubmit = async (data: QuoteFormValues) => {
    setIsSubmitting(true);
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    await onSave({ ...data, total });
    setIsSubmitting(false);
    onOpenChange(false);
  };
  
  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
        let price = 0;
        const priceMatch = service.price.match(/(\d+)/);
        if (priceMatch) {
            price = parseInt(priceMatch[0], 10);
        }
      append({ description: service.title, quantity: 1, price: price });
    }
  };

  const total = form.watch('items').reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{quote ? "Editar Cotización" : "Crear Cotización"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField name="clientName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="date" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
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
                                <FormItem className="w-32"><FormControl><Input type="number" placeholder="Precio" {...field} /></FormControl></FormItem>
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
                {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>}
            </div>

            <div className="text-right text-xl font-bold">
                Total: ${total.toFixed(2)}
            </div>

            <DialogFooter>
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

    