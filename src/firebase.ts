import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDGEraROZ-USAoP84f_QDfdaybX1CM08pA",
  authDomain: "edu-questions-50f9a.firebaseapp.com",
  projectId: "edu-questions-50f9a",
  storageBucket: "edu-questions-50f9a.firebasestorage.app",
  messagingSenderId: "435450746495",
  appId: "1:435450746495:web:88aa57bb416f451c67914a",
  measurementId: "G-L6ZJ3J2P3Y"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export default app;
