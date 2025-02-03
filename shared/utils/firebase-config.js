// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXqHXJhzVxX_YfaXKOGPxPAuGGXxCQwYo",
  authDomain: "neosentrix-learning.firebaseapp.com",
  projectId: "neosentrix-learning",
  storageBucket: "neosentrix-learning.appspot.com",
  messagingSenderId: "1098765432",
  appId: "1:1098765432:web:abcdef1234567890",
  measurementId: "G-ABCDEF1234",
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
