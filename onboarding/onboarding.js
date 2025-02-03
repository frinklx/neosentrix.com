// Onboarding Module
import { showLoading, hideLoading, showToast } from "../shared/utils/ui.js";
import { redirectTo } from "../shared/utils/routes.js";

let auth;
let firestore;
let currentUser = null;
let currentStep = 1;
const totalSteps = 4;

// Initialize Firebase when the module loads
async function initializeApp() {
  console.log("[Onboarding] DOM Content Loaded - Initializing");
  try {
    await initializeFirebase();
    setupEventListeners();
    updateProgress();
  } catch (error) {
    console.error("[Onboarding] Initialization error:", error);
    showToast("Error initializing application. Please try again.", "error");
  }
}

// Initialize Firebase with proper error handling
async function initializeFirebase() {
  console.log("[Onboarding] Initializing Firebase");
  try {
    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
      if (!window.firebaseConfig) {
        throw new Error("Firebase configuration not found");
      }
      firebase.initializeApp(window.firebaseConfig);
    }

    auth = firebase.auth();
    firestore = firebase.firestore();

    // Set up auth state listener with Promise
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        try {
          await handleAuthStateChange(user);
          unsubscribe(); // Cleanup listener after initial auth state is handled
          resolve();
        } catch (error) {
          reject(error);
        }
      }, reject);
    });
  } catch (error) {
    console.error("[Onboarding] Error initializing Firebase:", error);
    throw error;
  }
}

async function handleAuthStateChange(user) {
  console.log(
    "[Onboarding] Auth state changed:",
    user ? "User present" : "No user"
  );

  if (!user) {
    console.log("[Onboarding] No user found - redirecting to login");
    redirectTo("/auth/login.html");
    return;
  }

  currentUser = user;
  await checkOnboardingStatus();
}

async function checkOnboardingStatus() {
  try {
    const userDoc = await firestore
      .collection("users")
      .doc(currentUser.uid)
      .get();

    if (!userDoc.exists) {
      console.log(
        "[Onboarding] User document not found - redirecting to signup"
      );
      redirectTo("/auth/signup.html");
      return;
    }

    const userData = userDoc.data();
    if (userData.isOnboardingComplete) {
      console.log(
        "[Onboarding] Onboarding already completed - redirecting to dashboard"
      );
      redirectTo("/dashboard/");
    }
  } catch (error) {
    console.error("[Onboarding] Error checking onboarding status:", error);
    showToast("Error checking your profile status. Please try again.", "error");
  }
}

function setupEventListeners() {
  const form = document.getElementById("onboardingForm");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (!form || !nextBtn || !prevBtn || !submitBtn) {
    console.error("[Onboarding] Required elements not found");
    return;
  }

  nextBtn.addEventListener("click", () => navigateStep(1));
  prevBtn.addEventListener("click", () => navigateStep(-1));
  form.addEventListener("submit", handleSubmit);

  // Add validation listeners to all inputs
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", validateCurrentStep);
  });
}

function navigateStep(direction) {
  if (!validateCurrentStep()) {
    return;
  }

  const newStep = currentStep + direction;
  if (newStep < 1 || newStep > totalSteps) {
    return;
  }

  // Update UI
  document
    .querySelector(`.step-content[data-step="${currentStep}"]`)
    .classList.remove("active");
  document
    .querySelector(`.step-content[data-step="${newStep}"]`)
    .classList.add("active");

  document
    .querySelector(`.step[data-step="${currentStep}"]`)
    .classList.add("completed");
  document
    .querySelector(`.step[data-step="${newStep}"]`)
    .classList.add("active");

  // Update buttons
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");

  prevBtn.disabled = newStep === 1;
  nextBtn.style.display = newStep === totalSteps ? "none" : "flex";
  submitBtn.style.display = newStep === totalSteps ? "flex" : "none";

  currentStep = newStep;
  updateProgress();
}

function validateCurrentStep() {
  const currentStepElement = document.querySelector(
    `.step-content[data-step="${currentStep}"]`
  );
  const inputs = currentStepElement.querySelectorAll("input");
  let isValid = false;

  switch (currentStep) {
    case 1: // Learning Goals
      isValid = Array.from(inputs).some((input) => input.checked);
      if (!isValid)
        showToast("Please select at least one learning goal", "error");
      break;
    case 2: // Experience Level
      isValid = Array.from(inputs).some((input) => input.checked);
      if (!isValid) showToast("Please select your experience level", "error");
      break;
    case 3: // Time Commitment
      isValid = Array.from(inputs).some((input) => input.checked);
      if (!isValid) showToast("Please select your time commitment", "error");
      break;
    case 4: // Interests
      isValid = Array.from(inputs).some((input) => input.checked);
      if (!isValid) showToast("Please select at least one interest", "error");
      break;
  }

  return isValid;
}

function updateProgress() {
  const progress = (currentStep / totalSteps) * 100;
  document.getElementById("progressBar").style.width = `${progress}%`;
}

function getFormData() {
  const form = document.getElementById("onboardingForm");
  const formData = new FormData(form);

  return {
    learningGoals: formData.getAll("learningGoals"),
    experienceLevel: formData.get("experienceLevel"),
    timeCommitment: formData.get("timeCommitment"),
    interests: formData.getAll("interests"),
  };
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!validateCurrentStep()) {
    return;
  }

  try {
    showLoading(
      "Saving your preferences...",
      "Creating your personalized learning path"
    );

    const onboardingData = getFormData();
    await saveOnboardingData(currentUser.uid, onboardingData);

    showToast("Onboarding completed successfully!");
    redirectTo(
      "/redirect/index.html?to=/dashboard&message=Welcome to NeoSentrix!&submessage=Preparing your personalized dashboard..."
    );
  } catch (error) {
    console.error("[Onboarding] Error saving onboarding data:", error);
    hideLoading();
    showToast(error.message, "error");
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
        isOnboardingComplete: true,
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
    casual: {
      type: "relaxed",
      hoursPerWeek: 2,
      recommendedSessionLength: 45, // minutes
    },
    regular: {
      type: "moderate",
      hoursPerWeek: 5,
      recommendedSessionLength: 60, // minutes
    },
    dedicated: {
      type: "intensive",
      hoursPerWeek: 10,
      recommendedSessionLength: 90, // minutes
    },
  };

  return paceMap[timeCommitment] || paceMap.regular; // Default to regular if invalid value
}

// Generate recommended topics based on user selections
function generateRecommendedTopics(onboardingData) {
  const topics = [];

  // Map interests to specific topics
  const topicMap = {
    stemSubjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Computer Science",
    ],
    humanities: [
      "Literature",
      "History",
      "Social Studies",
      "Languages",
      "Philosophy",
    ],
    artsCreative: [
      "Visual Arts",
      "Music",
      "Creative Writing",
      "Drama",
      "Design",
    ],
    businessEcon: [
      "Economics",
      "Business Studies",
      "Finance",
      "Accounting",
      "Marketing",
    ],
  };

  // Add topics based on interests
  onboardingData.interests.forEach((interest) => {
    if (topicMap[interest]) {
      topics.push(
        ...topicMap[interest].map((topic) => ({
          name: topic,
          level: onboardingData.experienceLevel,
          estimated_duration: "4 weeks",
        }))
      );
    }
  });

  return topics;
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
    casual: 0.5,
    regular: 1,
    dedicated: 1.5,
  };

  // Adjust based on grade level
  const levelMultiplier = {
    elementary: 0.8,
    middleSchool: 1,
    highSchool: 1.2,
  };

  const multiplier =
    (timeMultiplier[onboardingData.timeCommitment] || 1) *
    (levelMultiplier[onboardingData.experienceLevel] || 1);

  return {
    topics_to_cover: Math.round(baseGoals.topics_to_cover * multiplier),
    practice_exercises: Math.round(baseGoals.practice_exercises * multiplier),
    project_milestones: baseGoals.project_milestones,
    study_hours: calculateLearningPace(onboardingData.timeCommitment)
      .hoursPerWeek,
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
      experienceLevel: learningProfile.level,
      learningGoals: learningProfile.focusAreas,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } catch (error) {
    console.error("Error creating learning path:", error);
    throw error;
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);

// Export functions that might be needed by other modules
export { navigateStep, validateCurrentStep, handleSubmit, saveOnboardingData };
