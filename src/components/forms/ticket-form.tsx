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
  equipmentType: z.enum(["home", "commercial", "industrial"], {
    required_error: "Please select an equipment type.",
  }),
  description: z.string().min(20, {
    message: "Description must be at least 20 characters.",
  }).max(500, {
    message: "Description must not be longer than 500 characters."
  }),
  urgency: z.enum(["low", "medium", "high"], {
    required_error: "Please select an urgency level.",
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
    },
  });

  async function onSubmit(data: TicketFormValues) {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(data);
    
    toast({
      title: "Ticket Submitted!",
      description: "We have received your support ticket and will be in touch shortly.",
    });

    form.reset();
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="equipmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of equipment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the category that best fits your equipment.
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
              <FormLabel>Issue Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please describe the issue in detail..."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The more detail you provide, the faster we can help.
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
              <FormLabel>Urgency Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="How urgent is this issue?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low - Routine check/minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Affects operation</SelectItem>
                  <SelectItem value="high">High - Critical failure/stoppage</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                This helps us prioritize your request appropriately.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Submitting..." : "Submit Ticket"}
        </Button>
      </form>
    </Form>
  );
}
