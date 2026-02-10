
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function PurchaseOrdersPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <ShoppingCart className="w-6 h-6" />
                    <CardTitle>Órdenes de Compra</CardTitle>
                </div>
                <CardDescription>Crear y gestionar órdenes de compra para proveedores. Próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La sección de órdenes de compra está en construcción.</p>
                </div>
            </CardContent>
        </Card>
    )
}
