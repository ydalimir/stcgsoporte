
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

    const { selectedDayProjects, overdueProjects } = useMemo(() => {
        if (!date) {
            return { selectedDayProjects: [], overdueProjects: [] };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedDateStr = date.toISOString().split('T')[0];

        const selectedDayProjects = projects.filter(p => p.programmedDate === selectedDateStr && p.status !== 'Completado');
        
        const overdueProjects = projects.filter(p => {
             if (p.status === 'Completado' || !p.programmedDate) return false;
             const programmedDate = new Date(p.programmedDate.replace(/-/g, '\/'));
             return programmedDate < today;
        });

        return { selectedDayProjects, overdueProjects };

    }, [date, projects]);
    
    const projectModifiers = useMemo(() => {
        const modifiers: Record<string, Date[]> = {};
        projects.forEach(p => {
            if (p.status === 'Completado' || !p.programmedDate) return;
            const date = new Date(p.programmedDate.replace(/-/g, '\/'));
            const dateKey = `project-${p.status.toLowerCase().replace(/ /g, '-')}`;
            if (!modifiers[dateKey]) {
                modifiers[dateKey] = [];
            }
            modifiers[dateKey].push(date);
        });
        return modifiers;
    }, [projects]);
    
    const projectModifiersClassNames = {
        'project-nuevo': 'project-nuevo',
        'project-en-progreso': 'project-en-progreso',
        'project-en-pausa': 'project-en-pausa',
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
                         <CardDescription>Proyectos programados para la fecha seleccionada.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {selectedDayProjects.length > 0 ? (
                           <ProjectList projects={selectedDayProjects} />
                       ) : (
                           <div className="text-center text-muted-foreground py-10">
                                <Briefcase className="mx-auto h-12 w-12" />
                                <p className="mt-4">No hay proyectos programados para esta fecha.</p>
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
