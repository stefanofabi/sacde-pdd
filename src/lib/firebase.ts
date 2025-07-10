// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sacde-pdd.firebaseapp.com",
  projectId: "sacde-pdd",
  storageBucket: "sacde-pdd.appspot.com",
  messagingSenderId: "192452058062",
  appId: "1:192452058062:web:936049521788ddf48b699f",
  measurementId: "G-4DE54KZMK9"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);