// Firebase configuration
window.firebaseConfig = {
  apiKey: "AIzaSyDXqHXJhzVxX_YfaXKOGPxPAuGGXxCQwYo",
  authDomain: "neosentrix-learning.firebaseapp.com",
  projectId: "neosentrix-learning",
  storageBucket: "neosentrix-learning.appspot.com",
  messagingSenderId: "1098765432",
  appId: "1:1098765432:web:abcdef1234567890",
  measurementId: "G-ABCDEF1234",
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

// Export Firebase instances
const auth = firebase.auth();
const firestore = firebase.firestore();

export { auth, firestore };
