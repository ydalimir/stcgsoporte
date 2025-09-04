import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAmHehK8ifXw4Syz3PIQrZMFXapGqHgOhM",
  authDomain: "stcigsa.firebaseapp.com",
  projectId: "stcigsa",
  storageBucket: "stcigsa.appspot.com",
  messagingSenderId: "934441754028",
  appId: "1:934441754028:web:664e0283ffbe20ee2a2e09",
  measurementId: "G-P2LQXQYTCX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
