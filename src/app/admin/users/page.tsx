
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function UsersPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <CardTitle>Administración de Usuarios</CardTitle>
                </div>
                <CardDescription>Gestionar roles y acceso de los usuarios de la plataforma. Próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La sección de administración de usuarios está en construcción.</p>
                </div>
            </CardContent>
        </Card>
    )
}
