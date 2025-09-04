import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, Wrench, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const services = [
    {
      icon: <Wrench className="w-8 h-8 text-primary" />,
      title: 'Reparación',
      description: 'Contamos con refacciones y un entusiasta equipo, listo para su reparacion inmediata.',
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: 'Mantenimiento',
      description: 'Mantenimientos preventivos y correctivos de las mejores marcas de equipos de gastronomía en el mundo.',
    },
    {
      icon: <HardHat className="w-8 h-8 text-primary" />,
      title: 'Asesoría Técnica',
      description: 'Será un placer asesorarlo para que su proyecto se convierta en nuestro proyecto también.',
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="py-20 md:py-32 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter">
              Reparación y mantenimiento de equipos de cocina en Mérida, Yucatán
            </h1>
            <p className="text-lg text-muted-foreground">
              Soluciones expertas para mantener tu cocina funcionando sin contratiempos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90">
                <Link href="/quote">Empezar</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services">Ver Servicios</Link>
              </Button>
            </div>
          </div>
          <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="https://picsum.photos/800/600"
              alt="Técnico reparando equipo de cocina"
              data-ai-hint="kitchen repair"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section id="services" className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold mb-4">Nuestros Servicios Principales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
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

      <section id="about-us" className="py-24 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-80 md:h-[500px] rounded-lg overflow-hidden shadow-2xl order-last md:order-first">
            <Image
              src="https://picsum.photos/600/800"
              alt="Equipo de sticgsa"
              data-ai-hint="team workshop"
              fill
              className="object-cover"
            />
          </div>
          <div className="space-y-6">
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Más sobre nosotros</h2>
            <p className="text-muted-foreground font-semibold">
              Expertos en servicios para estufas, freidoras, campanas, hornos y refrigeradores.
            </p>
            <p className="text-muted-foreground">
              En Equipo Técnico Gastronómico sticgsa SA de CV tenemos más de 30 años de experiencia dentro del ramo industrial, brindando los mejores servicios de reparación, mantenimiento preventivo y correctivo de diferentes equipos de cocina industrial. Nos ubicamos en la Ciudad de Mérida Yucatán.
            </p>
            <p className="text-muted-foreground">
              Manejamos excelentes relaciones comerciales permitiéndonos ofrecer soluciones prácticas a la medida de manera rápida y oportuna. Nuestro personal es profesional, está capacitado y son especialistas para la realización de cualquier servicio, trabajando con las marcas más importantes del mercado.
            </p>
            <Button asChild size="lg" variant="link" className="p-0 text-accent">
              <Link href="/quote">Contáctanos &rarr;</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
