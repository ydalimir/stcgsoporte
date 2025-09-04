
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "../ui/input";

const ticketSchema = z.object({
  serviceType: z.enum(["correctivo", "preventivo"], {
    required_error: "Por favor seleccione el tipo de servicio.",
  }),
  equipmentType: z.string().min(3, {
    message: "Por favor, describa el asunto o equipo (ej. Falla en Horno).",
  }),
  description: z.string().min(20, {
    message: "La descripción debe tener al menos 20 caracteres.",
  }).max(500, {
    message: "La descripción no puede exceder los 500 caracteres."
  }),
  urgency: z.enum(["baja", "media", "alta"], {
    required_error: "Por favor seleccione un nivel de urgencia.",
  }),
  price: z.number().optional(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1.").optional(),
  // New client fields
  clientName: z.string().min(1, { message: "El nombre es obligatorio." }),
  clientPhone: z.string().min(10, { message: "El teléfono debe tener al menos 10 dígitos." }),
  clientAddress: z.string().min(1, { message: "La dirección es obligatoria." }),
  clientEmail: z.string().email({ message: "Por favor ingrese un correo válido." }).optional().or(z.literal('')),
  clientRfc: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function TicketForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if serviceType is coming from URL to disable the field
  const preselectedServiceType = searchParams.get('serviceType');

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      description: "",
      equipmentType: "",
      serviceType: undefined,
      urgency: "media",
      quantity: 1,
      clientName: "",
      clientPhone: "",
      clientAddress: "",
      clientEmail: "",
      clientRfc: "",
    },
  });

  const unitPrice = form.watch('price');
  const quantity = form.watch('quantity');
  const estimatedTotal = (unitPrice || 0) * (quantity || 1);

  useEffect(() => {
    const serviceType = searchParams.get('serviceType');
    const equipmentType = searchParams.get('equipmentType');
    const price = searchParams.get('price');

    if (serviceType === 'correctivo' || serviceType === 'preventivo') {
        form.setValue('serviceType', serviceType);
    }
    if (equipmentType) {
        form.setValue('equipmentType', equipmentType);
    }
    if (price) {
        form.setValue('price', parseFloat(price));
    }
    if (user?.email) {
        form.setValue('clientEmail', user.email);
    }

  }, [searchParams, form, user]);


  if (isLoading) {
    return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!user) {
     toast({
        title: "Acceso Denegado",
        description: "Debes iniciar sesión para crear un ticket.",
        variant: "destructive",
      });
    router.push('/login');
    return null;
  }

  async function onSubmit(data: TicketFormValues) {
    if (!user) {
       toast({
        title: "Error",
        description: "No se pudo obtener la información del usuario. Intente de nuevo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
        const finalPrice = data.price ? data.price * (data.quantity || 1) : undefined;
        await addDoc(collection(db, "tickets"), {
            ...data,
            price: finalPrice, // Save the calculated total price
            userId: user.uid,
            status: "Recibido",
            createdAt: serverTimestamp(),
        });
      
      toast({
        title: "¡Ticket Enviado!",
        description: "Hemos recibido su ticket de soporte y nos pondremos en contacto en breve.",
      });

      form.reset();
      router.push('/profile/my-tickets');

    } catch (error) {
        console.error("Error al crear el ticket: ", error);
        toast({
            title: "Error al Enviar",
            description: "No se pudo crear el ticket. Por favor, intente más tarde.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        <div className="space-y-4 border-b pb-6">
             <h3 className="text-lg font-medium">Información del Cliente</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField control={form.control} name="clientName" render={({ field }) => (
                    <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="clientPhone" render={({ field }) => (
                    <FormItem><FormLabel>Número de Teléfono</FormLabel><FormControl><Input placeholder="Ej: 9991234567" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
             </div>
             <FormField control={form.control} name="clientAddress" render={({ field }) => (
                <FormItem><FormLabel>Dirección Completa</FormLabel><FormControl><Input placeholder="Calle, Número, Colonia, Ciudad" {...field} /></FormControl><FormMessage /></FormItem>
             )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField control={form.control} name="clientEmail" render={({ field }) => (
                    <FormItem><FormLabel>Correo Electrónico (Opcional)</FormLabel><FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="clientRfc" render={({ field }) => (
                    <FormItem><FormLabel>RFC (Opcional)</FormLabel><FormControl><Input placeholder="Ej: PEJU800101XXX" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
             </div>
        </div>

        <div className="space-y-4">
             <h3 className="text-lg font-medium">Detalles del Servicio</h3>
            <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tipo de Servicio</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!!preselectedServiceType}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de servicio requerido" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="correctivo">Mantenimiento Correctivo</SelectItem>
                    <SelectItem value="preventivo">Mantenimiento Preventivo</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="equipmentType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Asunto / Equipo</FormLabel>
                <FormControl>
                    <Input
                    placeholder="Ej: Falla en estufa, Contratar plan de hornos..."
                    {...field}
                    />
                </FormControl>
                <FormDescription>
                    Sea lo más específico posible. Si viene de la página de servicios, esto se llena automáticamente.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />

            {unitPrice && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl><Input type="number" min={1} {...field}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormItem>
                        <FormLabel>Precio por Unidad</FormLabel>
                        <FormControl><Input value={`$${unitPrice.toFixed(2)} MXN`} readOnly /></FormControl>
                    </FormItem>
                     <FormItem>
                        <FormLabel>Total Estimado</FormLabel>
                        <FormControl><Input value={`$${estimatedTotal.toFixed(2)} MXN`} readOnly /></FormControl>
                    </FormItem>
                </div>
            )}

            <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Descripción de la Falla o Necesidad</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Por favor describa el problema o la necesidad en detalle..."
                    className="min-h-[150px]"
                    {...field}
                    />
                </FormControl>
                <FormDescription>
                    Mientras más detalles nos brinde, más rápido podremos ayudarle.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="urgency"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nivel de Urgencia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="¿Qué tan urgente es este problema?" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="baja">Baja - Puede esperar</SelectItem>
                    <SelectItem value="media">Media - Afecta la operación</SelectItem>
                    <SelectItem value="alta">Alta - Operación detenida</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
           {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
           {isSubmitting ? "Enviando Ticket..." : "Enviar Ticket"}
        </Button>
      </form>
    </Form>
  );
}
