// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAacdQXlfBtXB9XxyFrLopsffDH2ZeMzI4",
  authDomain: "neolearn-b3cb1.firebaseapp.com",
  projectId: "neolearn-b3cb1",
  storageBucket: "neolearn-b3cb1.firebasestorage.app",
  messagingSenderId: "646341343406",
  appId: "1:646341343406:web:fce6d834b2f81a8d30d53f",
  measurementId: "G-EZYFSV1NT5",
};

// Initialize Firebase
console.log("[Firebase] Initializing Firebase app...");
const app = initializeApp(firebaseConfig);

// Initialize services
console.log("[Firebase] Initializing Firebase services...");
const auth = getAuth(app);
const firestore = getFirestore(app);

console.log("[Firebase] Firebase initialization complete");

export { auth, firestore };
export default firebaseConfig;
