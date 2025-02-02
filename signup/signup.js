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
const authContainer = document.querySelector(".auth-container");
const onboardingContainer = document.querySelector(".onboarding-container");

let googleUser = null;

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

// Toggle password visibility
togglePasswordBtn.addEventListener("click", () => {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
  confirmPasswordInput.type = type;
  togglePasswordBtn.innerHTML = `<i class="fas fa-${
    type === "password" ? "eye" : "eye-slash"
  }"></i>`;
});

// Password strength check on input
passwordInput.addEventListener("input", () => {
  checkPasswordStrength(passwordInput.value);
});

// Form validation
function validateForm() {
  if (!googleUser && passwordInput.value !== confirmPasswordInput.value) {
    showToast("Passwords do not match", "error");
    return false;
  }

  if (!googleUser && !checkPasswordStrength(passwordInput.value)) {
    showToast("Please choose a stronger password", "error");
    return false;
  }

  if (!agreeTermsCheckbox.checked) {
    showToast(
      "Please agree to the Terms of Service and Privacy Policy",
      "error"
    );
    return false;
  }

  return true;
}

// Save user data to Firestore
async function saveUserData(userId, userData) {
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

// Save onboarding data to Firestore
async function saveOnboardingData(userId, onboardingData) {
  try {
    await firebase.firestore().collection("users").doc(userId).update({
      onboarding: onboardingData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    throw error;
  }
}

// Handle onboarding form submission
async function handleOnboarding(userId) {
  const onboardingForm = document.getElementById("onboardingForm");

  onboardingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const learningGoals = Array.from(
      document.querySelectorAll('input[name="learningGoals"]:checked')
    ).map((cb) => cb.value);
    const experienceLevel = document.querySelector(
      'input[name="experienceLevel"]:checked'
    ).value;
    const timeCommitment = document.querySelector(
      'input[name="timeCommitment"]:checked'
    ).value;
    const interests = Array.from(
      document.querySelectorAll('input[name="interests"]:checked')
    ).map((cb) => cb.value);

    try {
      await saveOnboardingData(userId, {
        learningGoals,
        experienceLevel,
        timeCommitment,
        interests,
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      showToast("Onboarding completed successfully!");

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error) {
      console.error("Error during onboarding:", error);
      showToast(error.message, "error");
    }
  });
}

// Show onboarding form
function showOnboarding(userId) {
  authContainer.style.display = "none";
  onboardingContainer.style.display = "block";
  handleOnboarding(userId);
}

// Show loading screen
function showLoading() {
  const loadingScreen = document.querySelector(".loading-screen");
  loadingScreen.style.display = "flex";
  return new Promise((resolve) => setTimeout(resolve, 3000));
}

// Check if user exists in Firestore
async function checkUserExists(userId) {
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

// Google Sign Up
googleSignUpBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);

    const userExists = await checkUserExists(result.user.uid);

    if (!userExists) {
      // New user - save initial data and redirect to continue page
      await saveUserData(result.user.uid, {
        email: result.user.email,
        displayName: result.user.displayName,
        authProvider: "google",
        hasCompletedProfile: false,
      });

      showToast("Successfully signed up with Google!");
      await showLoading();
      window.location.href = "/signup/continue.html";
    } else {
      // Existing user - check if profile is complete
      const userDoc = await firebase
        .firestore()
        .collection("users")
        .doc(result.user.uid)
        .get();

      if (userDoc.data().hasCompletedProfile) {
        showToast("Welcome back!");
        await showLoading();
        window.location.href = "/dashboard";
      } else {
        await showLoading();
        window.location.href = "/signup/continue.html";
      }
    }
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// Email/Password Sign Up
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  try {
    let userCredential = await firebase
      .auth()
      .createUserWithEmailAndPassword(emailInput.value, passwordInput.value);

    // Update user profile
    await userCredential.user.updateProfile({
      displayName: `${firstNameInput.value} ${lastNameInput.value}`,
    });

    // Save user data to Firestore
    await saveUserData(userCredential.user.uid, {
      firstName: firstNameInput.value,
      lastName: lastNameInput.value,
      email: userCredential.user.email,
      displayName: `${firstNameInput.value} ${lastNameInput.value}`,
      authProvider: "email",
      hasCompletedProfile: true,
    });

    showToast("Account created successfully!");

    // Show loading screen before redirecting to onboarding
    await showLoading();
    window.location.href = "/onboarding";
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// GitHub Sign Up
githubSignUpBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);

    showToast("Successfully signed up with GitHub!");

    // Save user data
    await saveUserData(result.user.uid, {
      displayName: result.user.displayName,
      email: result.user.email,
      authProvider: "github",
    });

    // Show onboarding
    showOnboarding(result.user.uid);
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
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

// Enhance form validation with real-time feedback
const inputs = document.querySelectorAll("input");
inputs.forEach((input) => {
  input.addEventListener("input", () => {
    const isValid = input.checkValidity();
    input.style.borderColor = isValid ? "var(--glass-border)" : "#ff4444";
  });

  // Add smooth transitions when focusing inputs
  input.addEventListener("focus", () => {
    input.parentElement.style.transform = "scale(1.02)";
  });

  input.addEventListener("blur", () => {
    input.parentElement.style.transform = "scale(1)";
  });
});

// Check if user is already signed in
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // Check if user has completed onboarding
    firebase
      .firestore()
      .collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().onboarding) {
          // User has completed onboarding, redirect to dashboard
          window.location.href = "/dashboard";
        } else {
          // Show onboarding
          showOnboarding(user.uid);
        }
      })
      .catch((error) => {
        console.error("Error checking onboarding status:", error);
      });
  }
});
