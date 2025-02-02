// Import shared utilities
import { showToast, showLoading, hideLoading } from "../shared/utils/ui";
import { ROUTES, navigateTo, redirectTo } from "../shared/utils/routes";
import { initializeComponents } from "../shared/components/loading";

// Initialize Firebase Auth
let auth;
let firestore;

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

  if (user) {
    console.log("[Auth] User ID:", user.uid);
    console.log("[Auth] Email:", user.email);
    console.log("[Auth] Display Name:", user.displayName);
    console.log("[Auth] Provider Data:", user.providerData);

    try {
      // Check if user exists in Firestore
      const userDoc = await checkUserExists(user.uid);
      console.log("[Auth] User document exists:", userDoc != null);

      if (!userDoc) {
        // New user - redirect to continue signup
        console.log(
          "[Auth] New user detected - redirecting to continue signup"
        );
        redirectTo("/auth/signup/continue.html");
      } else {
        // Existing user - redirect to dashboard
        console.log("[Auth] Existing user - redirecting to dashboard");
        redirectTo("/dashboard/");
      }
    } catch (error) {
      console.error("[Auth] Error checking user existence:", error);
      showToast("Error checking user status", "error");
    }
  }
}

async function checkUserExists(userId) {
  console.log("[Auth] Checking if user exists in Firestore:", userId);
  try {
    const userDoc = await firestore.collection("users").doc(userId).get();
    return userDoc.exists ? userDoc.data() : null;
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

// Initialize auth components
export function initializeAuth() {
  initializeComponents();

  // Check if user is already signed in
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const userDoc = await firebase
          .firestore()
          .collection("users")
          .doc(user.uid)
          .get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          if (!userData.hasCompletedProfile) {
            await navigateTo(ROUTES.CONTINUE_SIGNUP);
          } else if (!userData.hasCompletedOnboarding) {
            await navigateTo(ROUTES.ONBOARDING);
          } else {
            await navigateTo(ROUTES.DASHBOARD);
          }
        } else {
          await navigateTo(ROUTES.SIGNUP);
        }
      } catch (error) {
        console.error("Error checking user state:", error);
        showToast(error.message, "error");
      }
    }
  });
}

// Export auth-related utilities
export { showToast, showLoading, hideLoading, navigateTo, ROUTES };
