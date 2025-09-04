import { ShoppingCart, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const products = [
  {
    name: 'Termostato Universal para Horno',
    price: '850.00',
    image: 'https://picsum.photos/300/300',
    aiHint: 'thermostat industrial',
    category: 'Refacciones',
    stock: 15,
  },
  {
    name: 'Quemador de Hierro Fundido para Estufa',
    price: '1,200.00',
    image: 'https://picsum.photos/301/301',
    aiHint: 'stove burner',
    category: 'Refacciones',
    stock: 8,
  },
  {
    name: 'Filtro de Grasa para Campana (Malla)',
    price: '650.00',
    image: 'https://picsum.photos/302/302',
    aiHint: 'grease filter',
    category: 'Consumibles',
    stock: 30,
  },
   {
    name: 'Kit de Limpieza para Acero Inoxidable',
    price: '450.00',
    image: 'https://picsum.photos/303/303',
    aiHint: 'cleaning kit',
    category: 'Limpieza',
    stock: 25,
  },
];

export default function StorePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <ShoppingCart className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
          Tienda en Línea
        </h1>
        <p className="text-lg text-muted-foreground">
          Encuentra refacciones, consumibles y accesorios para tus equipos de cocina.
        </p>
      </div>

       <div className="max-w-lg mx-auto mb-12">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Buscar productos y refacciones..." className="pl-10" />
            </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {products.map((product, index) => (
          <Card key={index} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="p-0">
                <div className="relative h-64 w-full">
                 <Image
                    src={product.image}
                    alt={product.name}
                    data-ai-hint={product.aiHint}
                    fill
                    className="object-cover"
                />
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                 <Badge variant="secondary" className="mb-2">{product.category}</Badge>
                 <CardTitle className="text-lg font-semibold leading-snug">{product.name}</CardTitle>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex flex-col items-start gap-4">
                 <p className="text-xl font-bold text-primary">${product.price} MXN</p>
                 <Button className="w-full">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Agregar al Carrito
                 </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
