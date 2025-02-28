// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAacdQXlfBtXB9XxyFrLopsffDH2ZeMzI4",
  authDomain: "neolearn-b3cb1.firebaseapp.com",
  projectId: "neolearn-b3cb1",
  storageBucket: "neolearn-b3cb1.firebasestorage.app",
  messagingSenderId: "646341343406",
  appId: "1:646341343406:web:fce6d834b2f81a8d30d53f",
  measurementId: "G-EZYFSV1NT5",
};

// Initialize Firebase
if (typeof firebase !== "undefined") {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} else {
  console.error("Firebase SDK not loaded");
}

// Make Firebase instances available globally
window.auth = firebase.auth();
window.db = firebase.firestore();
