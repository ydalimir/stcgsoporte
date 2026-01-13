
"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError } from "@/lib/errors";

// Import secondary app instance for user creation
import { initializeApp, getApps } from "firebase/app";

// IMPORTANT: We need a secondary Firebase app instance to create users
// because the primary `auth` instance might be signed in as the admin,
// and you can't create a new user while another is logged in on the same auth instance.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const apps = getApps();
const userCreationApp = apps.find(app => app.name === 'userCreation') || initializeApp(firebaseConfig, 'userCreation');
const userCreationAuth = getAuth(userCreationApp);


export default function UsersPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create user with the secondary auth instance
      const userCredential = await createUserWithEmailAndPassword(userCreationAuth, email, password);
      const user = userCredential.user;

      // Save user profile in Firestore with 'admin' role
      const userDocRef = doc(db, "users", user.uid);
      const newUserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.email,
        role: "admin", // Assign admin role by default
        createdAt: serverTimestamp(),
      };
      
      // Use the main db instance to write the document
      await setDoc(userDocRef, newUserProfile)
        .catch(serverError => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: newUserProfile
            }));
             throw serverError; // re-throw to be caught by outer try-catch
        });

      toast({
        title: "Usuario Administrador Creado",
        description: `La cuenta para ${user.email} ha sido creada con éxito.`,
      });

      // Clear form
      setEmail("");
      setPassword("");
      setDisplayName("");

    } catch (error: any) {
      console.error("Error creating user:", error);
      let description = "Ocurrió un error inesperado.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este correo electrónico ya está en uso.";
      } else if (error.code === 'auth/weak-password') {
        description = "La contraseña debe tener al menos 6 caracteres.";
      }
      toast({
        title: "Error al Crear Usuario",
        description,
        variant: "destructive",
      });
    } finally {
      // Sign out the newly created user from the secondary instance to avoid conflicts
      await userCreationAuth.signOut();
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <UserPlus className="w-6 h-6" />
          <CardTitle>Crear Nuevo Usuario</CardTitle>
        </div>
        <CardDescription>
          Añadir un nuevo miembro al equipo. Por defecto, se le asignará el rol de **administrador**.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateUser} className="space-y-6 max-w-md mx-auto">
           <div className="space-y-2">
            <Label htmlFor="displayName">Nombre Completo</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Ej: Jane Doe"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
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
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando Usuario...
              </>
            ) : (
              "Crear Usuario Administrador"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
