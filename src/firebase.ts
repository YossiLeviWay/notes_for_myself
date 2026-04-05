import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDNNg8fm6zWBLpqQt7_w9mdHc5T0j01Dao",
  authDomain: "nfms-e3f18.firebaseapp.com",
  projectId: "nfms-e3f18",
  storageBucket: "nfms-e3f18.firebasestorage.app",
  messagingSenderId: "1098578351586",
  appId: "1:1098578351586:web:8ec3450281c05be6efd5bb",
  measurementId: "G-YHZ7TMYKEX"
};

// Log config to help diagnose configuration-not-found errors
console.log("Initializing Firebase with project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
