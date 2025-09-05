
import { ShoppingCart } from 'lucide-react';

export default function ShopPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <ShoppingCart className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
          Tienda en Línea
        </h1>
        <p className="text-lg text-muted-foreground">
          Encuentra las refacciones y equipos que necesitas. Nuestra tienda en línea estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
