// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBKdTjao7dCiPcWMsEj2z3f8ESQmd-JX0A",
  authDomain: "datasearchportal.firebaseapp.com",
  projectId: "datasearchportal",
  storageBucket: "datasearchportal.firebasestorage.app",
  messagingSenderId: "147453127242",
  appId: "1:147453127242:web:8438fa8f94d0ae4b6214b3",
  measurementId: "G-Q80YYTF24W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
