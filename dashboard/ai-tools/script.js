// Import Firebase and utils
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "../../shared/utils/firebase-config.js";
import { showToast } from "../../shared/utils/ui.js";

// Initialize Firebase
console.log("[AI Tools] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// DOM Elements
const userAvatar = document.getElementById("userAvatar");
const logoutBtn = document.getElementById("logoutBtn");

// Update UI with user data
function updateUIWithUserData(userData) {
  if (!userData) return;

  if (userAvatar) {
    const avatarUrl =
      userData.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        userData.email.split("@")[0]
      )}&background=00f2ff&color=000000`;
    userAvatar.src = avatarUrl;
  }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      const userData = userDoc.exists()
        ? userDoc.data()
        : { email: user.email };
      updateUIWithUserData({ ...userData, ...user });
    } catch (error) {
      console.error("[AI Tools] Error fetching user data:", error);
    }
  } else {
    window.location.href =
      "/auth/login?message=Please log in to access AI tools";
  }
});

// Event Listeners
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "/auth/login?message=Logged out successfully";
    } catch (error) {
      console.error("[AI Tools] Error during logout:", error);
      showToast("Failed to log out", "error");
    }
  });
}
