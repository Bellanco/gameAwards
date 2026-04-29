import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// IMPORTANTE: Reemplaza estos valores con tus credenciales de la Consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD46f7xoaS9Nf8pZ3_tOxo96IJTiaWo5y4",
  authDomain: "game-awards-d7881.firebaseapp.com",
  projectId: "game-awards-d7881",
  storageBucket: "game-awards-d7881.firebasestorage.app",
  messagingSenderId: "321669895248",
  appId: "1:321669895248:web:2bdce94f9d0677b22cad55",
  measurementId: "G-5ZZGWP5CGQ"

};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
