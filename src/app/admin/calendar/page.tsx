
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

type Project = {
    id: string;
    client: string;
    description: string;
    responsible: string;
    status: "Nuevo" | "En Progreso" | "En Pausa" | "Completado";
    programmedDate: string; // YYYY-MM-DD
    priority: "Baja" | "Media" | "Alta";
    userId: string;
};

type UserProfile = {
    role: 'admin' | 'employee';
};

export default function CalendarPage() {
    const { user, isLoading: authIsLoading } = useAuth();
    const router = useRouter();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [projects, setProjects] = useState<Project[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authIsLoading) return;
        if (!user) {
            router.push('/');
            return;
        }

        const unsubProfile = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if(doc.exists()) {
              setUserProfile(doc.data() as UserProfile);
            }
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${user.uid}`,
                operation: 'get',
            }));
        });
        
        return () => unsubProfile();

    }, [user, authIsLoading, router]);

    useEffect(() => {
        if (!user || !userProfile) {
            if(!authIsLoading) setIsLoading(false);
            return;
        };
        
        setIsLoading(true);
        const is_admin = userProfile.role === 'admin';
        const projectsQuery = is_admin 
            ? query(collection(db, "projects"))
            : query(collection(db, "projects"), where("userId", "==", user.uid));
        
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Project));
            setProjects(projectsData);
            setIsLoading(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'projects',
                operation: 'list',
            }));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, userProfile, authIsLoading]);

    const { selectedDayProjects, overdueProjects, projectModifiers } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allOverdueProjects = projects.filter(p => {
             if (p.status === 'Completado' || !p.programmedDate) return false;
             const programmedDate = new Date(p.programmedDate.replace(/-/g, '\/'));
             return programmedDate < today;
        });

        const selectedDateStr = date?.toISOString().split('T')[0];
        const allSelectedDayProjects = projects.filter(p => p.programmedDate === selectedDateStr && p.status !== 'Completado');

        // Logic for calendar dots
        const dateGroups: Record<string, Set<Project['status']>> = {};
        projects.forEach(p => {
            if (!p.programmedDate) return;
            const dateStr = p.programmedDate;
            if (!dateGroups[dateStr]) {
                dateGroups[dateStr] = new Set();
            }
            dateGroups[dateStr].add(p.status);
        });

        const finalModifiers: Record<string, Date[]> = {
            vencido: [],
            completado: [],
            enProgreso: [],
            enPausa: [],
            nuevo: [],
        };
        
        const statusPriority: Project['status'][] = ["En Progreso", "En Pausa", "Nuevo", "Completado"];
        
        for (const dateStr in dateGroups) {
            const statuses = dateGroups[dateStr];
            const projectDate = new Date(dateStr.replace(/-/g, '\/'));
            
            const isOverdue = projectDate < today && (statuses.has("Nuevo") || statuses.has("En Progreso") || statuses.has("En Pausa"));
            
            if (isOverdue) {
                finalModifiers.vencido.push(projectDate);
            } else {
                let assigned = false;
                for (const status of statusPriority) {
                    if (statuses.has(status)) {
                        if (status === "En Progreso") finalModifiers.enProgreso.push(projectDate);
                        else if (status === "En Pausa") finalModifiers.enPausa.push(projectDate);
                        else if (status === "Nuevo") finalModifiers.nuevo.push(projectDate);
                        else if (status === "Completado") finalModifiers.completado.push(projectDate);
                        assigned = true;
                        break; 
                    }
                }
            }
        }

        return { 
            selectedDayProjects: allSelectedDayProjects,
            overdueProjects: allOverdueProjects, 
            projectModifiers: finalModifiers, 
        };
    }, [date, projects]);
    
    const projectModifiersClassNames = {
        vencido: 'project-vencido',
        completado: 'project-completado',
        enProgreso: 'project-en-progreso',
        enPausa: 'project-en-pausa',
        nuevo: 'project-nuevo',
    };

    if (isLoading || authIsLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
                 <CardHeader>
                    <CardTitle>Calendario de Proyectos</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                     <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="p-0"
                        modifiers={projectModifiers}
                        modifiersClassNames={projectModifiersClassNames}
                    />
                </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-8">
                 {overdueProjects.length > 0 && (
                    <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Proyectos Vencidos</CardTitle>
                             <CardDescription>Estos proyectos han pasado su fecha programada y no han sido completados.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ProjectList projects={overdueProjects} />
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Proyectos para el {date ? date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '...'}
                        </CardTitle>
                         <CardDescription>Proyectos pendientes programados para la fecha seleccionada.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {selectedDayProjects.length > 0 ? (
                           <ProjectList projects={selectedDayProjects} />
                       ) : (
                           <div className="text-center text-muted-foreground py-10">
                                <Briefcase className="mx-auto h-12 w-12" />
                                <p className="mt-4">No hay proyectos pendientes para esta fecha.</p>
                           </div>
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


function ProjectList({ projects }: { projects: Project[] }) {
    return (
        <div className="space-y-4">
            {projects.map(project => (
                <div key={project.id} className="p-4 rounded-lg border bg-card flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{project.client}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">{project.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Responsable: {project.responsible}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <Badge variant="outline" className={cn('capitalize', {
                            'text-red-600 border-red-600': project.priority === 'Alta',
                            'text-yellow-600 border-yellow-600': project.priority === 'Media',
                            'text-green-600 border-green-600': project.priority === 'Baja',
                        })}>{project.priority}</Badge>
                         <Badge variant="outline" className={cn('capitalize', {
                           'text-blue-600 border-blue-600': project.status === 'Nuevo',
                           'text-yellow-600 border-yellow-600': project.status === 'En Progreso',
                           'text-red-600 border-red-600': project.status === 'En Pausa',
                           'text-green-600 border-green-600': project.status === 'Completado',
                        })}>{project.status}</Badge>
                    </div>
                </div>
            ))}
        </div>
    )
}
