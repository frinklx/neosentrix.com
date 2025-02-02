// Onboarding Module
import { showLoading, hideLoading, showToast } from "../shared/utils/ui.js";
import { ROUTES } from "../shared/utils/routes.js";

// Save onboarding data to Firestore
export async function saveOnboardingData(userId, onboardingData) {
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
    levelModifier[onboardingData.experienceLevel];

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
export function initializeOnboarding(userId) {
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
      window.location.href = ROUTES.DASHBOARD;
    } catch (error) {
      hideLoading();
      console.error("Error during onboarding:", error);
      showToast(error.message, "error");
    }
  });
}
