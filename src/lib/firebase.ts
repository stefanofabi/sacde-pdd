// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBIXYa-E7nhizXpiURBo5srMgD4CJ8JT4E",
  authDomain: "sacde-pdd.firebaseapp.com",
  projectId: "sacde-pdd",
  storageBucket: "sacde-pdd.appspot.com",
  messagingSenderId: "192452058062",
  appId: "1:192452058062:web:936049521788ddf48b699f",
  measurementId: "G-4DE54KZMK9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Analytics, if you want to use it
// const analytics = getAnalytics(app);
