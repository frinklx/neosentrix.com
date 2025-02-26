// Initialize variables
let currentUser = null;
let currentStep = 1;
const totalSteps = 4;

const stepTitles = {
  1: "Tell us about yourself",
  2: "Your education details",
  3: "Select your interests",
  4: "Set your learning goals",
};

// Show toast message
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  const container = document.querySelector(".toast-container");
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Show loading overlay
function showLoading(message, submessage) {
  const loadingOverlay = document.createElement("div");
  loadingOverlay.className = "loading-overlay";
  loadingOverlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <h3>${message || "Loading..."}</h3>
      ${submessage ? `<p>${submessage}</p>` : ""}
    </div>
  `;
  document.body.appendChild(loadingOverlay);
}

// Hide loading overlay
function hideLoading() {
  const overlay = document.querySelector(".loading-overlay");
  if (overlay) {
    overlay.remove();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Continue Signup] DOM Content Loaded - Initializing components");
  initializeFirebase();
  setupFormListeners();
  updateProgressBar();
  updateStepTitle();
});

function initializeFirebase() {
  console.log("[Continue Signup] Initializing Firebase");
  try {
    // Set up auth state listener
    window.auth.onAuthStateChanged(handleAuthStateChange);
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
    window.location.href = "/auth/signup/";
    return;
  }

  currentUser = user;
  console.log("[Continue Signup] Current user:", {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  });

  // Pre-fill form fields if available
  prefillFormFields(user);
}

function prefillFormFields(user) {
  // Pre-fill email if available
  const emailInput = document.getElementById("email");
  if (emailInput && user.email) {
    console.log("[Continue Signup] Pre-filling email:", user.email);
    emailInput.value = user.email;
    emailInput.disabled = true;
  }

  // Pre-fill name if available
  if (user.displayName) {
    const names = user.displayName.split(" ");
    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");

    if (firstName && names[0]) {
      firstName.value = names[0];
    }
    if (lastName && names.length > 1) {
      lastName.value = names.slice(1).join(" ");
    }
  }
}

function setupFormListeners() {
  console.log("[Continue Signup] Setting up form listeners");
  const form = document.getElementById("continueForm");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (form) {
    form.addEventListener("submit", handleFormSubmit);
    console.log("[Continue Signup] Form submit listener added");
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (validateCurrentStep()) {
        goToNextStep();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", goToPrevStep);
  }

  // Set up input validation listeners
  setupInputValidation();
}

function setupInputValidation() {
  const inputs = document.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      validateInput(input);
    });

    input.addEventListener("blur", () => {
      validateInput(input);
    });
  });
}

function validateInput(input) {
  const isValid = input.checkValidity();
  const inputGroup = input.closest(".input-group");

  if (inputGroup) {
    if (!isValid && input.value) {
      inputGroup.classList.add("error");
    } else {
      inputGroup.classList.remove("error");
    }
  }

  return isValid;
}

function validateCurrentStep() {
  const currentStepElement = document.querySelector(
    `.form-step[data-step="${currentStep}"]`
  );
  const inputs = currentStepElement.querySelectorAll("input, select, textarea");
  let isValid = true;

  inputs.forEach((input) => {
    if (input.required) {
      const valid = validateInput(input);
      isValid = isValid && valid;
    }
  });

  if (!isValid) {
    showToast("Please fill in all required fields correctly", "error");
  }

  return isValid;
}

function goToNextStep() {
  if (currentStep < totalSteps) {
    const currentStepElement = document.querySelector(
      `.form-step[data-step="${currentStep}"]`
    );
    const nextStepElement = document.querySelector(
      `.form-step[data-step="${currentStep + 1}"]`
    );

    currentStepElement.classList.remove("active");
    nextStepElement.classList.add("active");

    currentStep++;
    updateProgressBar();
    updateStepTitle();
    updateNavigationButtons();
  }
}

function goToPrevStep() {
  if (currentStep > 1) {
    const currentStepElement = document.querySelector(
      `.form-step[data-step="${currentStep}"]`
    );
    const prevStepElement = document.querySelector(
      `.form-step[data-step="${currentStep - 1}"]`
    );

    currentStepElement.classList.remove("active");
    prevStepElement.classList.add("active");

    currentStep--;
    updateProgressBar();
    updateStepTitle();
    updateNavigationButtons();
  }
}

function updateProgressBar() {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const progressFill = document.getElementById("progressFill");
  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }

  // Update step indicators
  document.querySelectorAll(".step").forEach((step) => {
    const stepNumber = parseInt(step.dataset.step);
    step.classList.remove("active", "complete");
    if (stepNumber === currentStep) {
      step.classList.add("active");
    } else if (stepNumber < currentStep) {
      step.classList.add("complete");
    }
  });
}

function updateStepTitle() {
  const stepTitle = document.getElementById("stepTitle");
  if (stepTitle) {
    stepTitle.textContent = stepTitles[currentStep];
  }
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (prevBtn) {
    prevBtn.style.display = currentStep === 1 ? "none" : "flex";
  }

  if (nextBtn) {
    nextBtn.style.display = currentStep === totalSteps ? "none" : "flex";
  }

  if (submitBtn) {
    submitBtn.style.display = currentStep === totalSteps ? "flex" : "none";
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  console.log("[Continue Signup] Form submission started");

  if (!currentUser) {
    console.error("[Continue Signup] No current user found");
    showToast("Please sign in again", "error");
    window.location.href = "/auth/signup/";
    return;
  }

  if (!validateCurrentStep()) {
    return;
  }

  try {
    showLoading(
      "Setting up your account...",
      "Please wait while we save your information"
    );
    console.log("[Continue Signup] Updating user profile");

    // Gather form data
    const formData = {
      // Personal Information
      username: document.getElementById("username").value,
      firstName: document.getElementById("firstName").value,
      lastName: document.getElementById("lastName").value,
      phone: document.getElementById("phone").value || null,

      // Education
      school: document.getElementById("school").value,
      educationLevel: document.getElementById("educationLevel").value,
      yearOfStudy: document.getElementById("yearOfStudy").value,

      // Interests
      subjects: Array.from(
        document.getElementById("subjects").selectedOptions
      ).map((opt) => opt.value),
      interests: Array.from(
        document.getElementById("interests").selectedOptions
      ).map((opt) => opt.value),

      // Goals
      goals: document.getElementById("goals").value,
      studyTime: document.getElementById("studyTime").value,
      studyDays: Array.from(
        document.getElementById("studyDays").selectedOptions
      ).map((opt) => opt.value),

      // Additional Data
      displayName: `${document.getElementById("firstName").value} ${
        document.getElementById("lastName").value
      }`,
      email: currentUser.email,
      photoURL: currentUser.photoURL || null,
      provider: currentUser.providerData[0].providerId,
      hasCompletedSignup: true,
      isOnboardingComplete: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Update display name
    await currentUser.updateProfile({
      displayName: formData.displayName,
    });

    // Save to Firestore
    console.log("[Continue Signup] Saving user data:", formData);
    await window.db.collection("users").doc(currentUser.uid).set(formData, {
      merge: true,
    });

    console.log("[Continue Signup] Setup completed successfully");
    hideLoading();
    showToast("Account setup completed!", "success");

    // Redirect to onboarding
    window.location.href =
      "/redirect/index.html?to=/onboarding&message=Welcome to Neolearn!&submessage=Let's personalize your learning experience...";
  } catch (error) {
    console.error("[Continue Signup] Error during setup:", error);
    hideLoading();
    showToast(error.message, "error");
  }
}
