import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyApJ0noB-XNY3NJVIaojzVAd6L0GOgPSzI",
  authDomain: "jomar-f3b97.firebaseapp.com",
  projectId: "jomar-f3b97",
  storageBucket: "jomar-f3b97.appspot.com",
  messagingSenderId: "564953723382",
  appId: "1:564953723382:web:cf3462a6cdd8cde20497d7",
  measurementId: "G-2H25XMJG3H"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
