// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase is optional during preview/builds without a configured web API key.
const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: "nexoraai-e577e.firebaseapp.com",
  projectId: "nexoraai-e577e",
  storageBucket: "nexoraai-e577e.firebasestorage.app",
  messagingSenderId: "521491783840",
  appId: "1:521491783840:web:ef4735586a6b7a766629c5",
  measurementId: "G-4BWM8CZ6YP"
};

const app = firebaseApiKey ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = auth ? new GoogleAuthProvider() : null;
