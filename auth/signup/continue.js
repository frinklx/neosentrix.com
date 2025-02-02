import { initializeComponents } from "../../shared/components/loading";
import { redirectTo } from "../../shared/utils/routes";
import { showToast } from "../../shared/utils/ui";
import { saveUserData } from "../index";

let auth;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Continue Signup] DOM Content Loaded - Initializing components");
  initializeComponents();
  initializeAuth();
  setupFormListeners();
});

function initializeAuth() {
  console.log("[Continue Signup] Initializing Firebase Auth");
  try {
    auth = firebase.auth();
    auth.onAuthStateChanged(handleAuthStateChange);
    console.log("[Continue Signup] Firebase Auth initialized successfully");
  } catch (error) {
    console.error("[Continue Signup] Error initializing Firebase Auth:", error);
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

  // Validate form
  if (!validateForm(username, password, confirmPassword)) {
    return;
  }

  try {
    console.log("[Continue Signup] Updating user profile");
    // Update display name if changed
    if (username !== currentUser.displayName) {
      await currentUser.updateProfile({ displayName: username });
    }

    // Save additional user data
    const userData = {
      displayName: username,
      email: currentUser.email,
      photoURL: currentUser.photoURL || null,
      provider: currentUser.providerData[0].providerId,
      hasCompletedSignup: true,
    };

    console.log("[Continue Signup] Saving user data:", userData);
    await saveUserData(currentUser.uid, userData);

    // Link password to account if not already linked
    if (!currentUser.providerData.some((p) => p.providerId === "password")) {
      console.log("[Continue Signup] Linking password to account");
      const credential = firebase.auth.EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await currentUser.linkWithCredential(credential);
    }

    console.log("[Continue Signup] Setup completed successfully");
    showToast("Account setup completed!", "success");
    redirectTo("/dashboard/");
  } catch (error) {
    console.error("[Continue Signup] Error during setup:", error);
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
