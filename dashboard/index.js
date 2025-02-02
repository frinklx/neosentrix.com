import { showToast } from "../shared/utils/ui";
import { redirectTo } from "../shared/utils/routes";

let auth;
let firestore;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Dashboard] DOM Content Loaded - Initializing");
  initializeFirebase();
  setupEventListeners();
});

function initializeFirebase() {
  console.log("[Dashboard] Initializing Firebase");
  try {
    auth = firebase.auth();
    firestore = firebase.firestore();

    // Set up auth state listener
    auth.onAuthStateChanged(handleAuthStateChange);
    console.log("[Dashboard] Firebase initialized successfully");
  } catch (error) {
    console.error("[Dashboard] Error initializing Firebase:", error);
    showToast("Error initializing application", "error");
  }
}

async function handleAuthStateChange(user) {
  console.log(
    "[Dashboard] Auth state changed:",
    user ? "User logged in" : "No user"
  );

  if (!user) {
    console.log("[Dashboard] No user found - redirecting to login");
    redirectTo("/auth/login/");
    return;
  }

  try {
    // Check if user exists and has completed setup
    const userDoc = await checkUserAccess(user.uid);

    if (!userDoc) {
      console.log(
        "[Dashboard] User document not found - redirecting to signup"
      );
      redirectTo("/auth/signup/");
      return;
    }

    if (!userDoc.hasCompletedSignup) {
      console.log(
        "[Dashboard] User has not completed signup - redirecting to continue signup"
      );
      redirectTo("/auth/signup/continue.html");
      return;
    }

    // User is authenticated and has completed setup
    currentUser = user;
    updateUIWithUserData(userDoc);
    console.log("[Dashboard] User authenticated and setup complete");
  } catch (error) {
    console.error("[Dashboard] Error checking user access:", error);
    showToast("Error verifying access", "error");
    redirectTo("/auth/login/");
  }
}

async function checkUserAccess(userId) {
  console.log("[Dashboard] Checking user access:", userId);
  try {
    const userDoc = await firestore.collection("users").doc(userId).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    console.error("[Dashboard] Error checking user access:", error);
    throw error;
  }
}

function updateUIWithUserData(userData) {
  console.log("[Dashboard] Updating UI with user data");

  // Update welcome message
  const userNameElement = document.getElementById("userName");
  if (userNameElement) {
    userNameElement.textContent = userData.displayName || "User";
  }

  // Update avatar
  const userAvatarElement = document.getElementById("userAvatar");
  if (userAvatarElement && userData.photoURL) {
    userAvatarElement.src = userData.photoURL;
  }
}

function setupEventListeners() {
  console.log("[Dashboard] Setting up event listeners");

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}

async function handleLogout() {
  console.log("[Dashboard] Handling logout");
  try {
    await auth.signOut();
    console.log("[Dashboard] User signed out successfully");
    redirectTo("/auth/login/");
  } catch (error) {
    console.error("[Dashboard] Error signing out:", error);
    showToast("Error signing out", "error");
  }
}
