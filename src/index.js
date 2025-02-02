// Import shared styles
import "./shared/styles/variables.css";
import "./shared/styles/main.css";

// Import shared utilities
import { initializeComponents } from "./shared/components/loading";
import { ROUTES } from "./shared/utils/routes";

// Initialize components
document.addEventListener("DOMContentLoaded", () => {
  initializeComponents();
});

// Check authentication state
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // Check if user has completed onboarding
    firebase
      .firestore()
      .collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          if (doc.data().hasCompletedOnboarding) {
            window.location.href = ROUTES.DASHBOARD;
          } else {
            window.location.href = ROUTES.ONBOARDING;
          }
        } else {
          window.location.href = ROUTES.SIGNUP;
        }
      })
      .catch((error) => {
        console.error("Error checking user state:", error);
        window.location.href = ROUTES.LOGIN;
      });
  }
});
