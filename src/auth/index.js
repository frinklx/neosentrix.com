// Import shared utilities
import { showToast, showLoading, hideLoading } from "../shared/utils/ui";
import { ROUTES, navigateTo } from "../shared/utils/routes";
import { initializeComponents } from "../shared/components/loading";

// Firebase auth state management
export async function checkUserExists(userId) {
  try {
    const userDoc = await firebase
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    return userDoc.exists;
  } catch (error) {
    console.error("Error checking user:", error);
    return false;
  }
}

// Save user data to Firestore
export async function saveUserData(userId, userData) {
  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(userId)
      .set({
        ...userData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("Error saving user data:", error);
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
