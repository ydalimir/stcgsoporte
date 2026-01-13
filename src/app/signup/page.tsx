
"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "user",
        createdAt: new Date().toISOString(),
      });
      
      router.push("/profile");
      
      toast({
        title: "Cuenta Creada",
        description: "Tu cuenta ha sido creada exitosamente. Redirigiendo a tu panel...",
      });

    } catch (error: any) {
      console.error("Error signing up: ", error);
      let description = "Ocurrió un error inesperado. Por favor, intente de nuevo.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este correo ya está registrado. Por favor, intenta iniciar sesión.";
      } else if (error.code === 'auth/weak-password') {
        description = "La contraseña es muy débil. Por favor, elige una más segura.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title: "Fallo en el Registro",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
     <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">
       <div className="flex items-center justify-center bg-background p-8 order-2 md:order-1">
        <div className="w-full max-w-sm">
            <div className="text-center mb-8">
                <div className="mx-auto bg-primary/10 text-primary w-fit p-3 rounded-full mb-4">
                    <UserPlus className="w-8 h-8"/>
                </div>
                <h1 className="text-2xl font-bold font-headline">Crear una Cuenta</h1>
                <p className="text-muted-foreground">Ingresa tus datos para registrarte.</p>
            </div>
          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="correo@ejemplo.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
               <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                 <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(prev => !prev)}
                >
                    {showPassword ? <EyeOff /> : <Eye />}
                    <span className="sr-only">{showPassword ? 'Ocultar' : 'Mostrar'} contraseña</span>
                </Button>
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creando cuenta..." : "Registrarse"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
               ¿Ya tienes una cuenta? <Link href="/" className="font-semibold text-primary hover:underline">Inicia Sesión</Link>
            </p>
          </form>
        </div>
      </div>
       <div className="relative flex-col items-center justify-center bg-gray-900 text-white p-8 hidden md:flex order-1 md:order-2">
         <Image
            src="https://ucarecdn.com/2e73c219-cd6c-4d47-abfd-e4b2a36f286b/normal_65b16ffde4984.webp"
            alt="Mantenimiento de equipo de cocina"
            fill
            className="object-cover opacity-20"
            data-ai-hint="kitchen maintenance"
        />
        <div className="relative z-10 text-center space-y-4">
            <Logo className="justify-center text-4xl" />
            <p className="text-lg text-muted-foreground">La solución definitiva para la gestión de servicios técnicos.</p>
        </div>
      </div>
    </div>
  );
}
