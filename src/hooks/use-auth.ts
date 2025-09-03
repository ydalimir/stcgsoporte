
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
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUser({ ...firebaseUser, role: userDoc.data().role });
          } else {
            setUser(firebaseUser); // User exists in Auth, but not in Firestore yet
          }
        } catch (error) {
           console.error("Error fetching user role:", error);
           setUser(firebaseUser); // Set basic user info even if Firestore fails
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
