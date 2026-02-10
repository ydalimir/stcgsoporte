
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function ProjectsPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Briefcase className="w-6 h-6" />
                    <CardTitle>Proyectos</CardTitle>
                </div>
                <CardDescription>Gestiona todos los proyectos, sus cotizaciones y órdenes de compra asociadas. Próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La sección de proyectos está en construcción.</p>
                </div>
            </CardContent>
        </Card>
    )
}
