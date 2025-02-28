// Initialize Firebase references
let auth;
let db;

// Import routes and navigation helper
import { ROUTES, navigateTo } from "../../shared/utils/routes.js";
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// UI Elements
let signupForm;
let termsContainer;
let loadingScreen;
let loadingSteps;
let googleSignUpBtn;
let githubSignUpBtn;

// Debug logging helper
function debug(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] 🔍 ${message}:`, data);
  } else {
    console.log(`[${timestamp}] 🔍 ${message}`);
  }
}

// Loading overlay management
function showLoading(message, submessage) {
  debug("Showing loading overlay", { message, submessage });
  let loadingOverlay = document.querySelector(".loading-overlay");

  // Create overlay if it doesn't exist
  if (!loadingOverlay) {
    loadingOverlay = document.createElement("div");
    loadingOverlay.className = "loading-overlay";
    document.body.appendChild(loadingOverlay);
  }

  loadingOverlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <h3>${message || "Loading..."}</h3>
      ${submessage ? `<p>${submessage}</p>` : ""}
    </div>
  `;
  loadingOverlay.style.display = "flex";
}

function hideLoading() {
  debug("Hiding loading overlay");
  const loadingOverlay = document.querySelector(".loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.style.display = "none";
  } else {
    debug("No loading overlay found to hide");
  }
}

// Error handling helper
function handleError(error, context) {
  debug(`Error in ${context}:`, error);
  console.error(`[${context}]`, error);
  hideLoading();
  showToast(error.message || "An unexpected error occurred", "error");
}

// Toast notification function
function showToast(message, type = "error") {
  debug("Showing toast", { message, type });
  let toastContainer = document.querySelector(".toast-container");

  // Create container if it doesn't exist
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

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

// Initialize Firebase
function initializeFirebase() {
  debug("Initializing Firebase...");
  try {
    auth = window.firebaseAuth;
    db = window.firebaseDb;

    if (!auth || !db) {
      throw new Error("Firebase SDK not loaded");
    }

    debug("Firebase initialized successfully");
  } catch (error) {
    handleError(error, "initializeFirebase");
    throw error;
  }
}

// Initialize Firebase and set up event listeners
document.addEventListener("DOMContentLoaded", () => {
  debug("DOM Content Loaded - Initializing components");
  initializeFirebase();
  initializeUI();
});

// Initialize UI
function initializeUI() {
  const elements = {
    signupForm: document.getElementById("signupForm"),
    firstNameInput: document.getElementById("firstName"),
    lastNameInput: document.getElementById("lastName"),
    emailInput: document.getElementById("email"),
    phoneInput: document.getElementById("phone"),
    passwordInput: document.getElementById("password"),
    agreeTermsCheckbox: document.getElementById("agreeTerms"),
    togglePasswordBtn: document.querySelector(".toggle-password"),
    strengthMeter: document.querySelector(".strength-meter"),
    strengthText: document.querySelector(".strength-text"),
    requirements: document.querySelectorAll(".requirement"),
    googleSignUpBtn: document.getElementById("googleSignup"),
    githubSignUpBtn: document.getElementById("githubSignup"),
    termsCheckbox: document.querySelector(".terms-checkbox"),
    loadingScreen: document.querySelector(".loading-screen"),
    loadingSteps: document.querySelectorAll(".loading-step"),
    signupBtn: document.querySelector(".signup-btn"),
  };

  if (!elements.signupForm) {
    debug("Form element not found");
    return;
  }

  // Initialize password toggle
  if (elements.togglePasswordBtn && elements.passwordInput) {
    elements.togglePasswordBtn.addEventListener("click", () => {
      const type =
        elements.passwordInput.type === "password" ? "text" : "password";
      elements.passwordInput.type = type;
      const icon = elements.togglePasswordBtn.querySelector("i");
      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");
    });
  }

  // Initialize password strength checker
  if (elements.passwordInput && elements.requirements) {
    elements.passwordInput.addEventListener("input", () => {
      const password = elements.passwordInput.value;
      let strength = 0;

      // Check requirements
      const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
      };

      elements.requirements.forEach((req) => {
        const type = req.dataset.requirement;
        if (checks[type]) {
          req.classList.add("met");
          strength++;
        } else {
          req.classList.remove("met");
        }
      });

      // Update strength meter if it exists
      if (elements.strengthMeter && elements.strengthText) {
        const strengthPercentage = (strength / 5) * 100;
        elements.strengthMeter.style.width = `${strengthPercentage}%`;

        if (strength < 2) {
          elements.strengthMeter.className = "strength-meter weak";
          elements.strengthText.textContent = "Weak";
        } else if (strength < 4) {
          elements.strengthMeter.className = "strength-meter medium";
          elements.strengthText.textContent = "Medium";
        } else {
          elements.strengthMeter.className = "strength-meter strong";
          elements.strengthText.textContent = "Strong";
        }
      }
    });
  }

  // Initialize terms checkbox
  if (elements.termsCheckbox) {
    elements.termsCheckbox.addEventListener("click", (e) => {
      // Only toggle if the click wasn't on a link
      if (!e.target.closest("a")) {
        const checkbox = elements.termsCheckbox.querySelector(
          "input[type='checkbox']"
        );
        checkbox.checked = !checkbox.checked;

        // Remove error state if checked
        if (checkbox.checked) {
          elements.termsCheckbox.classList.remove("error");
        }

        // Prevent the label's default behavior to avoid double-toggle
        e.preventDefault();
      }
    });
  }

  // Initialize form submission
  if (elements.signupForm) {
    elements.signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!validateForm(elements)) return;

      try {
        if (elements.signupBtn) {
          elements.signupBtn.classList.add("loading");
        }

        await showLoading(
          "Creating Your Account...",
          "Setting up your secure profile"
        );

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          elements.emailInput.value,
          elements.passwordInput.value
        );

        // Save additional user data
        await db
          .collection("users")
          .doc(userCredential.user.uid)
          .set({
            firstName: elements.firstNameInput.value,
            lastName: elements.lastNameInput.value,
            email: elements.emailInput.value,
            phone: elements.phoneInput.value || null,
            createdAt: serverTimestamp(),
          });

        showToast("Account created successfully!", "success");

        // Use navigateTo helper for redirection
        await navigateTo(
          ROUTES.ONBOARDING + "?uid=" + userCredential.user.uid,
          {
            loading: true,
            loadingMessage: "Success!",
            loadingSubmessage:
              "Taking you to personalize your learning experience",
          }
        );
      } catch (error) {
        console.error("Error:", error);
        showToast(error.message, "error");
        if (elements.signupBtn) {
          elements.signupBtn.classList.remove("loading");
        }
      }
    });
  }

  // Initialize social sign-in buttons
  if (elements.googleSignUpBtn) {
    debug("Setting up Google sign-in button");
    elements.googleSignUpBtn.addEventListener("click", async () => {
      try {
        await showLoading(
          "Connecting to Google...",
          "Please wait while we securely connect to your Google account"
        );

        const provider = new GoogleAuthProvider();
        provider.addScope("profile");
        provider.addScope("email");
        const result = await signInWithPopup(auth, provider);

        const userExists = await checkUserExists(result.user.uid);

        if (!userExists) {
          await showLoading(
            "Creating Your Account...",
            "Setting up your profile with Google information"
          );

          await db.collection("users").doc(result.user.uid).set({
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            authProvider: "google",
            hasCompletedProfile: false,
            createdAt: serverTimestamp(),
          });

          showToast("Successfully signed up with Google!");
          await navigateTo(ROUTES.CONTINUE_SIGNUP, {
            loading: true,
            loadingMessage: "Redirecting...",
            loadingSubmessage: "Taking you to complete your profile setup",
          });
        } else {
          const userDoc = await db
            .collection("users")
            .doc(result.user.uid)
            .get();

          if (userDoc.data().hasCompletedProfile) {
            showToast("Welcome back!");
            await navigateTo(ROUTES.DASHBOARD, {
              loading: true,
              loadingMessage: "Welcome Back!",
              loadingSubmessage: "Taking you to your dashboard",
            });
          } else {
            await navigateTo(ROUTES.CONTINUE_SIGNUP, {
              loading: true,
              loadingMessage: "Almost There...",
              loadingSubmessage: "Taking you to complete your profile setup",
            });
          }
        }
      } catch (error) {
        hideLoading();
        console.error("Error:", error);
        showToast(error.message, "error");
      }
    });
  }

  if (elements.githubSignUpBtn) {
    debug("Setting up GitHub sign-in button");
    elements.githubSignUpBtn.addEventListener("click", handleGithubSignIn);
  }

  // Initialize button click feedback
  const buttons = document.querySelectorAll(".primary-btn, .oauth-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      if (button.type === "submit") {
        return;
      }
      button.classList.add("clicked");
      setTimeout(() => {
        button.classList.remove("clicked");
      }, 150);
    });
  });

  debug("UI initialization complete");
  return elements;
}

// Update form state based on validation
function updateFormState(elements) {
  const { isValid } = validateForm(elements);
  const submitButton = elements.signupForm.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) {
    submitButton.disabled = !isValid;
  }
}

// Form validation function
function validateForm(elements) {
  const {
    firstNameInput,
    lastNameInput,
    emailInput,
    phoneInput,
    passwordInput,
    agreeTermsCheckbox,
  } = elements;

  // Reset previous errors
  const errorElements = document.querySelectorAll(".error");
  errorElements.forEach((el) => el.classList.remove("error"));

  let isValid = true;
  const errors = [];

  // Validate first name
  if (!firstNameInput.value.trim()) {
    firstNameInput.classList.add("error");
    errors.push("First name is required");
    isValid = false;
  }

  // Validate last name
  if (!lastNameInput.value.trim()) {
    lastNameInput.classList.add("error");
    errors.push("Last name is required");
    isValid = false;
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailInput.value.trim() || !emailRegex.test(emailInput.value)) {
    emailInput.classList.add("error");
    errors.push("Please enter a valid email address");
    isValid = false;
  }

  // Validate phone (optional)
  if (phoneInput.value.trim()) {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phoneInput.value)) {
      phoneInput.classList.add("error");
      errors.push("Please enter a valid phone number");
      isValid = false;
    }
  }

  // Validate password
  if (passwordInput.value.length < 8) {
    passwordInput.classList.add("error");
    errors.push("Password must be at least 8 characters long");
    isValid = false;
  }

  // Validate terms agreement
  if (!agreeTermsCheckbox.checked) {
    agreeTermsCheckbox.parentElement.classList.add("error");
    errors.push("You must agree to the terms and conditions");
    isValid = false;
  }

  return { isValid, errors };
}

// Handle GitHub sign-in
function handleGithubSignIn() {
  debug("Handling GitHub sign-in");
  showLoading(
    "Connecting to GitHub...",
    "Please wait while we securely connect to your GitHub account"
  );

  const provider = new GithubAuthProvider();
  provider.addScope("user");

  signInWithPopup(auth, provider)
    .then(async (result) => {
      debug("GitHub sign-in successful", result.user.email);

      const userExists = await checkUserExists(result.user.uid);
      debug("User exists check:", userExists);

      if (!userExists) {
        await handleNewGithubUser(result.user);
      } else {
        await handleExistingGithubUser(result.user);
      }
    })
    .catch((error) => {
      debug("GitHub sign-in error:", error);
      hideLoading();
      showToast(error.message, "error");
    });
}

// Handle new GitHub user
async function handleNewGithubUser(user) {
  try {
    await db
      .collection("users")
      .doc(user.uid)
      .set({
        firstName: user.displayName ? user.displayName.split(" ")[0] : "",
        lastName: user.displayName
          ? user.displayName.split(" ").slice(1).join(" ")
          : "",
        email: user.email,
        githubId: user.providerData[0].uid,
        createdAt: serverTimestamp(),
      });

    hideLoading();
    showToast("Account created successfully!", "success");

    await navigateTo(ROUTES.DASHBOARD, {
      loading: true,
      loadingMessage: "Success!",
      loadingSubmessage: "Taking you to your dashboard",
    });
  } catch (error) {
    handleError(error, "handleNewGithubUser");
  }
}

// Handle existing GitHub user
async function handleExistingGithubUser(user) {
  try {
    // Update last login
    await db.collection("users").doc(user.uid).update({
      lastLogin: serverTimestamp(),
    });

    hideLoading();
    showToast("Welcome back!", "success");

    await navigateTo(ROUTES.DASHBOARD, {
      loading: true,
      loadingMessage: "Welcome back!",
      loadingSubmessage: "Taking you to your dashboard",
    });
  } catch (error) {
    handleError(error, "handleExistingGithubUser");
  }
}

// Check if user exists in Firestore
async function checkUserExists(uid) {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    return userDoc.exists;
  } catch (error) {
    handleError(error, "checkUserExists");
    return false;
  }
}

// Check if user is already signed in
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Check if user has completed onboarding
    db.collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().onboarding) {
          // User has completed onboarding, redirect to dashboard
          navigateTo(ROUTES.DASHBOARD, {
            loading: true,
            loadingMessage: "Welcome back!",
            loadingSubmessage: "Taking you to your dashboard",
          });
        } else {
          // Redirect to onboarding
          navigateTo(ROUTES.ONBOARDING + "?uid=" + user.uid, {
            loading: true,
            loadingMessage: "Almost there!",
            loadingSubmessage: "Taking you to complete your profile",
          });
        }
      })
      .catch((error) => {
        console.error("Error checking onboarding status:", error);
        showToast("Error checking user status. Please try again.", "error");
      });
  }
});
