import { TicketForm } from '@/components/forms/ticket-form';
import { Ticket } from 'lucide-react';

export default function NewTicketPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
            <Ticket className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
              Submit a Support Ticket
            </h1>
            <p className="text-lg text-muted-foreground">
              Please fill out the form below, and our team will get back to you as soon as possible.
            </p>
        </div>
        <div className="bg-card p-8 rounded-lg shadow-lg">
          <TicketForm />
        </div>
      </div>
    </div>
  );
}
