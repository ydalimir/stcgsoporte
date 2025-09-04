
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const services = {
  correctivo: [
    {
      title: "Diagnóstico y Reparación de Estufas",
      sku: "CORR-EST-01",
      price: "Desde $800 MXN",
      description: "Servicio completo para identificar y reparar cualquier tipo de falla en estufas industriales y comerciales.",
    },
    {
      title: "Reparación Urgente de Sistemas de Refrigeración",
      sku: "CORR-REF-01",
      price: "Desde $1,200 MXN",
      description: "Atención prioritaria para fallas críticas en refrigeradores y congeladores comerciales para evitar pérdidas de producto.",
    },
    {
      title: "Arreglo de Freidoras Industriales",
      sku: "CORR-FRE-01",
      price: "Desde $950 MXN",
      description: "Solución a problemas de calentamiento, termostatos y componentes eléctricos en freidoras de alto rendimiento.",
    },
  ],
  preventivo: [
    {
      title: "Plan de Mantenimiento Anual para Cocinas",
      sku: "PREV-FULL-12",
      price: "Cotización Personalizada",
      description: "Paquete integral que incluye revisiones trimestrales de todos sus equipos para garantizar su óptimo funcionamiento.",
    },
    {
      title: "Limpieza y Calibración de Hornos de Convección",
      sku: "PREV-HOR-01",
      price: "$1,500 MXN",
      description: "Mantenimiento profundo para asegurar una cocción uniforme y eficiente, prolongando la vida útil del horno.",
    },
    {
      title: "Inspección y Limpieza de Campanas de Extracción",
      sku: "PREV-CAM-01",
      price: "$1,800 MXN",
      description: "Servicio esencial para la seguridad, eliminando grasa acumulada y asegurando la correcta extracción de humos.",
    },
  ],
};


export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Nuestros Servicios</h1>
        <p className="text-lg text-muted-foreground">
          Ofrecemos soluciones integrales para el cuidado y funcionamiento óptimo de su equipo gastronómico. Elija un servicio para levantar un ticket.
        </p>
      </div>

      <div className="space-y-16">
        {/* Mantenimiento Correctivo */}
        <section>
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-primary/10 p-3 rounded-full"><Zap className="w-8 h-8 text-primary" /></div>
                <h2 className="text-3xl font-headline font-bold">Mantenimiento Correctivo</h2>
            </div>
            <p className="text-muted-foreground max-w-3xl mb-8">
                Se enfoca en reparar averías o fallos cuando ocurren, minimizando así el tiempo de inactividad de sus equipos. Respuesta rápida para emergencias.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.correctivo.map((service) => (
                    <Card key={service.sku} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <CardTitle>{service.title}</CardTitle>
                            <CardDescription className="text-primary font-bold text-lg pt-2">{service.price}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-muted-foreground">{service.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full bg-accent hover:bg-accent/90">
                                <Link href={`/tickets/new?serviceType=correctivo&equipmentType=${encodeURIComponent(service.title)}`}>Solicitar Reparación</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>

        {/* Mantenimiento Preventivo */}
        <section>
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-primary/10 p-3 rounded-full"><ShieldCheck className="w-8 h-8 text-primary" /></div>
                <h2 className="text-3xl font-headline font-bold">Mantenimiento Preventivo</h2>
            </div>
            <p className="text-muted-foreground max-w-3xl mb-8">
                Consiste en realizar inspecciones regulares y tareas de mantenimiento programadas para garantizar que los equipos funcionen correctamente y evitar fallos futuros.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.preventivo.map((service) => (
                    <Card key={service.sku} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <CardTitle>{service.title}</CardTitle>
                            <CardDescription className="text-primary font-bold text-lg pt-2">{service.price}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <p className="text-muted-foreground">{service.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                               <Link href={`/tickets/new?serviceType=preventivo&equipmentType=${encodeURIComponent(service.title)}`}>Contratar Plan</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>
      </div>
    </div>
  );
}

