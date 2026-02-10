
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientsPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <CardTitle>Clientes</CardTitle>
                </div>
                <CardDescription>Añadir, ver y gestionar la información de tus clientes. Próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La sección de clientes está en construcción.</p>
                </div>
            </CardContent>
        </Card>
    )
}
