import { analyzeText } from "./services/detector.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getUserStats, getGlobalStats } from "./services/analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "../../../shared/utils/firebase-config.js";
import {
  showToast,
  showLoading,
  hideLoading,
} from "../../../shared/utils/ui.js";

// DOM Elements
const textInput = document.getElementById("textInput");
const wordCount = document.getElementById("wordCount");
const scanBtn = document.querySelector(".scan-btn");
const clearBtn = document.querySelector(".clear-btn");
const resultsContent = document.querySelector(".results-content");
const emptyState = document.querySelector(".empty-state");
const aiScore = document.getElementById("aiScore");
const aiLabel = document.getElementById("aiLabel");
const plagiarismScore = document.getElementById("plagiarismScore");
const plagiarismLabel = document.getElementById("plagiarismLabel");
const styleBar = document.getElementById("styleBar");
const patternBar = document.getElementById("patternBar");
const coherenceBar = document.getElementById("coherenceBar");
const aiSummary = document.getElementById("aiSummary");
const matchesList = document.getElementById("matchesList");
const plagiarismSummary = document.getElementById("plagiarismSummary");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Analytics DOM Elements
const analyticsTabs = document.querySelectorAll(".analytics-tab");
const analyticsContents = document.querySelectorAll(".analytics-content");

// Personal Stats Elements
const totalChecks = document.getElementById("totalChecks");
const avgAiScore = document.getElementById("avgAiScore");
const plagiarismRate = document.getElementById("plagiarismRate");
const lowScoreBar = document.getElementById("lowScoreBar");
const mediumScoreBar = document.getElementById("mediumScoreBar");
const highScoreBar = document.getElementById("highScoreBar");
const lowScoreValue = document.getElementById("lowScoreValue");
const mediumScoreValue = document.getElementById("mediumScoreValue");
const highScoreValue = document.getElementById("highScoreValue");
const recentActivity = document.getElementById("recentActivity");

// Global Stats Elements
const totalUsers = document.getElementById("totalUsers");
const globalChecks = document.getElementById("globalChecks");
const globalAiRate = document.getElementById("globalAiRate");
const globalLowScoreBar = document.getElementById("globalLowScoreBar");
const globalMediumScoreBar = document.getElementById("globalMediumScoreBar");
const globalHighScoreBar = document.getElementById("globalHighScoreBar");
const globalLowScoreValue = document.getElementById("globalLowScoreValue");
const globalMediumScoreValue = document.getElementById(
  "globalMediumScoreValue"
);
const globalHighScoreValue = document.getElementById("globalHighScoreValue");

// Constants
const MIN_WORDS = 50;

// State
let isAnalyzing = false;
let currentUser = null;

// Initialize Firebase
console.log("[Detector] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Auth state observer
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    showToast("Please log in to use the detector", "info");
  }
});

// Helper Functions
function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function updateWordCount() {
  const count = countWords(textInput.value);
  wordCount.textContent = count;
  return count;
}

function setBarWidth(bar, percentage) {
  bar.style.width = `${percentage}%`;
}

function getAISummary(metrics) {
  const summaries = {
    high: "This text shows strong indicators of AI generation, including consistent writing patterns and highly structured language.",
    medium:
      "Some aspects of this text suggest potential AI involvement, though it may be mixed with human writing.",
    low: "This text displays characteristics more commonly associated with human writing.",
  };

  if (metrics.overall >= 80) return summaries.high;
  if (metrics.overall >= 60) return summaries.medium;
  return summaries.low;
}

function getPlagiarismSummary(matches) {
  if (matches.length === 0) {
    return "No significant matches found. The text appears to be original.";
  }

  const totalSimilarity =
    matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length;

  if (totalSimilarity >= 70) {
    return "High levels of potential plagiarism detected. Significant matches found with existing sources.";
  } else if (totalSimilarity >= 40) {
    return "Moderate similarity with existing sources detected. Some content may need attribution.";
  } else {
    return "Low similarity with existing sources. Minor matches detected.";
  }
}

function updateResults(aiMetrics, plagiarismMatches) {
  // Update AI scores and metrics
  aiScore.textContent = aiMetrics.overall;
  setBarWidth(styleBar, aiMetrics.style);
  setBarWidth(patternBar, aiMetrics.pattern);
  setBarWidth(coherenceBar, aiMetrics.coherence);
  aiSummary.textContent = getAISummary(aiMetrics);

  if (aiMetrics.overall >= 80) {
    aiLabel.textContent = "Likely AI Generated";
    aiLabel.style.color = "#ff4e4e";
  } else if (aiMetrics.overall >= 60) {
    aiLabel.textContent = "Possibly AI Generated";
    aiLabel.style.color = "#ffc107";
  } else {
    aiLabel.textContent = "Likely Human Written";
    aiLabel.style.color = "#00ff9d";
  }

  // Update plagiarism results
  const avgSimilarity =
    plagiarismMatches.reduce((sum, match) => sum + match.similarity, 0) /
    (plagiarismMatches.length || 1);

  plagiarismScore.textContent = Math.round(avgSimilarity);
  plagiarismSummary.textContent = getPlagiarismSummary(plagiarismMatches);

  if (avgSimilarity >= 70) {
    plagiarismLabel.textContent = "High Risk";
    plagiarismLabel.style.color = "#ff4e4e";
  } else if (avgSimilarity >= 40) {
    plagiarismLabel.textContent = "Medium Risk";
    plagiarismLabel.style.color = "#ffc107";
  } else {
    plagiarismLabel.textContent = "Low Risk";
    plagiarismLabel.style.color = "#00ff9d";
  }

  // Update matches list
  matchesList.innerHTML = plagiarismMatches
    .map(
      (match) => `
    <div class="match-item">
      <div class="match-header">
        <a href="${match.source}" target="_blank" class="match-source">${match.source}</a>
        <span class="match-similarity">${match.similarity}% Similar</span>
      </div>
      <div class="match-text">
        <mark>${match.text}</mark>
      </div>
    </div>
  `
    )
    .join("");
}

// Analytics Functions
function updateDistributionChart(
  distribution,
  { lowBar, mediumBar, highBar, lowValue, mediumValue, highValue }
) {
  const total = distribution.low + distribution.medium + distribution.high;
  if (total === 0) return;

  const lowPercent = (distribution.low / total) * 100;
  const mediumPercent = (distribution.medium / total) * 100;
  const highPercent = (distribution.high / total) * 100;

  lowBar.style.width = `${lowPercent}%`;
  mediumBar.style.width = `${mediumPercent}%`;
  highBar.style.width = `${highPercent}%`;

  lowValue.textContent = distribution.low;
  mediumValue.textContent = distribution.medium;
  highValue.textContent = distribution.high;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function updateRecentActivity(activities) {
  recentActivity.innerHTML = activities
    .map(
      (activity) => `
    <div class="activity-item">
      <div class="activity-info">
        <div class="activity-time">${formatTimestamp(activity.timestamp)}</div>
        <div class="activity-details">${
          activity.textLength
        } characters analyzed</div>
      </div>
      <div class="activity-scores">
        <div class="activity-score ai">
          <i class="fas fa-robot"></i>
          ${activity.aiScore}%
        </div>
        <div class="activity-score plagiarism">
          <i class="fas fa-copy"></i>
          ${activity.plagiarismMatches}
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

async function updatePersonalStats() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    console.warn("[Analytics] No user logged in");
    return;
  }

  const stats = await getUserStats(user.uid);
  if (!stats.success) {
    console.error("[Analytics] Failed to fetch user stats:", stats.error);
    return;
  }

  totalChecks.textContent = stats.totalChecks;
  avgAiScore.textContent = `${stats.averageAiScore}%`;
  plagiarismRate.textContent = `${stats.plagiarismRate}%`;

  updateDistributionChart(stats.aiScoreDistribution, {
    lowBar,
    mediumBar,
    highBar,
    lowValue,
    mediumValue,
    highValue,
  });

  updateRecentActivity(stats.recentActivity);
}

async function updateGlobalStats() {
  const stats = await getGlobalStats();
  if (!stats.success) {
    console.error("[Analytics] Failed to fetch global stats:", stats.error);
    return;
  }

  totalUsers.textContent = stats.uniqueUsers;
  globalChecks.textContent = stats.totalChecks;
  globalAiRate.textContent = `${stats.averageAiScore}%`;

  updateDistributionChart(stats.aiScoreDistribution, {
    lowBar: globalLowScoreBar,
    mediumBar: globalMediumScoreBar,
    highBar: globalHighScoreBar,
    lowValue: globalLowScoreValue,
    mediumValue: globalMediumScoreValue,
    highValue: globalHighScoreValue,
  });
}

async function analyze() {
  const text = textInput.value.trim();
  const words = countWords(text);

  if (words < MIN_WORDS) {
    alert(`Please enter at least ${MIN_WORDS} words for analysis.`);
    return;
  }

  if (isAnalyzing) return;
  isAnalyzing = true;

  // Show loading state
  emptyState.style.display = "none";
  resultsContent.style.display = "block";
  aiLabel.textContent = "Analyzing...";
  plagiarismLabel.textContent = "Analyzing...";
  scanBtn.disabled = true;

  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please sign in to use this feature.");
    }

    const result = await analyzeText(text, user.uid);

    if (!result.success) {
      throw new Error(result.error);
    }

    updateResults(result.aiMetrics, result.plagiarismMatches);
  } catch (error) {
    alert(error.message);
    clearAll();
  } finally {
    isAnalyzing = false;
    scanBtn.disabled = false;
  }
}

function clearAll() {
  textInput.value = "";
  updateWordCount();
  resultsContent.style.display = "none";
  emptyState.style.display = "block";
  scanBtn.disabled = false;
  isAnalyzing = false;
}

// Event Listeners
textInput.addEventListener("input", updateWordCount);
scanBtn.addEventListener("click", analyze);
clearBtn.addEventListener("click", clearAll);

// Analytics Tab Event Listeners
analyticsTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    analyticsTabs.forEach((t) => t.classList.remove("active"));
    analyticsContents.forEach((c) => c.classList.remove("active"));

    tab.classList.add("active");
    const tabId = tab.getAttribute("data-tab");
    document.getElementById(`${tabId}Stats`).classList.add("active");

    if (tabId === "personal") {
      updatePersonalStats();
    } else {
      updateGlobalStats();
    }
  });
});

// Initialize
updateWordCount();
updatePersonalStats();
updateGlobalStats();
