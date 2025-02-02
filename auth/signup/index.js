// Import shared utilities and styles
import "../../shared/styles/variables.css";
import "./styles.css";
import { showToast, showLoading, hideLoading } from "../../shared/utils/ui";
import { ROUTES, navigateTo } from "../../shared/utils/routes";
import { initializeComponents } from "../../shared/components/loading";
import { checkUserExists, saveUserData } from "../index";

// Get DOM elements
const signupForm = document.getElementById("signupForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const agreeTermsCheckbox = document.getElementById("agreeTerms");
const togglePasswordBtn = document.querySelector(".toggle-password");
const googleSignUpBtn = document.getElementById("googleSignUp");
const githubSignUpBtn = document.getElementById("githubSignUp");
const strengthMeter = document.querySelector(".strength-meter");
const strengthText = document.querySelector(".strength-text");

let googleUser = null;

// Password strength checker
function checkPasswordStrength(password) {
  let strength = 0;
  const patterns = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  // Calculate strength
  strength += patterns.length ? 1 : 0;
  strength += patterns.lowercase && patterns.uppercase ? 1 : 0;
  strength += patterns.numbers ? 1 : 0;
  strength += patterns.special ? 1 : 0;

  // Update UI
  strengthMeter.className = "strength-meter";
  strengthText.textContent = "";

  if (password.length === 0) {
    strengthText.textContent = "";
  } else if (strength < 2) {
    strengthMeter.classList.add("weak");
    strengthText.textContent = "Weak password";
    strengthText.style.color = "#ff4444";
  } else if (strength < 3) {
    strengthMeter.classList.add("medium");
    strengthText.textContent = "Medium password";
    strengthText.style.color = "#ffbb33";
  } else {
    strengthMeter.classList.add("strong");
    strengthText.textContent = "Strong password";
    strengthText.style.color = "var(--success-color)";
  }

  return strength >= 3;
}

// Enhanced form validation
function validateForm() {
  let isValid = true;
  const errors = [];

  // Password validation
  if (!googleUser) {
    if (passwordInput.value !== confirmPasswordInput.value) {
      errors.push("Passwords do not match");
      isValid = false;
      passwordInput.style.borderColor = "#ff4444";
      confirmPasswordInput.style.borderColor = "#ff4444";
    }

    if (!checkPasswordStrength(passwordInput.value)) {
      errors.push("Please choose a stronger password");
      isValid = false;
      passwordInput.style.borderColor = "#ff4444";
    }
  }

  // Terms agreement validation
  if (!agreeTermsCheckbox.checked) {
    errors.push("Please agree to the Terms of Service and Privacy Policy");
    isValid = false;
    agreeTermsCheckbox.parentElement.style.color = "#ff4444";
  }

  // Show all validation errors
  if (!isValid) {
    errors.forEach((error) => showToast(error, "error"));
  }

  return isValid;
}

// Initialize UI interactions
function initializeUI() {
  initializeComponents();
  setupPasswordToggle();
  setupFormValidation();
  setupTermsCheckbox();
}

// Setup password toggle
function setupPasswordToggle() {
  const toggleBtns = document.querySelectorAll(".toggle-password");
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const input = btn.previousElementSibling;
      const type = input.type === "password" ? "text" : "password";
      input.type = type;
      btn.innerHTML = `<i class="fas fa-${
        type === "password" ? "eye" : "eye-slash"
      }"></i>`;
    });
  });

  passwordInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (input.id === "password") {
        checkPasswordStrength(input.value);
      }
    });
  });
}

// Setup form validation
function setupFormValidation() {
  const inputs = document.querySelectorAll("input");

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const isValid = input.checkValidity();
      input.style.borderColor = isValid ? "var(--glass-border)" : "#ff4444";

      if (input.id === "confirmPassword") {
        const isMatch = input.value === passwordInput.value;
        input.style.borderColor = isMatch ? "var(--glass-border)" : "#ff4444";
      }
    });

    input.addEventListener("focus", () => {
      input.parentElement.classList.add("focused");
    });

    input.addEventListener("blur", () => {
      input.parentElement.classList.remove("focused");
      const isValid = input.checkValidity();
      input.style.borderColor = isValid ? "var(--glass-border)" : "#ff4444";
    });
  });
}

// Setup terms checkbox
function setupTermsCheckbox() {
  const termsCheckbox = document.getElementById("agreeTerms");
  const termsLabel = termsCheckbox.parentElement;

  termsCheckbox.addEventListener("change", () => {
    termsLabel.style.color = termsCheckbox.checked
      ? "var(--gray-text)"
      : "#ff4444";
  });

  termsLabel.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") {
      termsCheckbox.click();
    }
  });
}

// Event Listeners
document.addEventListener("DOMContentLoaded", initializeUI);

// Google Sign Up
googleSignUpBtn.addEventListener("click", async () => {
  try {
    await showLoading(
      "Connecting to Google...",
      "Please wait while we securely connect to your Google account"
    );

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    const result = await firebase.auth().signInWithPopup(provider);

    const userExists = await checkUserExists(result.user.uid);

    if (!userExists) {
      await showLoading(
        "Creating Your Account...",
        "Setting up your profile with Google information"
      );

      await saveUserData(result.user.uid, {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        authProvider: "google",
        hasCompletedProfile: false,
      });

      showToast("Successfully signed up with Google!");
      await navigateTo(ROUTES.CONTINUE_SIGNUP);
    } else {
      const userDoc = await firebase
        .firestore()
        .collection("users")
        .doc(result.user.uid)
        .get();

      if (userDoc.data().hasCompletedProfile) {
        showToast("Welcome back!");
        await navigateTo(ROUTES.DASHBOARD);
      } else {
        await navigateTo(ROUTES.CONTINUE_SIGNUP);
      }
    }
  } catch (error) {
    hideLoading();
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// Email/Password Sign Up
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  try {
    await showLoading(
      "Creating Your Account...",
      "Setting up your secure profile"
    );

    const userCredential = await firebase
      .auth()
      .createUserWithEmailAndPassword(emailInput.value, passwordInput.value);

    await showLoading(
      "Saving Your Information...",
      "Securely storing your profile details"
    );

    // Update user profile
    await userCredential.user.updateProfile({
      displayName: `${firstNameInput.value} ${lastNameInput.value}`,
    });

    // Save user data
    await saveUserData(userCredential.user.uid, {
      firstName: firstNameInput.value,
      lastName: lastNameInput.value,
      email: userCredential.user.email,
      displayName: `${firstNameInput.value} ${lastNameInput.value}`,
      authProvider: "email",
      hasCompletedProfile: true,
    });

    showToast("Account created successfully!");
    await navigateTo(ROUTES.ONBOARDING);
  } catch (error) {
    hideLoading();
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});
