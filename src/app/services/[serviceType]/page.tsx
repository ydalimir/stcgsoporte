
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';


const allServices = {
  correctivo: {
    title: "Mantenimiento Correctivo",
    description: "Servicios enfocados en reparar averías o fallos cuando ocurren, minimizando así el tiempo de inactividad de sus equipos. Respuesta rápida para emergencias.",
    icon: <Zap className="w-8 h-8 text-primary" />,
    items: [
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
    ]
  },
  preventivo: {
    title: "Mantenimiento Preventivo",
    description: "Consiste en realizar inspecciones regulares y tareas de mantenimiento programadas para garantizar que los equipos funcionen correctamente y evitar fallos futuros.",
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    items: [
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
    ]
  },
};

type ServiceTypePageProps = {
  params: {
    serviceType: keyof typeof allServices;
  }
}

function ServiceTypePageContent({ serviceType }: { serviceType: keyof typeof allServices }) {
  const serviceInfo = allServices[serviceType];

  if (!serviceInfo) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-16">
       <section>
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-primary/10 p-3 rounded-full">{serviceInfo.icon}</div>
                <h1 className="text-3xl md:text-4xl font-headline font-bold">{serviceInfo.title}</h1>
            </div>
            <p className="text-muted-foreground max-w-3xl mb-8">
                {serviceInfo.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {serviceInfo.items.map((service) => (
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
                                <Link href={`/tickets/new?serviceType=${serviceType}&equipmentType=${encodeURIComponent(service.title)}`}>
                                    Solicitar Servicio
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>
        <div className="mt-16 text-center">
            <Button variant="outline" asChild>
                <Link href="/services"> &larr; Volver a Categorías de Servicio</Link>
            </Button>
        </div>
    </div>
  );
}

function LoadingComponent() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function ServiceTypePage({ params }: ServiceTypePageProps) {
  const { serviceType } = params;
  
  return (
    <Suspense fallback={<LoadingComponent />}>
      <ServiceTypePageContent serviceType={serviceType} />
    </Suspense>
  )
}
