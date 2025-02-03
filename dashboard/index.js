import { showToast, showLoading, hideLoading } from "../shared/utils/ui.js";
import { redirectTo } from "../shared/utils/routes.js";

// Import Firebase SDKs
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
  collection,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let auth;
let firestore;
let currentUser = null;
let authInitialized = false;
let isProcessingAuth = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Dashboard] DOM Content Loaded - Initializing");
  showLoading("Securing your dashboard...", "Checking authentication status");
  initializeFirebase();
  setupEventListeners();
});

async function initializeFirebase() {
  console.log("[Dashboard] Initializing Firebase");
  try {
    const { default: firebaseConfig } = await import(
      "../shared/utils/firebase-config.js"
    );
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);

    onAuthStateChanged(auth, handleAuthStateChange);
    console.log("[Dashboard] Firebase initialized successfully");
  } catch (error) {
    console.error("[Dashboard] Error initializing Firebase:", error);
    showToast("Failed to initialize security features", "error");
  }
}

async function handleAuthStateChange(user) {
  console.log("[Dashboard] Auth state changed, processing:", isProcessingAuth);

  if (isProcessingAuth) {
    console.log("[Dashboard] Already processing auth, skipping");
    return;
  }

  try {
    isProcessingAuth = true;

    if (!user) {
      console.log("[Dashboard] No user found, redirecting to login");
      window.location.href =
        "/redirect/index.html?to=/auth/login&message=Please log in&submessage=Redirecting to login page...";
      return;
    }

    console.log("[Dashboard] User found, checking Firestore data");
    const userDoc = await getDoc(doc(firestore, "users", user.uid));

    if (!userDoc.exists()) {
      console.log(
        "[Dashboard] User document not found, redirecting to continue signup"
      );
      window.location.href =
        "/redirect/index.html?to=/auth/signup/continue.html&message=Complete your profile&submessage=Setting up your account...";
      return;
    }

    const userData = userDoc.data();
    console.log("[Dashboard] User data retrieved:", {
      ...userData,
      uid: user.uid,
    });

    if (!userData.isOnboardingComplete) {
      console.log("[Dashboard] Onboarding incomplete, redirecting");
      window.location.href =
        "/redirect/index.html?to=/onboarding&message=Complete onboarding&submessage=Setting up your workspace...";
      return;
    }

    // User is authenticated and has completed onboarding
    console.log("[Dashboard] User fully authenticated and onboarded");
    hideLoading();
    updateUIWithUserData(userData);
    currentUser = user;
  } catch (error) {
    console.error("[Dashboard] Error in auth state change:", error);
    showToast("Failed to verify your access", "error");
    window.location.href =
      "/redirect/index.html?to=/auth/login&message=Authentication error&submessage=Please try logging in again...";
  } finally {
    isProcessingAuth = false;
  }
}

function updateUIWithUserData(userData) {
  console.log("[Dashboard] Updating UI with user data");
  const userNameElement = document.getElementById("userName");
  const userEmailElement = document.getElementById("userEmail");

  if (userNameElement) userNameElement.textContent = userData.displayName;
  if (userEmailElement) userEmailElement.textContent = userData.email;

  // Update avatar
  const userAvatarElement = document.getElementById("userAvatar");
  if (userAvatarElement) {
    const avatarSrc =
      userData.photoURL || "../assets/images/default-avatar.png";
    userAvatarElement.src = avatarSrc;
    console.log("[Dashboard] Updated avatar source:", avatarSrc);
  }
}

function setupEventListeners() {
  console.log("[Dashboard] Setting up event listeners");

  // Logout button
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
    console.log("[Dashboard] Logout button listener added");
  }

  // Handle browser back button
  window.addEventListener("popstate", () => {
    console.log("[Dashboard] Popstate event detected - checking auth state");
    checkAuthState();
  });
}

async function checkAuthState() {
  console.log("[Dashboard] Checking auth state");
  const user = auth.currentUser;
  console.log(
    "[Dashboard] Current user in auth check:",
    user ? "Present" : "Not present"
  );

  if (!user) {
    console.log("[Dashboard] No user in auth check - redirecting to login");
    redirectTo("/auth/login");
  }
}

async function handleLogout() {
  console.log("[Dashboard] Handling logout");
  try {
    showLoading("Logging out...", "Please wait");
    await signOut(auth);
    console.log("[Dashboard] Logout successful");
    redirectTo("/auth/login");
  } catch (error) {
    console.error("[Dashboard] Error during logout:", error);
    showToast("Failed to log out", "error");
    hideLoading();
  }
}
