// Maintenance mode configuration
const express = require("express");
const path = require("path");
const router = express.Router();

// Redirect all auth-related requests to the maintenance page
router.all("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

module.exports = router;

// Note: The following code is preserved but inactive during maintenance mode
/*
import { showToast, showLoading, hideLoading } from "../shared/utils/ui.js";
import { redirectTo } from "../shared/utils/routes.js";
import { initializeComponents } from "../shared/components/loading.js";

// Initialize Firebase Auth
let auth;
let firestore;
let authInitialized = false;
let isProcessingAuth = false;

// Initialize components when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Auth] DOM Content Loaded - Initializing components");
  initializeComponents();
  initializeFirebase();
});

function initializeFirebase() {
  console.log("[Auth] Initializing Firebase");
  try {
    auth = firebase.auth();
    firestore = firebase.firestore();

    // Set up auth state listener
    auth.onAuthStateChanged(handleAuthStateChange);
    console.log("[Auth] Firebase initialized successfully");
  } catch (error) {
    console.error("[Auth] Error initializing Firebase:", error);
    showToast("Error initializing application", "error");
  }
}

async function handleAuthStateChange(user) {
  console.log(
    "[Auth] Auth state changed:",
    user ? "User logged in" : "No user"
  );

  if (isProcessingAuth) {
    console.log("[Auth] Already processing auth state - skipping");
    return;
  }

  if (!user) {
    console.log("[Auth] No user - no action needed");
    return;
  }

  try {
    isProcessingAuth = true;
    console.log("[Auth] User ID:", user.uid);
    console.log("[Auth] Email:", user.email);
    console.log("[Auth] Display Name:", user.displayName);
    console.log("[Auth] Provider Data:", user.providerData);

    // Check if user exists in Firestore
    const userDoc = await checkUserExists(user.uid);
    console.log("[Auth] User document exists:", userDoc != null);

    // Get current path
    const currentPath = window.location.pathname;
    console.log("[Auth] Current path:", currentPath);

    if (!userDoc) {
      // New user - should go to continue signup
      console.log("[Auth] New user detected");
      if (!currentPath.includes("/signup/continue.html")) {
        console.log("[Auth] Redirecting to continue signup");
        redirectTo("/auth/signup/continue.html");
      }
    } else if (!userDoc.hasCompletedSignup) {
      // Incomplete signup - should complete profile
      console.log("[Auth] Incomplete signup detected");
      if (!currentPath.includes("/signup/continue.html")) {
        console.log("[Auth] Redirecting to continue signup");
        redirectTo("/auth/signup/continue.html");
      }
    } else {
      // Existing user with complete profile
      console.log("[Auth] Existing user with complete profile");
      if (currentPath.includes("/auth/")) {
        console.log("[Auth] Redirecting to dashboard");
        redirectTo("/dashboard/");
      }
    }
  } catch (error) {
    console.error("[Auth] Error checking user existence:", error);
    showToast("Error checking user status", "error");
  } finally {
    isProcessingAuth = false;
  }
}

async function checkUserExists(userId) {
  console.log("[Auth] Checking if user exists in Firestore:", userId);
  try {
    const userDoc = await firestore.collection("users").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    console.log("[Auth] User data:", userData);
    return userData;
  } catch (error) {
    console.error("[Auth] Error checking user in Firestore:", error);
    throw error;
  }
}

// Save user data to Firestore
export async function saveUserData(userId, userData) {
  console.log("[Auth] Saving user data to Firestore:", userId, userData);
  try {
    await firestore
      .collection("users")
      .doc(userId)
      .set({
        ...userData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    console.log("[Auth] User data saved successfully");
    return true;
  } catch (error) {
    console.error("[Auth] Error saving user data:", error);
    throw error;
  }
}

// Export necessary functions
export { checkUserExists };
*/
