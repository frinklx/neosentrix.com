// Initialize Firebase references
let auth;
let db;

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
function showToast(message, type = "success") {
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

// Form submission handler
function setupFormSubmission(form, elements) {
  if (!form) {
    debug("Form element not found");
    return;
  }

  debug("Setting up form submission handler");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    debug("Form submission started");

    try {
      if (!validateForm(elements)) {
        debug("Form validation failed");
        return;
      }

      const formData = {
        email: elements.emailInput.value.trim(),
        password: elements.passwordInput.value,
        firstName: elements.firstNameInput.value.trim(),
        lastName: elements.lastNameInput.value.trim(),
        phone: elements.phoneInput.value.trim() || null,
      };

      debug("Form data collected", { ...formData, password: "***" });

      await showLoading(
        "Creating your account...",
        "Please wait while we set up your secure profile"
      );

      // Create user account
      debug("Creating Firebase user account");
      const userCredential = await auth.createUserWithEmailAndPassword(
        formData.email,
        formData.password
      );

      debug("User account created successfully", userCredential.user.uid);

      // Update user profile
      debug("Updating user profile");
      await userCredential.user.updateProfile({
        displayName: `${formData.firstName} ${formData.lastName}`,
      });

      // Save user data to Firestore
      debug("Saving user data to Firestore");
      await saveUserData(userCredential.user.uid, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        displayName: `${formData.firstName} ${formData.lastName}`,
        authProvider: "email",
        hasCompletedProfile: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      debug("Account creation successful");
      showToast("Account created successfully!");

      // Redirect to continue page
      debug("Redirecting to continue page");
      window.location.href = ROUTES.CONTINUE_SIGNUP;
    } catch (error) {
      handleError(error, "formSubmission");

      // Provide user-friendly error messages
      let errorMessage = "An error occurred while creating your account";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage =
            "This email is already registered. Please try logging in instead.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/weak-password":
          errorMessage = "Please choose a stronger password.";
          break;
        case "auth/network-request-failed":
          errorMessage =
            "Network error. Please check your internet connection.";
          break;
      }
      showToast(errorMessage, "error");
    }
  });
}

// Form validation
function validateForm(elements) {
  debug("Validating form");
  let isValid = true;
  const errors = [];

  // Required field validation
  ["firstName", "lastName", "email", "password"].forEach((field) => {
    const input = elements[`${field}Input`];
    if (!input || !input.value.trim()) {
      isValid = false;
      errors.push(
        `Please enter your ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`
      );
      if (input) input.classList.add("error");
    }
  });

  // Email validation
  if (
    elements.emailInput &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(elements.emailInput.value)
  ) {
    isValid = false;
    errors.push("Please enter a valid email address");
    elements.emailInput.classList.add("error");
  }

  // Password strength validation
  if (
    elements.passwordInput &&
    !checkPasswordStrength(elements.passwordInput.value)
  ) {
    isValid = false;
    errors.push("Please choose a stronger password");
    elements.passwordInput.classList.add("error");
  }

  // Terms agreement validation
  if (elements.agreeTermsCheckbox && !elements.agreeTermsCheckbox.checked) {
    isValid = false;
    errors.push("Please agree to the Terms of Service and Privacy Policy");
    elements.termsCheckbox?.classList.add("error");
  }

  // Show validation errors
  if (!isValid) {
    errors.forEach((error) => showToast(error, "error"));
    debug("Form validation failed", errors);
  } else {
    debug("Form validation passed");
  }

  return isValid;
}

// Initialize Firebase
function initializeFirebase() {
  debug("Initializing Firebase...");
  try {
    if (typeof firebase === "undefined") {
      throw new Error("Firebase SDK not loaded");
    }

    if (!firebase.apps.length) {
      debug("No Firebase apps found, initializing with config");
      if (!window.firebaseConfig) {
        throw new Error("Firebase config not found");
      }
      firebase.initializeApp(window.firebaseConfig);
    }

    auth = firebase.auth();
    db = firebase.firestore();
    debug("Firebase initialized successfully");
  } catch (error) {
    handleError(error, "initializeFirebase");
    throw error;
  }
}

// Single initialization point
document.addEventListener("DOMContentLoaded", () => {
  debug("DOM Content Loaded");
  try {
    initializeFirebase();
    const elements = initializeUI();
    if (elements?.signupForm) {
      setupFormSubmission(elements.signupForm, elements);
    }
  } catch (error) {
    handleError(error, "initialization");
  }
});

// Get DOM elements
const signupForm = document.getElementById("signupForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const agreeTermsCheckbox = document.getElementById("agreeTerms");
const togglePasswordBtn = document.querySelector(".toggle-password");
const googleSignUpBtn = document.querySelector(".social-btn.google");
const githubSignUpBtn = document.querySelector(".social-btn.github");
const strengthMeter = document.querySelector(".strength-meter");
const strengthText = document.querySelector(".strength-text");
const authContainer = document.querySelector(".auth-container");
const onboardingContainer = document.querySelector(".onboarding-container");
const requirements = document.querySelectorAll(".requirement");

let googleUser = null;

// Constants for navigation
const ROUTES = {
  DASHBOARD: "/dashboard",
  ONBOARDING: "/onboarding",
  CONTINUE_SIGNUP: "/auth/signup/continue.html",
  LOGIN: "/auth/login/",
  SIGNUP: "/auth/signup/",
};

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
  const icon = togglePasswordBtn.querySelector("i");
  icon.classList.toggle("fa-eye");
  icon.classList.toggle("fa-eye-slash");
});

// Password strength check on input
passwordInput.addEventListener("input", () => {
  const password = passwordInput.value;
  let strength = 0;

  // Check requirements
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  requirements.forEach((req) => {
    const type = req.dataset.requirement;
    if (checks[type]) {
      req.classList.add("met");
      strength++;
    } else {
      req.classList.remove("met");
    }
  });

  // Update strength meter
  const strengthPercentage = (strength / 5) * 100;
  strengthMeter.style.width = `${strengthPercentage}%`;

  if (strength < 2) {
    strengthMeter.className = "strength-meter weak";
    strengthText.textContent = "Weak";
  } else if (strength < 4) {
    strengthMeter.className = "strength-meter medium";
    strengthText.textContent = "Medium";
  } else {
    strengthMeter.className = "strength-meter strong";
    strengthText.textContent = "Strong";
  }
});

// Enhanced form validation
function validateForm() {
  let isValid = true;
  const errors = [];

  // Password validation
  if (!checkPasswordStrength(passwordInput.value)) {
    errors.push("Please choose a stronger password");
    isValid = false;
    passwordInput.closest(".input-group").style.borderColor = "#ff4444";
  }

  // Terms agreement validation
  if (!agreeTermsCheckbox.checked) {
    errors.push("Please agree to the Terms of Service and Privacy Policy");
    isValid = false;
    agreeTermsCheckbox.closest(".terms-checkbox").classList.add("error");
  }

  // Show all validation errors
  if (!isValid) {
    errors.forEach((error) => showToast(error, "error"));
  }

  return isValid;
}

// Add event listeners for validation cleanup
document.addEventListener("DOMContentLoaded", () => {
  // Reset validation styles when checkbox is clicked
  agreeTermsCheckbox.addEventListener("change", () => {
    const termsContainer = agreeTermsCheckbox.closest(".terms-checkbox");
    if (agreeTermsCheckbox.checked) {
      termsContainer.classList.remove("error");
    }
  });

  // Reset validation styles when password is changed
  passwordInput.addEventListener("input", () => {
    passwordInput.closest(".input-group").style.borderColor = "";
  });
});

// Enhanced password visibility toggle
function setupPasswordToggle(elements) {
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

  // Ensure password inputs are synchronized
  passwordInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (input.id === "password") {
        checkPasswordStrength(input.value);
      }
    });
  });
}

// Enhanced real-time form validation
function setupFormValidation(elements) {
  const inputs = document.querySelectorAll("input");
  const form = document.getElementById("signupForm");

  inputs.forEach((input) => {
    // Add validation styles
    input.addEventListener("input", () => {
      const isValid = input.checkValidity();
      input.style.borderColor = isValid ? "var(--glass-border)" : "#ff4444";

      // Special handling for password confirmation
      if (input.id === "confirmPassword") {
        const isMatch = input.value === passwordInput.value;
        input.style.borderColor = isMatch ? "var(--glass-border)" : "#ff4444";
      }
    });

    // Add focus effects
    input.addEventListener("focus", () => {
      input.parentElement.classList.add("focused");
    });

    input.addEventListener("blur", () => {
      input.parentElement.classList.remove("focused");
      // Validate on blur
      const isValid = input.checkValidity();
      input.style.borderColor = isValid ? "var(--glass-border)" : "#ff4444";
    });
  });

  // Prevent form submission if invalid
  form.addEventListener("submit", (e) => {
    if (!form.checkValidity()) {
      e.preventDefault();
      showToast("Please fill in all required fields correctly", "error");
    }
  });
}

// Setup Terms checkbox interaction
function setupTermsCheckbox(termsCheckbox) {
  if (!termsCheckbox) {
    debug("Terms checkbox container not found");
    return;
  }

  const checkbox = termsCheckbox.querySelector('input[type="checkbox"]');
  if (!checkbox) {
    debug("Checkbox input not found");
    return;
  }

  debug("Setting up terms checkbox interactions");

  termsCheckbox.addEventListener("click", (e) => {
    debug("Terms checkbox clicked", { target: e.target.tagName });

    // Don't handle clicks on links
    if (e.target.closest("a")) {
      debug("Click was on a link, not handling");
      return;
    }

    // Toggle the checkbox
    checkbox.checked = !checkbox.checked;
    debug("Checkbox state toggled:", checkbox.checked);

    // Update UI state
    termsCheckbox.classList.toggle("error", !checkbox.checked);
    debug("Updated checkbox UI state");

    e.preventDefault();
  });
}

// Initialize all UI interactions
function initializeUI() {
  debug("Initializing UI elements...");

  // Get all form elements
  const elements = {
    signupForm: document.getElementById("signupForm"),
    firstNameInput: document.getElementById("firstName"),
    lastNameInput: document.getElementById("lastName"),
    emailInput: document.getElementById("email"),
    phoneInput: document.getElementById("phone"),
    passwordInput: document.getElementById("password"),
    confirmPasswordInput: document.getElementById("confirmPassword"),
    agreeTermsCheckbox: document.getElementById("agreeTerms"),
    togglePasswordBtn: document.querySelector(".toggle-password"),
    googleSignUpBtn: document.querySelector(".social-btn.google"),
    githubSignUpBtn: document.querySelector(".social-btn.github"),
    strengthMeter: document.querySelector(".strength-meter"),
    strengthText: document.querySelector(".strength-text"),
    termsCheckbox: document.querySelector(".terms-checkbox"),
    requirements: document.querySelectorAll(".requirement"),
  };

  debug(
    "Found DOM elements:",
    Object.entries(elements).map(([k, v]) => `${k}: ${v ? "✓" : "✗"}`)
  );

  try {
    // Initialize password-related functionality
    if (elements.togglePasswordBtn) {
      debug("Setting up password toggle");
      setupPasswordToggle(elements);
    }

    // Initialize form validation
    if (elements.signupForm) {
      debug("Setting up form validation");
      setupFormValidation(elements);
      setupFormSubmission(elements.signupForm, elements);
    }

    // Initialize terms checkbox
    if (elements.termsCheckbox) {
      debug("Setting up terms checkbox");
      setupTermsCheckbox(elements.termsCheckbox);
    }

    // Initialize Google Sign In
    if (elements.googleSignUpBtn) {
      debug("Setting up Google sign-in button");
      elements.googleSignUpBtn.addEventListener("click", async () => {
        try {
          await showLoading(
            "Connecting to Google...",
            "Please wait while we securely connect to your Google account"
          );

          const provider = new firebase.auth.GoogleAuthProvider();
          provider.addScope("profile");
          provider.addScope("email");
          const result = await auth.signInWithPopup(provider);
          debug("Google sign-in successful", result.user.email);

          const userExists = await checkUserExists(result.user.uid);
          debug("User exists check:", userExists);

          if (!userExists) {
            await handleNewGoogleUser(result.user);
          } else {
            await handleExistingGoogleUser(result.user);
          }
        } catch (error) {
          debug("Google sign-in error:", error);
          hideLoading();
          showToast(error.message, "error");
        }
      });
    }

    // Initialize GitHub Sign In
    if (elements.githubSignUpBtn) {
      debug("Setting up GitHub sign-in button");
      elements.githubSignUpBtn.addEventListener("click", handleGithubSignIn);
    }

    debug("UI initialization complete");
    return elements;
  } catch (error) {
    handleError(error, "initializeUI");
  }
}

// Call initialization when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeUI);

// Save user data to Firestore
async function saveUserData(userId, userData) {
  try {
    await db
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
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Validate required fields
    const requiredFields = [
      "learningGoals",
      "experienceLevel",
      "timeCommitment",
      "interests",
    ];
    for (const field of requiredFields) {
      if (
        !onboardingData[field] ||
        (Array.isArray(onboardingData[field]) &&
          onboardingData[field].length === 0)
      ) {
        throw new Error(
          `Please select at least one ${field
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()}`
        );
      }
    }

    // Create learning profile based on selections
    const learningProfile = {
      level: onboardingData.experienceLevel,
      pace: calculateLearningPace(onboardingData.timeCommitment),
      focusAreas: onboardingData.learningGoals,
      interests: onboardingData.interests,
      recommendedTopics: generateRecommendedTopics(onboardingData),
      weeklyGoals: generateWeeklyGoals(onboardingData),
    };

    // Save comprehensive onboarding data
    await db
      .collection("users")
      .doc(userId)
      .update({
        onboarding: {
          ...onboardingData,
          learningProfile,
          completedAt: timestamp,
          lastUpdated: timestamp,
        },
        hasCompletedOnboarding: true,
        updatedAt: timestamp,
      });

    // Create initial progress tracking document
    await db.collection("userProgress").doc(userId).set({
      currentLevel: onboardingData.experienceLevel,
      completedTopics: [],
      achievements: [],
      weeklyProgress: [],
      lastActive: timestamp,
      createdAt: timestamp,
    });

    // Set up personalized learning path
    await createLearningPath(userId, learningProfile);
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    throw error;
  }
}

// Calculate learning pace based on time commitment
function calculateLearningPace(timeCommitment) {
  const paceMap = {
    "1-2": "relaxed",
    "3-5": "moderate",
    "5+": "intensive",
  };
  return {
    type: paceMap[timeCommitment],
    hoursPerWeek:
      timeCommitment === "5+" ? 5 : parseInt(timeCommitment.split("-")[0]),
    recommendedSessionLength: timeCommitment === "5+" ? 90 : 45, // minutes
  };
}

// Generate recommended topics based on user selections
function generateRecommendedTopics(onboardingData) {
  const topics = [];

  // Map interests to specific topics
  const topicMap = {
    programming: [
      "JavaScript Fundamentals",
      "Python Basics",
      "Web Development",
    ],
    dataScience: ["Data Analysis", "Machine Learning", "Statistics"],
    design: ["UI/UX Principles", "Visual Design", "Design Thinking"],
    business: ["Business Strategy", "Marketing", "Entrepreneurship"],
    languages: ["English", "Spanish", "Mandarin"],
    mathematics: ["Algebra", "Calculus", "Statistics"],
  };

  // Add topics based on interests
  onboardingData.interests.forEach((interest) => {
    if (topicMap[interest]) {
      topics.push(...topicMap[interest]);
    }
  });

  // Adjust based on experience level
  const levelModifier = {
    beginner: "Introduction to",
    intermediate: "Advanced",
    advanced: "Expert",
  };

  return topics.map((topic) => ({
    name: topic,
    level: levelModifier[onboardingData.experienceLevel],
    estimated_duration: "4 weeks",
  }));
}

// Generate weekly goals based on user profile
function generateWeeklyGoals(onboardingData) {
  const baseGoals = {
    topics_to_cover: 2,
    practice_exercises: 3,
    project_milestones: 1,
  };

  // Adjust based on time commitment
  const timeMultiplier = {
    "1-2": 0.5,
    "3-5": 1,
    "5+": 1.5,
  };

  // Adjust based on experience level
  const levelMultiplier = {
    beginner: 0.8,
    intermediate: 1,
    advanced: 1.2,
  };

  const multiplier =
    timeMultiplier[onboardingData.timeCommitment] *
    levelMultiplier[onboardingData.experienceLevel];

  return {
    topics_to_cover: Math.round(baseGoals.topics_to_cover * multiplier),
    practice_exercises: Math.round(baseGoals.practice_exercises * multiplier),
    project_milestones: baseGoals.project_milestones,
    study_hours: parseInt(onboardingData.timeCommitment.split("-")[0]),
  };
}

// Create personalized learning path
async function createLearningPath(userId, learningProfile) {
  try {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Generate learning modules based on profile
    const modules = learningProfile.recommendedTopics.map((topic, index) => ({
      id: `module-${index + 1}`,
      name: topic.name,
      level: topic.level,
      duration: topic.estimated_duration,
      status: "pending",
      order: index + 1,
    }));

    // Create learning path document
    await db.collection("learningPaths").doc(userId).set({
      userId,
      modules,
      currentModule: modules[0].id,
      progress: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } catch (error) {
    console.error("Error creating learning path:", error);
    throw error;
  }
}

// Show welcome screen
async function showWelcome() {
  const welcomeScreen = document.querySelector(".welcome-screen");
  const steps = welcomeScreen.querySelectorAll(".welcome-step");

  welcomeScreen.classList.add("visible");

  // Animate steps sequentially
  for (let i = 0; i < steps.length - 1; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    steps[i].classList.add("completed");
  }

  // Keep the last step active (spinning)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // After all animations, redirect to dashboard
  await new Promise((resolve) => setTimeout(resolve, 1500));
  window.location.href = ROUTES.DASHBOARD;
}

// Update the existing navigation function
async function navigateTo(route, options = {}) {
  try {
    if (options.loading) {
      if (options.welcome) {
        await showWelcome();
      } else {
        await showLoading(options.loadingMessage, options.loadingSubmessage);
      }
    }

    if (route.endsWith(".html") || route === "/" || route.startsWith("/")) {
      window.location.href = route;
    } else {
      throw new Error("Invalid route");
    }
  } catch (error) {
    hideLoading();
    showToast(error.message, "error");
    window.location.href = ROUTES.LOGIN;
  }
}

// Update the onboarding completion handler
async function handleOnboarding(userId) {
  const onboardingForm = document.getElementById("onboardingForm");

  onboardingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      await showLoading(
        "Processing Your Preferences...",
        "Creating your personalized learning experience"
      );

      const onboardingData = {
        learningGoals: Array.from(
          document.querySelectorAll('input[name="learningGoals"]:checked')
        ).map((cb) => cb.value),
        experienceLevel: document.querySelector(
          'input[name="experienceLevel"]:checked'
        ).value,
        timeCommitment: document.querySelector(
          'input[name="timeCommitment"]:checked'
        ).value,
        interests: Array.from(
          document.querySelectorAll('input[name="interests"]:checked')
        ).map((cb) => cb.value),
      };

      await saveOnboardingData(userId, onboardingData);

      hideLoading();
      await showWelcome();
    } catch (error) {
      hideLoading();
      console.error("Error during onboarding:", error);
      showToast(error.message, "error");
    }
  });
}

// Show onboarding form
function showOnboarding(userId) {
  // Instead of manipulating DOM elements that don't exist,
  // redirect to the onboarding page
  window.location.href = ROUTES.ONBOARDING + "?uid=" + userId;
}

// Show loading screen with custom message
async function showLoading(message, submessage) {
  const loadingScreen = document.querySelector(".loading-screen");
  const loadingText = loadingScreen.querySelector(".loading-text");
  const loadingSubtext = loadingScreen.querySelector(".loading-subtext");
  const steps = loadingScreen.querySelectorAll(".loading-step");

  loadingText.textContent = message || "Creating Your Account";
  loadingSubtext.textContent =
    submessage || "Setting up your personalized learning environment...";
  loadingScreen.classList.add("visible");

  // Animate steps
  let currentStep = 0;
  const stepInterval = setInterval(() => {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === currentStep);
    });
    currentStep = (currentStep + 1) % steps.length;
  }, 750);

  // Set a maximum loading time of 10 seconds
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      clearInterval(stepInterval);
      hideLoading();
      reject(new Error("Loading timeout exceeded"));
    }, 10000);
  });

  try {
    // Return a promise that resolves after 2 seconds or rejects on timeout
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 2000)),
      timeout,
    ]);
  } catch (error) {
    clearInterval(stepInterval);
    throw error;
  }
}

// Hide loading screen
function hideLoading() {
  const loadingScreen = document.querySelector(".loading-screen");
  loadingScreen.classList.remove("visible");

  // Reset steps
  const steps = loadingScreen.querySelectorAll(".loading-step");
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === 0);
  });
}

// Show error in loading screen
function showLoadingError(error) {
  const loadingScreen = document.querySelector(".loading-screen");
  const loadingText = loadingScreen.querySelector(".loading-text");
  const loadingSubtext = loadingScreen.querySelector(".loading-subtext");
  const loadingProgress = loadingScreen.querySelector(".loading-progress");
  const loadingSteps = loadingScreen.querySelector(".loading-steps");

  loadingScreen.classList.add("error");
  loadingText.textContent = "Oops! Something went wrong";
  loadingSubtext.textContent = error.message;
  loadingProgress.style.display = "none";
  loadingSteps.style.display = "none";

  setTimeout(() => {
    loadingScreen.classList.remove("error");
    hideLoading();
    loadingProgress.style.display = "";
    loadingSteps.style.display = "";
  }, 3000);
}

// Check if user exists in Firestore
async function checkUserExists(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    return userDoc.exists;
  } catch (error) {
    console.error("Error checking user:", error);
    return false;
  }
}

// Update Google Sign Up handler
googleSignUpBtn.addEventListener("click", async () => {
  try {
    await showLoading(
      "Connecting to Google...",
      "Please wait while we securely connect to your Google account"
    );

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    const result = await auth.signInWithPopup(provider);

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
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      showToast("Successfully signed up with Google!");
      await navigateTo(ROUTES.CONTINUE_SIGNUP, {
        loading: true,
        loadingMessage: "Redirecting...",
        loadingSubmessage: "Taking you to complete your profile setup",
      });
    } else {
      const userDoc = await db.collection("users").doc(result.user.uid).get();

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

// Update Email/Password Sign Up handler
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  try {
    await showLoading(
      "Creating Your Account...",
      "Setting up your secure profile"
    );

    let userCredential = await auth.createUserWithEmailAndPassword(
      emailInput.value,
      passwordInput.value
    );

    await showLoading(
      "Saving Your Information...",
      "Securely storing your profile details"
    );

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
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast("Account created successfully!");

    await navigateTo(ROUTES.ONBOARDING, {
      loading: true,
      loadingMessage: "Success!",
      loadingSubmessage: "Taking you to personalize your learning experience",
    });
  } catch (error) {
    hideLoading();
    console.error("Error:", error);
    showToast(error.message, "error");
  }
});

// GitHub Sign Up
githubSignUpBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    const result = await auth.signInWithPopup(provider);

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

// Remove the problematic button event listeners
const buttons = document.querySelectorAll(".primary-btn, .oauth-btn");
buttons.forEach((button) => {
  button.addEventListener("click", (e) => {
    if (button.type === "submit") {
      // Let the form handle submit buttons
      return;
    }
    // Add a brief visual feedback for other buttons
    button.classList.add("clicked");
    setTimeout(() => {
      button.classList.remove("clicked");
    }, 150);
  });
});

// Check if user is already signed in
auth.onAuthStateChanged((user) => {
  if (user) {
    // Check if user has completed onboarding
    db.collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().onboarding) {
          // User has completed onboarding, redirect to dashboard
          window.location.href = ROUTES.DASHBOARD;
        } else {
          // Redirect to onboarding
          window.location.href = ROUTES.ONBOARDING + "?uid=" + user.uid;
        }
      })
      .catch((error) => {
        console.error("Error checking onboarding status:", error);
        showToast("Error checking user status. Please try again.", "error");
      });
  }
});

// Form submission handler
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  try {
    const button = e.target.querySelector(".signup-btn");
    button.classList.add("loading");

    const userCredential = await auth.createUserWithEmailAndPassword(
      emailInput.value,
      passwordInput.value
    );

    // Save additional user data
    await db
      .collection("users")
      .doc(userCredential.user.uid)
      .set({
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        email: emailInput.value,
        phone: phoneInput.value || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    showToast("Account created successfully!");

    // Redirect to onboarding
    window.location.href =
      ROUTES.ONBOARDING + "?uid=" + userCredential.user.uid;
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
    button.classList.remove("loading");
  }
});

// Terms checkbox handler
const termsCheckbox = document.querySelector(".terms-checkbox");
termsCheckbox.addEventListener("click", (e) => {
  // Only toggle if the click wasn't on a link
  if (!e.target.closest("a")) {
    const checkbox = termsCheckbox.querySelector("input[type='checkbox']");
    checkbox.checked = !checkbox.checked;

    // Remove error state if checked
    if (checkbox.checked) {
      termsCheckbox.classList.remove("error");
    }

    // Prevent the label's default behavior to avoid double-toggle
    e.preventDefault();
  }
});
