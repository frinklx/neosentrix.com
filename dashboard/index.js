import { showToast, showLoading, hideLoading } from "../shared/utils/ui.js";
import { redirectTo } from "../shared/utils/routes.js";

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

function initializeFirebase() {
  console.log("[Dashboard] Initializing Firebase");
  if (!firebase.apps.length) {
    try {
      firebase.initializeApp(firebaseConfig);
      console.log("[Dashboard] Firebase initialized successfully");
    } catch (error) {
      console.error("[Dashboard] Error initializing Firebase:", error);
      showToast("error", "Failed to initialize security features");
      return;
    }
  }

  auth = firebase.auth();
  firestore = firebase.firestore();

  auth.onAuthStateChanged(handleAuthStateChange);
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
    const userDoc = await firestore.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
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
    showToast("error", "Failed to verify your access");
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

  if (userNameElement) userNameElement.textContent = userData.name;
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
    redirectTo("/auth/login.html");
  }
}

async function handleLogout() {
  console.log("[Dashboard] Handling logout");
  try {
    showLoading("Logging out...", "Please wait");
    await auth.signOut();
    console.log("[Dashboard] Logout successful");
    redirectTo("/auth/login.html");
  } catch (error) {
    console.error("[Dashboard] Error during logout:", error);
    showToast("error", "Failed to log out");
    hideLoading();
  }
}
