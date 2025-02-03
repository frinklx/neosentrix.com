// Initialize Firebase and get references
let auth;
let firestore;

function initializeFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  firestore = firebase.firestore();
}

// Initialize Firebase when the page loads
document.addEventListener("DOMContentLoaded", () => {
  initializeFirebase();
  initializeUI();
});

// Get DOM elements
function getElements() {
  return {
    loginForm: document.getElementById("loginForm"),
    emailInput: document.getElementById("email"),
    passwordInput: document.getElementById("password"),
    rememberMeCheckbox: document.getElementById("remember"),
    togglePasswordBtn: document.querySelector(".toggle-password"),
    googleSignInBtn: document.querySelector(".social-btn.google"),
    githubSignInBtn: document.querySelector(".social-btn.github"),
    toastContainer: document.querySelector(".toast-container"),
  };
}

// Toast notification function
function showToast(message, type = "success") {
  const toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${
      type === "success" ? "check-circle" : "exclamation-circle"
    }"></i>
    ${message}
  `;
  toastContainer.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function initializeUI() {
  const elements = getElements();
  if (!elements.loginForm) return;

  // Toggle password visibility
  if (elements.togglePasswordBtn && elements.passwordInput) {
    elements.togglePasswordBtn.addEventListener("click", () => {
      const type =
        elements.passwordInput.type === "password" ? "text" : "password";
      elements.passwordInput.type = type;
      elements.togglePasswordBtn.innerHTML = `<i class="fas fa-${
        type === "password" ? "eye" : "eye-slash"
      }"></i>`;
    });
  }

  // Email/Password Sign In
  elements.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = elements.emailInput?.value || "";
    const password = elements.passwordInput?.value || "";
    const rememberMe = elements.rememberMeCheckbox?.checked || false;

    try {
      const persistence = rememberMe
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.SESSION;

      await auth.setPersistence(persistence);
      await auth.signInWithEmailAndPassword(email, password);

      showToast("Successfully signed in!");
      window.location.href =
        "/redirect/index.html?to=/dashboard&message=Welcome back!&submessage=Preparing your dashboard...";
    } catch (error) {
      console.error("Error:", error);
      showToast(error.message, "error");
    }
  });

  // Google Sign In
  if (elements.googleSignInBtn) {
    elements.googleSignInBtn.addEventListener("click", async () => {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);

        // After successful Google sign in, check if user exists in Firestore
        const userDoc = await firestore
          .collection("users")
          .doc(result.user.uid)
          .get();

        if (!userDoc.exists) {
          window.location.href =
            "/redirect/index.html?to=/auth/signup/continue.html&message=Complete your profile&submessage=Setting up your account...";
        } else {
          const userData = userDoc.data();
          if (!userData.isOnboardingComplete) {
            window.location.href =
              "/redirect/index.html?to=/onboarding&message=Complete onboarding&submessage=Setting up your workspace...";
          } else {
            window.location.href =
              "/redirect/index.html?to=/dashboard&message=Welcome back!&submessage=Preparing your dashboard...";
          }
        }
      } catch (error) {
        console.error("Error:", error);
        showToast(error.message, "error");
      }
    });
  }

  // GitHub Sign In
  if (elements.githubSignInBtn) {
    elements.githubSignInBtn.addEventListener("click", async () => {
      try {
        const provider = new firebase.auth.GithubAuthProvider();
        const result = await auth.signInWithPopup(provider);

        const userDoc = await firestore
          .collection("users")
          .doc(result.user.uid)
          .get();

        if (!userDoc.exists) {
          window.location.href =
            "/redirect/index.html?to=/auth/signup/continue.html&message=Complete your profile&submessage=Setting up your account...";
        } else {
          const userData = userDoc.data();
          if (!userData.isOnboardingComplete) {
            window.location.href =
              "/redirect/index.html?to=/onboarding&message=Complete onboarding&submessage=Setting up your workspace...";
          } else {
            window.location.href =
              "/redirect/index.html?to=/dashboard&message=Welcome back!&submessage=Preparing your dashboard...";
          }
        }
      } catch (error) {
        console.error("Error:", error);
        showToast(error.message, "error");
      }
    });
  }

  // Add loading animation to buttons when clicked
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    if (!button.classList.contains("toggle-password")) {
      button.addEventListener("click", () => {
        button.style.opacity = "0.7";
        button.style.pointerEvents = "none";

        // Reset button state after 2 seconds if no redirect happens
        setTimeout(() => {
          button.style.opacity = "1";
          button.style.pointerEvents = "auto";
        }, 2000);
      });
    }
  });

  // Enhance form validation
  if (elements.emailInput) {
    elements.emailInput.addEventListener("input", () => {
      const isValid = elements.emailInput.checkValidity();
      elements.emailInput.style.borderColor = isValid
        ? "var(--glass-border)"
        : "#ff4444";
    });
  }

  if (elements.passwordInput) {
    elements.passwordInput.addEventListener("input", () => {
      const isValid = elements.passwordInput.value.length >= 6;
      elements.passwordInput.style.borderColor = isValid
        ? "var(--glass-border)"
        : "#ff4444";
    });
  }

  // Add smooth transitions when focusing inputs
  const inputs = document.querySelectorAll("input");
  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      input.parentElement.style.transform = "scale(1.02)";
    });

    input.addEventListener("blur", () => {
      input.parentElement.style.transform = "scale(1)";
    });
  });
}

// Check if user is already signed in
auth?.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const userDoc = await firestore.collection("users").doc(user.uid).get();

      if (!userDoc.exists) {
        window.location.href =
          "/redirect/index.html?to=/auth/signup/continue.html&message=Complete your profile&submessage=Setting up your account...";
      } else {
        const userData = userDoc.data();
        if (!userData.isOnboardingComplete) {
          window.location.href =
            "/redirect/index.html?to=/onboarding&message=Complete onboarding&submessage=Setting up your workspace...";
        } else {
          window.location.href =
            "/redirect/index.html?to=/dashboard&message=Welcome back!&submessage=Preparing your dashboard...";
        }
      }
    } catch (error) {
      console.error("Error checking user status:", error);
      showToast("Error verifying your account", "error");
    }
  }
});
