import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, Home, Building, Wrench, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    category: "Installation",
    icon: <Zap className="w-10 h-10 text-primary" />,
    items: [
      {
        title: "Home Equipment Installation",
        icon: <Home className="w-6 h-6 text-accent" />,
        description: "Professional setup for all your home appliances and systems.",
      },
      {
        title: "Commercial Setup",
        icon: <Building className="w-6 h-6 text-accent" />,
        description: "Full-scale installation services for businesses and commercial properties.",
      },
      {
        title: "Industrial Machinery Installation",
        icon: <HardHat className="w-6 h-6 text-accent" />,
        description: "Expert installation of heavy-duty industrial machinery and systems.",
      },
    ],
  },
  {
    category: "Maintenance",
    icon: <Shield className="w-10 h-10 text-primary" />,
    items: [
      {
        title: "Preventive Home Maintenance",
        icon: <Home className="w-6 h-6 text-accent" />,
        description: "Keep your home equipment in top shape with our scheduled check-ups.",
      },
      {
        title: "Commercial Maintenance Plans",
        icon: <Building className="w-6 h-6 text-accent" />,
        description: "Customizable maintenance contracts to ensure business continuity.",
      },
      {
        title: "Industrial System Upkeep",
        icon: <HardHat className="w-6 h-6 text-accent" />,
        description: "Comprehensive maintenance for complex industrial systems.",
      },
    ],
  },
  {
    category: "Repair",
    icon: <Wrench className="w-10 h-10 text-primary" />,
    items: [
      {
        title: "Home Appliance Repair",
        icon: <Home className="w-6 h-6 text-accent" />,
        description: "Fast and effective repair services for all major home appliances.",
      },
      {
        title: "Commercial Equipment Repair",
        icon: <Building className="w-6 h-6 text-accent" />,
        description: "On-demand repair services to minimize downtime for your business.",
      },
      {
        title: "Industrial Machinery Repair",
        icon: <HardHat className="w-6 h-6 text-accent" />,
        description: "24/7 emergency repair for critical industrial machinery.",
      },
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Our Services</h1>
        <p className="text-lg text-muted-foreground">
          We offer a full spectrum of professional services for home, commercial, and industrial equipment.
        </p>
      </div>

      <div className="space-y-16">
        {services.map((serviceCategory) => (
          <div key={serviceCategory.category}>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-primary/10 p-3 rounded-full">{serviceCategory.icon}</div>
              <h2 className="text-3xl font-bold font-headline">{serviceCategory.category}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {serviceCategory.items.map((service) => (
                <Card key={service.title} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex-row items-start gap-4">
                    {service.icon}
                    <div>
                      <CardTitle className="text-lg font-semibold">{service.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{service.description}</CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" asChild className="w-full">
                       <Link href="/quote">Request a Quote</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
