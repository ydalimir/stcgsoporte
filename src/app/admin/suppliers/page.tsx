
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function SuppliersPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Truck className="w-6 h-6" />
                    <CardTitle>Proveedores</CardTitle>
                </div>
                <CardDescription>Añadir, ver y gestionar la información de tus proveedores. Próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La sección de proveedores está en construcción.</p>
                </div>
            </CardContent>
        </Card>
    )
}
