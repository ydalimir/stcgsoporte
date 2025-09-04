
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface User extends FirebaseUser {
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true); // Set loading to true when auth state changes
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUser({ ...firebaseUser, role: userDoc.data().role });
          } else {
            // User is authenticated but no document in Firestore yet.
            // This can happen right after sign-up before the doc is created.
            setUser(firebaseUser); 
          }
        } catch (error) {
           console.error("Error fetching user role:", error);
           // If Firestore fails (e.g., offline), set the basic user info anyway.
           // The app can function, and role-based features will be unavailable.
           setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isLoading, isAdmin: user?.role === 'admin' };
}
