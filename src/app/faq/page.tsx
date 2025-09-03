import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ShieldQuestion } from 'lucide-react';

const faqs = [
  {
    question: 'How do I submit a new support ticket?',
    answer:
      'You can submit a new support ticket by navigating to the "Submit Ticket" page. You will need to fill in details about your equipment, a description of the issue, and the level of urgency. Once submitted, our team will review it promptly.',
  },
  {
    question: 'What are your response times?',
    answer:
      'Response times vary based on the priority of your ticket. High-priority tickets are typically addressed within 1-2 hours, medium-priority within 4-6 hours, and low-priority within 24 hours. These are estimates and can vary based on current workload.',
  },
  {
    question: 'How can I track the status of my ticket?',
    answer:
      'Once you are logged into your account, you can visit the "My Tickets" section to see a list of all your submitted tickets and their current status (e.g., Received, In Progress, Resolved). You will also receive email notifications for major status changes.',
  },
  {
    question: 'What types of equipment do you service?',
    answer:
      'We service a wide range of equipment across home, commercial, and industrial sectors. This includes everything from home appliances and HVAC systems to commercial kitchen equipment and heavy industrial machinery. Please see our "Services" page for more details.',
  },
  {
    question: 'How do I request a quote for a specific service?',
    answer:
      'You can request a quotation by visiting the "Request a Quote" page. Please provide as much detail as possible about your needs so we can give you an accurate estimate. Our team will get back to you with a detailed quote.',
  },
  {
    question: 'Do you offer emergency repair services?',
    answer:
      'Yes, we offer 24/7 emergency repair services for critical issues, especially for our commercial and industrial clients. Please mark your ticket as "High" urgency or call our emergency hotline for immediate assistance.',
  },
];

export default function FaqPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <ShieldQuestion className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground">
          Find answers to common questions about our services and processes.
        </p>
      </div>
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
