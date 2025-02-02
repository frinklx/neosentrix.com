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

    await firebase.auth().setPersistence(persistence);
    const userCredential = await firebase
      .auth()
      .signInWithEmailAndPassword(email, password);

    showToast("Successfully signed in!");

    // Redirect to dashboard after successful login
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1000);
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// Google Sign In
googleSignInBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);

    showToast("Successfully signed in with Google!");

    // Redirect to dashboard after successful login
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1000);
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// GitHub Sign In
githubSignInBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);

    showToast("Successfully signed in with GitHub!");

    // Redirect to dashboard after successful login
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1000);
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// Check if user is already signed in
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // User is signed in, redirect to dashboard
    window.location.href = "/dashboard";
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
