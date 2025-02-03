// Import Firebase SDKs
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

console.log("[Auth] Initializing signup page...");

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
  console.log("[Auth] Setting up event listeners...");
  setupFormListeners();
  setupOAuthListeners();
  setupPasswordToggle();
  initializeUI();
  console.log("[Auth] Event listeners setup complete");
});

function initializeUI() {
  console.log("[UI] Initializing UI components...");
  document.body.classList.add("loaded");

  if (passwordInput) {
    updatePasswordStrength();
  }
  console.log("[UI] UI initialization complete");
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
    console.log("[UI] Password visibility toggled");
  });
}

async function handleGoogleSignup() {
  console.log("[Auth] Starting Google signup process...");
  try {
    showLoading(
      "Connecting to Google...",
      "Please wait while we set up your account"
    );

    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");

    console.log("[Auth] Initiating Google sign-in popup...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const isNewUser = result.additionalUserInfo.isNewUser;
    console.log("[Auth] Google auth result:", { isNewUser, email: user.email });

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

    const redirectPath = isNewUser
      ? "/auth/signup/continue.html"
      : "/dashboard";
    console.log("[Auth] Redirecting to:", redirectPath);
    redirectTo(redirectPath);
  } catch (error) {
    console.error("[Auth] Google signup error:", error);
    hideLoading();
    showToast(getErrorMessage(error), "error");
  }
}

async function handleGithubSignup() {
  console.log("[Auth] Starting GitHub signup process...");
  try {
    showLoading(
      "Connecting to GitHub...",
      "Please wait while we set up your account"
    );

    const provider = new GithubAuthProvider();
    provider.addScope("user");
    provider.addScope("email");

    console.log("[Auth] Initiating GitHub sign-in popup...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const isNewUser = result.additionalUserInfo.isNewUser;
    console.log("[Auth] GitHub auth result:", { isNewUser, email: user.email });

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
    console.log("[Auth] Redirecting to:", redirectPath);
    redirectTo(redirectPath);
  } catch (error) {
    console.error("[Auth] GitHub signup error:", error);
    hideLoading();
    showToast(getErrorMessage(error), "error");
  }
}

async function handleSignup(event) {
  event.preventDefault();
  console.log("[Auth] Starting email signup process...");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const agreeTerms = agreeTermsCheckbox.checked;

  if (!validateForm(email, password, agreeTerms)) return;

  try {
    showLoading(
      "Creating your account...",
      "Please wait while we set up your workspace"
    );

    console.log("[Auth] Creating user account...");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("[Auth] User account created:", { email: user.email });

    await saveUserData(user, {
      provider: "password",
      isNewUser: true,
      email: user.email,
    });

    hideLoading();
    showToast("Account created successfully!", "success");
    console.log("[Auth] Redirecting to continue page...");
    redirectTo("/auth/signup/continue.html");
  } catch (error) {
    console.error("[Auth] Email signup error:", error);
    hideLoading();
    showToast(getErrorMessage(error), "error");
  }
}

function validateForm(email, password, agreeTerms) {
  console.log("[Validation] Validating form data...");

  if (!email || !validateEmail(email)) {
    console.log("[Validation] Invalid email");
    showToast("Please enter a valid email address", "error");
    emailInput.focus();
    return false;
  }

  const passwordStrength = validatePassword(password);
  const passedCriteria = Object.values(passwordStrength).filter(Boolean).length;

  if (passedCriteria < 3) {
    console.log("[Validation] Weak password");
    showToast("Please create a stronger password", "error");
    passwordInput.focus();
    return false;
  }

  if (!agreeTerms) {
    console.log("[Validation] Terms not accepted");
    showToast(
      "Please agree to the Terms of Service and Privacy Policy",
      "error"
    );
    agreeTermsCheckbox.focus();
    return false;
  }

  console.log("[Validation] Form validation passed");
  return true;
}

async function saveUserData(user, additionalData = {}) {
  console.log("[Database] Saving user data...");
  const userData = {
    email: user.email,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    provider: additionalData.provider,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    hasCompletedSignup: false,
    isOnboardingComplete: false,
    ...additionalData,
  };

  try {
    await firestore
      .collection("users")
      .doc(user.uid)
      .set(userData, { merge: true });
    console.log("[Database] User data saved successfully");
  } catch (error) {
    console.error("[Database] Error saving user data:", error);
    throw error;
  }
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

  console.log("[UI] Password strength updated:", {
    strength: strengthText.textContent,
    criteria: passedCriteria,
  });
}

function getErrorMessage(error) {
  console.log("[Error] Processing error:", error);
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
