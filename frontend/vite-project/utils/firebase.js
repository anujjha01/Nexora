// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "nexoraai-e577e.firebaseapp.com",
  projectId: "nexoraai-e577e",
  storageBucket: "nexoraai-e577e.firebasestorage.app",
  messagingSenderId: "521491783840",
  appId: "1:521491783840:web:ef4735586a6b7a766629c5",
  measurementId: "G-4BWM8CZ6YP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
