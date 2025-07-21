// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDYJ8SXJA9Kg6DYPoCJrNAbh-ePxWZ-ppU",
  authDomain: "sacde-pdd.firebaseapp.com",
  projectId: "sacde-pdd",
  storageBucket: "sacde-pdd.firebasestorage.app",
  messagingSenderId: "192452058062",
  appId: "1:192452058062:web:936049521788ddf48b699f",
  measurementId: "G-4DE54KZMK9"
};

// Initialize Firebase for client-side
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);