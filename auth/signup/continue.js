// Import shared utilities
import { showToast, showLoading, hideLoading } from "../../shared/utils/ui.js";
import { redirectTo } from "../../shared/utils/routes.js";

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let auth;
let firestore;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Continue Signup] DOM Content Loaded - Initializing components");
  initializeFirebase();
  setupFormListeners();
});

async function initializeFirebase() {
  console.log("[Continue Signup] Initializing Firebase");
  try {
    const { default: firebaseConfig } = await import(
      "../../shared/utils/firebase-config.js"
    );

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);

    // Set up auth state listener
    onAuthStateChanged(auth, handleAuthStateChange);
    console.log("[Continue Signup] Firebase initialized successfully");
  } catch (error) {
    console.error("[Continue Signup] Error initializing Firebase:", error);
    showToast("Error initializing authentication", "error");
  }
}

function handleAuthStateChange(user) {
  console.log(
    "[Continue Signup] Auth state changed:",
    user ? "User present" : "No user"
  );

  if (!user) {
    console.log("[Continue Signup] No user found - redirecting to signup");
    redirectTo("/auth/signup/");
    return;
  }

  currentUser = user;
  console.log("[Continue Signup] Current user:", {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  });

  // Pre-fill email if available
  const emailInput = document.getElementById("email");
  if (emailInput && user.email) {
    console.log("[Continue Signup] Pre-filling email:", user.email);
    emailInput.value = user.email;
    emailInput.disabled = true;
  }

  // Pre-fill name if available
  const nameInput = document.getElementById("username");
  if (nameInput && user.displayName) {
    console.log("[Continue Signup] Pre-filling name:", user.displayName);
    nameInput.value = user.displayName;
  }
}

function setupFormListeners() {
  console.log("[Continue Signup] Setting up form listeners");
  const form = document.getElementById("continueSignupForm");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  if (form) {
    form.addEventListener("submit", handleFormSubmit);
    console.log("[Continue Signup] Form submit listener added");
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", () => {
      console.log("[Continue Signup] Checking password strength");
      checkPasswordStrength(passwordInput.value);
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", () => {
      console.log("[Continue Signup] Validating password match");
      validatePasswordMatch(passwordInput.value, confirmPasswordInput.value);
    });
  }
}

function checkPasswordStrength(password) {
  const strengthMeter = document.querySelector(".strength-meter");
  const strengthText = document.querySelector(".strength-text");

  if (!strengthMeter || !strengthText) return;

  // Password strength criteria
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const strength = Object.values(criteria).filter(Boolean).length;
  console.log("[Continue Signup] Password strength:", strength);

  // Update strength meter
  strengthMeter.style.width = `${(strength / 5) * 100}%`;
  strengthMeter.style.backgroundColor =
    strength <= 2
      ? "var(--error-color)"
      : strength <= 3
      ? "var(--warning-color)"
      : "var(--success-color)";

  // Update strength text
  strengthText.textContent =
    strength <= 2
      ? "Weak"
      : strength <= 3
      ? "Moderate"
      : strength <= 4
      ? "Strong"
      : "Very Strong";
}

function validatePasswordMatch(password, confirmPassword) {
  const confirmInput = document.getElementById("confirmPassword");
  if (!confirmInput) return;

  const matches = password === confirmPassword;
  console.log("[Continue Signup] Passwords match:", matches);

  confirmInput.setCustomValidity(matches ? "" : "Passwords do not match");
}

async function handleFormSubmit(event) {
  event.preventDefault();
  console.log("[Continue Signup] Form submission started");

  if (!currentUser) {
    console.error("[Continue Signup] No current user found");
    showToast("Please sign in again", "error");
    redirectTo("/auth/signup/");
    return;
  }

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const phone = document.getElementById("phone").value;
  const agreeTerms = document.getElementById("agreeTerms").checked;

  // Validate form
  if (!validateForm(username, password, confirmPassword)) {
    return;
  }

  if (!agreeTerms) {
    showToast(
      "Please agree to the Terms of Service and Privacy Policy",
      "error"
    );
    return;
  }

  try {
    showLoading(
      "Setting up your account...",
      "Please wait while we save your information"
    );
    console.log("[Continue Signup] Updating user profile");

    // Update display name if changed
    if (username !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: username });
    }

    // Save additional user data
    const userData = {
      displayName: username,
      email: currentUser.email,
      photoURL: currentUser.photoURL || null,
      provider: currentUser.providerData[0].providerId,
      phone: phone || null,
      hasCompletedSignup: true,
      isOnboardingComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("[Continue Signup] Saving user data:", userData);
    await setDoc(doc(firestore, "users", currentUser.uid), userData, {
      merge: true,
    });

    // Link password to account if not already linked
    if (!currentUser.providerData.some((p) => p.providerId === "password")) {
      console.log("[Continue Signup] Linking password to account");
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await linkWithCredential(currentUser, credential);
    }

    console.log("[Continue Signup] Setup completed successfully");
    hideLoading();
    showToast("Account setup completed!", "success");
    window.location.href =
      "/redirect/index.html?to=/onboarding&message=Welcome to NeoSentrix!&submessage=Let's set up your workspace...";
  } catch (error) {
    console.error("[Continue Signup] Error during setup:", error);
    hideLoading();
    showToast(error.message, "error");
  }
}

function validateForm(username, password, confirmPassword) {
  console.log("[Continue Signup] Validating form");

  if (!username || username.length < 3) {
    console.log("[Continue Signup] Invalid username");
    showToast("Username must be at least 3 characters long", "error");
    return false;
  }

  if (!password || password.length < 8) {
    console.log("[Continue Signup] Invalid password length");
    showToast("Password must be at least 8 characters long", "error");
    return false;
  }

  if (password !== confirmPassword) {
    console.log("[Continue Signup] Passwords do not match");
    showToast("Passwords do not match", "error");
    return false;
  }

  console.log("[Continue Signup] Form validation passed");
  return true;
}
