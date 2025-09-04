import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    category: "Mantenimiento Correctivo",
    icon: <Zap className="w-10 h-10 text-primary" />,
    description: "Se enfoca en reparar averías o fallos cuando ocurren, minimizando así el tiempo de inactividad de sus equipos. Respuesta rápida para emergencias.",
    items: [
      "Diagnóstico y reparación de averías",
      "Reemplazo de piezas y componentes",
      "Servicio de emergencia 24/7",
      "Pruebas post-reparación",
    ],
  },
  {
    category: "Mantenimiento Preventivo",
    icon: <ShieldCheck className="w-10 h-10 text-primary" />,
    description: "Consiste en realizar inspecciones regulares y tareas de mantenimiento programadas para garantizar que los equipos funcionen correctamente y evitar fallos futuros.",
    items: [
      "Inspecciones y limpieza programada",
      "Ajuste y calibración de equipos",
      "Planes de mantenimiento personalizados",
      "Reportes detallados del estado del equipo",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Nuestros Servicios</h1>
        <p className="text-lg text-muted-foreground">
          Ofrecemos soluciones integrales para el cuidado y funcionamiento óptimo de su equipo gastronómico.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {services.map((serviceCategory) => (
           <Card key={serviceCategory.category} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                    <div className="bg-primary/10 p-3 rounded-full">{serviceCategory.icon}</div>
                    <CardTitle className="text-2xl font-headline">{serviceCategory.category}</CardTitle>
                </div>
                <CardDescription className="text-base">{serviceCategory.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <ul className="space-y-2">
                    {serviceCategory.items.map(item => (
                        <li key={item} className="flex items-start">
                            <ShieldCheck className="w-5 h-5 text-accent mr-3 mt-1 flex-shrink-0" />
                            <span className="text-muted-foreground">{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-accent hover:bg-accent/90">
                <Link href="/quote">Solicitar Servicio</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
