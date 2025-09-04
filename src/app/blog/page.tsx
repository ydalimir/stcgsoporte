
import { Rss } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


const blogPosts = [
  {
    title: '5 Señales de que tu Refrigerador Comercial Necesita Mantenimiento',
    description: 'Aprende a identificar las señales de alerta tempranas para evitar reparaciones costosas y pérdida de producto. El mantenimiento preventivo es clave.',
    image: 'https://picsum.photos/400/300',
    aiHint: 'commercial refrigerator',
    date: '15 de Julio, 2024',
    category: 'Mantenimiento Preventivo',
    author: 'Equipo sticgsa'
  },
  {
    title: '¿Reparar o Reemplazar? Cómo Decidir el Futuro de tu Horno de Cocina',
    description: 'Analizamos los factores clave como la edad del equipo, el costo de la reparación y la eficiencia energética para ayudarte a tomar la mejor decisión financiera.',
    image: 'https://picsum.photos/400/301',
    aiHint: 'industrial oven',
    date: '02 de Julio, 2024',
    category: 'Reparación',
    author: 'Equipo sticgsa'
  },
  {
    title: 'La Importancia de la Limpieza Profesional de Campanas de Extracción',
    description: 'Más allá de la estética, una campana limpia es crucial para la seguridad contra incendios y la calidad del aire en tu cocina. Te explicamos por qué.',
    image: 'https://picsum.photos/400/302',
    aiHint: 'kitchen hood',
    date: '25 de Junio, 2024',
    category: 'Asesoría Técnica',
    author: 'Equipo sticgsa'
  }
];


export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <Rss className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
          Blog de Consejos y Noticias
        </h1>
        <p className="text-lg text-muted-foreground">
          Mantente actualizado con las últimas noticias, consejos de mantenimiento y guías de nuestros expertos.
        </p>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPosts.map((post, index) => (
          <Card key={index} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="p-0">
              <div className="relative h-56 w-full">
                <Image
                  src={post.image}
                  alt={post.title}
                  data-ai-hint={post.aiHint}
                  fill
                  className="object-cover"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-grow">
               <Badge variant="secondary" className="mb-2">{post.category}</Badge>
               <CardTitle className="font-headline text-xl mb-2">{post.title}</CardTitle>
               <CardDescription>{post.description}</CardDescription>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex justify-between items-center text-xs text-muted-foreground">
               <span>{post.date}</span>
               <Button variant="link" asChild className="p-0 h-auto">
                 <Link href="#">Leer más &rarr;</Link>
               </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
