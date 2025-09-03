import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Wrench, Shield, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const services = [
    {
      icon: <Wrench className="w-8 h-8 text-primary" />,
      title: 'Expert Repairs',
      description: 'Fast and reliable repairs for home, commercial, and industrial equipment.',
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: 'Preventive Maintenance',
      description: 'Scheduled maintenance plans to keep your equipment running smoothly.',
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: 'Professional Installation',
      description: 'Seamless and certified installation for all types of equipment.',
    },
  ];

  const benefits = [
    {
      icon: <CheckCircle className="w-6 h-6 text-accent" />,
      text: '24/7 Customer Support',
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-accent" />,
      text: 'Certified & Experienced Technicians',
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-accent" />,
      text: 'Transparent Pricing',
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-accent" />,
      text: 'Rapid Response Times',
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="py-20 md:py-32 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter">
              Reliable Support for Your Equipment
            </h1>
            <p className="text-lg text-muted-foreground">
              STICS Support Hub offers expert installation, maintenance, and repair services to keep your operations running without a hitch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90">
                <Link href="/tickets/new">Submit a Ticket</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>
          <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="https://picsum.photos/800/600"
              alt="Technician working on equipment"
              data-ai-hint="technician industrial"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section id="services" className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-4">Our Core Services</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground mb-12">
            We provide a comprehensive range of services to meet all your equipment needs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    {service.icon}
                  </div>
                  <CardTitle className="font-headline text-xl">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="why-us" className="py-24 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-80 md:h-full rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="https://picsum.photos/600/800"
              alt="Satisfied customer"
              data-ai-hint="customer smile"
              fill
              className="object-cover"
            />
          </div>
          <div className="space-y-6">
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Why Choose STICS?</h2>
            <p className="text-muted-foreground">
              Our commitment to excellence and customer satisfaction sets us apart. We are dedicated to providing you with the best service possible.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  {benefit.icon}
                  <span className="font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
            <Button asChild size="lg" variant="link" className="p-0 text-accent">
              <Link href="/quote">Get a Free Quote &rarr;</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
