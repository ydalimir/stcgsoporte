
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart } from "lucide-react";

export default function ReportsPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <AreaChart className="w-6 h-6" />
                    <CardTitle>Reportes</CardTitle>
                </div>
                <CardDescription>Genera y visualiza reportes de tickets, servicios y más. Próximamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">La sección de reportes está en construcción.</p>
                </div>
            </CardContent>
        </Card>
    )
}
