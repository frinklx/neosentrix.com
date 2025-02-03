// Import utilities and styles
import {
  showToast,
  showLoading,
  hideLoading,
  validateEmail,
  validatePassword,
} from "../../shared/utils/ui.js";
import { redirectTo } from "../../shared/utils/routes.js";
import { auth, firestore } from "../../shared/utils/firebase-config.js";

// DOM Elements
const form = document.getElementById("signupForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const agreeTermsCheckbox = document.getElementById("agreeTerms");
const googleButton = document.querySelector(".google-btn");
const githubButton = document.querySelector(".github-btn");
const togglePasswordButton = document.querySelector(".toggle-password");

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  setupFormListeners();
  setupOAuthListeners();
  setupPasswordToggle();
  initializeUI();
});

function initializeUI() {
  // Add loaded class to body
  document.body.classList.add("loaded");

  // Initialize password strength meter
  if (passwordInput) {
    updatePasswordStrength();
  }
}

function setupFormListeners() {
  form.addEventListener("submit", handleSignup);
  passwordInput.addEventListener("input", updatePasswordStrength);
}

function setupOAuthListeners() {
  googleButton.addEventListener("click", handleGoogleSignup);
  githubButton.addEventListener("click", handleGithubSignup);
}

function setupPasswordToggle() {
  togglePasswordButton.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePasswordButton.innerHTML = `<i class="fas fa-${
      type === "password" ? "eye" : "eye-slash"
    }"></i>`;
  });
}

async function handleGoogleSignup() {
  try {
    showLoading(
      "Connecting to Google...",
      "Please wait while we set up your account"
    );

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");

    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // Check if this is a new user
    const isNewUser = result.additionalUserInfo.isNewUser;

    await saveUserData(user, {
      provider: "google",
      isNewUser,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });

    hideLoading();
    showToast(
      isNewUser ? "Account created successfully!" : "Welcome back!",
      "success"
    );

    // Redirect based on whether user needs to complete signup
    const redirectPath = isNewUser
      ? "/auth/signup/continue.html"
      : "/dashboard";
    redirectTo(redirectPath);
  } catch (error) {
    hideLoading();
    console.error("Google signup error:", error);
    showToast(getErrorMessage(error), "error");
  }
}

async function handleGithubSignup() {
  try {
    showLoading(
      "Connecting to GitHub...",
      "Please wait while we set up your account"
    );

    const provider = new firebase.auth.GithubAuthProvider();
    provider.addScope("user");
    provider.addScope("email");

    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const isNewUser = result.additionalUserInfo.isNewUser;

    await saveUserData(user, {
      provider: "github",
      isNewUser,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    });

    hideLoading();
    showToast(
      isNewUser ? "Account created successfully!" : "Welcome back!",
      "success"
    );

    const redirectPath = isNewUser
      ? "/auth/signup/continue.html"
      : "/dashboard";
    redirectTo(redirectPath);
  } catch (error) {
    hideLoading();
    console.error("GitHub signup error:", error);
    showToast(getErrorMessage(error), "error");
  }
}

async function handleSignup(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const agreeTerms = agreeTermsCheckbox.checked;

  if (!validateForm(email, password, agreeTerms)) return;

  try {
    showLoading(
      "Creating your account...",
      "Please wait while we set up your workspace"
    );

    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );
    const user = userCredential.user;

    await saveUserData(user, {
      provider: "password",
      isNewUser: true,
      email: user.email,
    });

    hideLoading();
    showToast("Account created successfully!", "success");
    redirectTo("/auth/signup/continue.html");
  } catch (error) {
    hideLoading();
    console.error("Email signup error:", error);
    showToast(getErrorMessage(error), "error");
  }
}

function validateForm(email, password, agreeTerms) {
  if (!email || !validateEmail(email)) {
    showToast("Please enter a valid email address", "error");
    emailInput.focus();
    return false;
  }

  const passwordStrength = validatePassword(password);
  const passedCriteria = Object.values(passwordStrength).filter(Boolean).length;

  if (passedCriteria < 3) {
    showToast("Please create a stronger password", "error");
    passwordInput.focus();
    return false;
  }

  if (!agreeTerms) {
    showToast(
      "Please agree to the Terms of Service and Privacy Policy",
      "error"
    );
    agreeTermsCheckbox.focus();
    return false;
  }

  return true;
}

async function saveUserData(user, additionalData = {}) {
  const userData = {
    email: user.email,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    provider: additionalData.provider,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    hasCompletedSignup: false,
    isOnboardingComplete: false,
    ...additionalData,
  };

  await firestore
    .collection("users")
    .doc(user.uid)
    .set(userData, { merge: true });
}

function updatePasswordStrength() {
  const password = passwordInput.value;
  const strength = validatePassword(password);
  const strengthMeter = document.querySelector(".strength-meter");
  const strengthText = document.querySelector(".strength-text");

  const passedCriteria = Object.values(strength).filter(Boolean).length;
  const percentage = (passedCriteria / 5) * 100;

  strengthMeter.style.width = `${percentage}%`;
  strengthMeter.style.background =
    percentage <= 40
      ? "var(--error-color)"
      : percentage <= 60
      ? "var(--warning-color)"
      : "var(--success-color)";

  strengthText.textContent =
    percentage <= 40
      ? "Weak"
      : percentage <= 60
      ? "Moderate"
      : percentage <= 80
      ? "Strong"
      : "Very Strong";
}

function getErrorMessage(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please contact support.";
    case "auth/weak-password":
      return "Please choose a stronger password.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Please try again.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked. Please allow popups for this site.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email but with a different sign-in method.";
    default:
      return error.message || "An error occurred. Please try again.";
  }
}
