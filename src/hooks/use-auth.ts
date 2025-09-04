
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
      setIsLoading(true);
      if (firebaseUser) {
        // Set the basic user information first.
        // The role will be undefined initially.
        setUser(firebaseUser); 

        try {
          // Now, try to fetch the user role from Firestore.
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            // If the role is found, update the user state with the role.
            // This will trigger a re-render in components using the hook.
            setUser({ ...firebaseUser, role: userDoc.data().role });
          }
        } catch (error) {
           console.error("Error fetching user role (may be offline):", error);
           // If Firestore fails (e.g., offline), we don't crash.
           // The app continues with the basic user info.
           // Role-based features will be unavailable until connection is restored.
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
