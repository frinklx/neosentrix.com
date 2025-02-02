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

// Constants for navigation
const ROUTES = {
  DASHBOARD: "/dashboard",
  ONBOARDING: "/onboarding",
  CONTINUE_SIGNUP: "/auth/signup/continue.html",
  LOGIN: "/auth/login/",
  SIGNUP: "/auth/signup/",
};

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

// Enhanced password visibility toggle
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
function setupFormValidation() {
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
function setupTermsCheckbox() {
  const termsCheckbox = document.getElementById("agreeTerms");
  const termsLabel = termsCheckbox.parentElement;

  termsCheckbox.addEventListener("change", () => {
    termsLabel.style.color = termsCheckbox.checked
      ? "var(--gray-text)"
      : "#ff4444";
  });

  // Make the entire label clickable
  termsLabel.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") {
      termsCheckbox.click();
    }
  });
}

// Initialize all UI interactions
function initializeUI() {
  setupPasswordToggle();
  setupFormValidation();
  setupTermsCheckbox();
}

// Call initialization when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeUI);

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
    await firebase
      .firestore()
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
    await firebase.firestore().collection("userProgress").doc(userId).set({
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
    await firebase.firestore().collection("learningPaths").doc(userId).set({
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

// Handle onboarding form submission
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

      showToast("Onboarding completed successfully!");

      await showLoading(
        "All Set!",
        "Taking you to your personalized dashboard"
      );
      window.location.href = "/dashboard";
    } catch (error) {
      hideLoading();
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

// Show loading screen with custom message
async function showLoading(
  message = "Preparing your experience...",
  submessage = "Setting up your personalized learning environment..."
) {
  const loadingScreen = document.querySelector(".loading-screen");
  if (!loadingScreen) return;

  const loadingText = loadingScreen.querySelector(".loading-text");
  const loadingSubtext = loadingScreen.querySelector(".loading-subtext");

  loadingText.textContent = message;
  loadingSubtext.textContent = submessage;
  loadingScreen.classList.add("visible");

  // Update steps every 750ms
  const steps = loadingScreen.querySelectorAll(".loading-step");
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

  // Return a promise that resolves after 3 seconds or rejects on timeout
  return Promise.race([
    new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(stepInterval);
        resolve();
      }, 3000);
    }),
    timeout,
  ]);
}

// Hide loading screen
function hideLoading() {
  const loadingScreen = document.querySelector(".loading-screen");
  if (!loadingScreen) return;

  loadingScreen.classList.remove("visible");
  // Reset loading screen state
  const steps = loadingScreen.querySelectorAll(".loading-step");
  steps.forEach((step) => step.classList.remove("active"));
  steps[0].classList.add("active");
}

// Show error in loading screen
function showLoadingError(error) {
  const loadingScreen = document.querySelector(".loading-screen");
  if (!loadingScreen) return;

  const loadingText = loadingScreen.querySelector(".loading-text");
  const loadingSubtext = loadingScreen.querySelector(".loading-subtext");
  const loadingProgress = loadingScreen.querySelector(".loading-progress");

  loadingText.textContent = "Oops! Something went wrong";
  loadingText.style.color = "#ff4444";
  loadingSubtext.textContent = error.message;
  loadingProgress.style.display = "none";

  setTimeout(hideLoading, 3000);
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

// Handle navigation with error checking
async function navigateTo(route, options = {}) {
  try {
    if (options.loading) {
      await showLoading(options.loadingMessage, options.loadingSubmessage);
    }

    // Check if route exists (you should implement this based on your routing setup)
    if (route.endsWith(".html") || route === "/" || route.startsWith("/")) {
      window.location.href = route;
    } else {
      throw new Error("Invalid route");
    }
  } catch (error) {
    hideLoading();
    showToast(error.message, "error");
    // Fallback to a safe route
    window.location.href = ROUTES.LOGIN;
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      showToast("Successfully signed up with Google!");
      await navigateTo(ROUTES.CONTINUE_SIGNUP, {
        loading: true,
        loadingMessage: "Redirecting...",
        loadingSubmessage: "Taking you to complete your profile setup",
      });
    } else {
      const userDoc = await firebase
        .firestore()
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

// Update Email/Password Sign Up handler
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  try {
    await showLoading(
      "Creating Your Account...",
      "Setting up your secure profile"
    );

    let userCredential = await firebase
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
