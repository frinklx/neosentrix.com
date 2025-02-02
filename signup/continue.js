// Get DOM elements
const continueSignupForm = document.getElementById("continueSignupForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const phoneInput = document.getElementById("phone");
const agreeTermsCheckbox = document.getElementById("agreeTerms");
const togglePasswordBtn = document.querySelector(".toggle-password");
const strengthMeter = document.querySelector(".strength-meter");
const strengthText = document.querySelector(".strength-text");
const loadingScreen = document.querySelector(".loading-screen");

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

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Show loading screen
function showLoading() {
  loadingScreen.style.display = "flex";
  return new Promise((resolve) => setTimeout(resolve, 3000));
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

  strength += patterns.length ? 1 : 0;
  strength += patterns.lowercase && patterns.uppercase ? 1 : 0;
  strength += patterns.numbers ? 1 : 0;
  strength += patterns.special ? 1 : 0;

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

// Check if username is available
async function isUsernameAvailable(username) {
  try {
    const usernameDoc = await firebase
      .firestore()
      .collection("usernames")
      .doc(username.toLowerCase())
      .get();
    return !usernameDoc.exists;
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
}

// Form validation
async function validateForm() {
  if (passwordInput.value !== confirmPasswordInput.value) {
    showToast("Passwords do not match", "error");
    return false;
  }

  if (!checkPasswordStrength(passwordInput.value)) {
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

  const username = usernameInput.value.trim();
  if (!(await isUsernameAvailable(username))) {
    showToast("Username is already taken", "error");
    return false;
  }

  return true;
}

// Save username to Firestore
async function saveUsername(username, userId) {
  try {
    await firebase
      .firestore()
      .collection("usernames")
      .doc(username.toLowerCase())
      .set({
        userId: userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("Error saving username:", error);
    throw error;
  }
}

// Update user profile in Firestore
async function updateUserProfile(userId, userData) {
  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(userId)
      .update({
        ...userData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// Handle form submission
continueSignupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!(await validateForm())) return;

  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      showToast("Please sign in first", "error");
      return;
    }

    const username = usernameInput.value.trim();
    const phone = phoneInput.value.trim();

    // Save username
    await saveUsername(username, user.uid);

    // Update user profile
    await updateUserProfile(user.uid, {
      username: username,
      phone: phone,
      hasCompletedProfile: true,
    });

    // Update password if provided
    if (passwordInput.value) {
      await user.updatePassword(passwordInput.value);
    }

    showToast("Profile completed successfully!");

    // Show loading screen and redirect
    await showLoading();
    window.location.href = "/onboarding";
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// Check if user is signed in and hasn't completed profile
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  try {
    const userDoc = await firebase
      .firestore()
      .collection("users")
      .doc(user.uid)
      .get();

    if (userDoc.exists && userDoc.data().hasCompletedProfile) {
      window.location.href = "/dashboard";
    }
  } catch (error) {
    console.error("Error checking user profile:", error);
    showToast(error.message, "error");
  }
});
