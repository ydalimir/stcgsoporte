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
import { useState } from "react";
import { Loader2 } from "lucide-react";

const ticketSchema = z.object({
  serviceType: z.enum(["correctivo", "preventivo"], {
    required_error: "Por favor seleccione el tipo de servicio.",
  }),
  equipmentType: z.string().min(3, {
    message: "Por favor, describa el equipo (ej. Horno, Refrigerador)."
  }),
  description: z.string().min(20, {
    message: "La descripción debe tener al menos 20 caracteres.",
  }).max(500, {
    message: "La descripción no puede exceder los 500 caracteres."
  }),
  urgency: z.enum(["baja", "media", "alta"], {
    required_error: "Por favor seleccione un nivel de urgencia.",
  }),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function TicketForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      description: "",
      equipmentType: "",
    },
  });

  async function onSubmit(data: TicketFormValues) {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(data);
    
    toast({
      title: "¡Ticket Enviado!",
      description: "Hemos recibido su ticket de soporte y nos pondremos en contacto en breve.",
    });

    form.reset();
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Servicio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormLabel>Tipo de Equipo</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Estufa industrial, Horno de convección, Refrigerador comercial..."
                  className="min-h-[50px]"
                  {...field}
                />
              </FormControl>
               <FormDescription>
                Sea lo más específico posible con el equipo que necesita servicio.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="¿Qué tan urgente es este problema?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="baja">Baja - Revisión de rutina / problema menor</SelectItem>
                  <SelectItem value="media">Media - Afecta la operación</SelectItem>
                  <SelectItem value="alta">Alta - Falla crítica / Equipo detenido</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Esto nos ayuda a priorizar su solicitud adecuadamente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Enviando..." : "Enviar Ticket"}
        </Button>
      </form>
    </Form>
  );
}
