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
});

// Get DOM elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMeCheckbox = document.getElementById("rememberMe");
const togglePasswordBtn = document.querySelector(".toggle-password");
const googleSignInBtn = document.getElementById("googleSignIn");
const githubSignInBtn = document.getElementById("githubSignIn");

// Toast notification function
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${
      type === "success" ? "check-circle" : "exclamation-circle"
    }"></i>
    ${message}
  `;
  document.querySelector(".toast-container").appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Toggle password visibility
togglePasswordBtn.addEventListener("click", () => {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
  togglePasswordBtn.innerHTML = `<i class="fas fa-${
    type === "password" ? "eye" : "eye-slash"
  }"></i>`;
});

// Email/Password Sign In
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const password = passwordInput.value;
  const rememberMe = rememberMeCheckbox.checked;

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
googleSignInBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);

    // After successful Google sign in, check if user exists in Firestore
    const userDoc = await firestore
      .collection("users")
      .doc(result.user.uid)
      .get();

    if (!userDoc.exists) {
      // New user - redirect to continue signup
      window.location.href =
        "/redirect/index.html?to=/auth/signup/continue.html&message=Complete your profile&submessage=Setting up your account...";
    } else {
      const userData = userDoc.data();
      if (!userData.isOnboardingComplete) {
        // Existing user but onboarding not complete
        window.location.href =
          "/redirect/index.html?to=/onboarding&message=Complete onboarding&submessage=Setting up your workspace...";
      } else {
        // Fully registered user - redirect to dashboard
        window.location.href =
          "/redirect/index.html?to=/dashboard&message=Welcome back!&submessage=Preparing your dashboard...";
      }
    }
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
    // Reset button state
    googleSignInBtn.style.opacity = "1";
    googleSignInBtn.style.pointerEvents = "auto";
  }
});

// GitHub Sign In
githubSignInBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    const result = await auth.signInWithPopup(provider);

    // After successful GitHub sign in, check if user exists in Firestore
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
    // Reset button state
    githubSignInBtn.style.opacity = "1";
    githubSignInBtn.style.pointerEvents = "auto";
  }
});

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

// Add loading animation to buttons when clicked
const buttons = document.querySelectorAll("button");
buttons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!button.classList.contains("toggle-password")) {
      button.style.opacity = "0.7";
      button.style.pointerEvents = "none";

      // Reset button state after 2 seconds if no redirect happens
      setTimeout(() => {
        button.style.opacity = "1";
        button.style.pointerEvents = "auto";
      }, 2000);
    }
  });
});

// Enhance form validation
emailInput.addEventListener("input", () => {
  const isValid = emailInput.checkValidity();
  emailInput.style.borderColor = isValid ? "var(--glass-border)" : "#ff4444";
});

passwordInput.addEventListener("input", () => {
  const isValid = passwordInput.value.length >= 6;
  passwordInput.style.borderColor = isValid ? "var(--glass-border)" : "#ff4444";
});

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
