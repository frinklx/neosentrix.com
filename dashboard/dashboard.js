import { showToast, showLoading, hideLoading } from "../shared/utils/ui.js";
import { redirectTo } from "../shared/utils/routes.js";

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "../shared/utils/firebase-config.js";

// Initialize Firebase
console.log("[Dashboard] Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

function updateUIWithUserData(userData) {
  try {
    console.log("[Dashboard] Updating UI with user data:", userData);
    const userName = document.getElementById("userName");
    const userInitials = document.getElementById("userInitials");
    const welcomeMessage = document.getElementById("welcomeMessage");

    if (!userData) {
      console.warn("[Dashboard] No user data provided");
      return;
    }

    const displayName =
      userData.displayName ||
      (userData.email ? userData.email.split("@")[0] : "User");
    const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    if (userName) userName.textContent = displayName;
    if (userInitials) userInitials.textContent = initials;
    if (welcomeMessage)
      welcomeMessage.textContent = `Welcome Back, ${displayName}!`;
  } catch (error) {
    console.error("[Dashboard] Error updating UI:", error);
  }
}

async function handleAuthStateChange(user) {
  try {
    console.log(
      "[Dashboard] Auth state changed:",
      user ? "User logged in" : "No user"
    );

    if (!user) {
      window.location.href =
        "/auth/login?message=Please log in to access the dashboard";
      return;
    }

    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      console.log("[Dashboard] No user document found, creating one...");
      // Create a new user document
      try {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          createdAt: new Date().getTime(),
          lastLogin: new Date().getTime(),
        });
      } catch (error) {
        console.error("[Dashboard] Error creating user document:", error);
      }
    }

    const userData = userDoc.exists()
      ? userDoc.data()
      : {
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
        };

    currentUser = user;

    // Update UI with user data
    updateUIWithUserData({
      ...userData,
      email: user.email,
      displayName:
        userData.displayName || user.displayName || user.email.split("@")[0],
    });

    // Fetch and display analytics
    const analytics = await getUserAnalytics(user.uid);
    if (analytics) {
      // Update stats
      document.getElementById("timeLearning").textContent = `${
        typeof analytics.studyTime === "number"
          ? analytics.studyTime.toFixed(1)
          : "0"
      } hrs`;
      document.getElementById("timeProgress").textContent =
        analytics.timeProgress;
      document.getElementById("flashcardsCreated").textContent =
        analytics.flashcardsCreated;
      document.getElementById("flashcardsProgress").textContent =
        analytics.flashcardsProgress;
      document.getElementById(
        "learningStreak"
      ).textContent = `${analytics.learningStreak} days`;

      // Initialize charts
      initializeCharts(analytics);
    }

    // Add these lines after loading the user profile
    await loadUserStats(user.uid);
    setupStatsListener(user.uid);

    // Welcome message with gradient effect
    if (welcomeMessage) {
      welcomeMessage.style.backgroundSize = "200% auto";
    }
  } catch (error) {
    console.error("[Dashboard] Error in auth state change:", error);
    showToast(
      "Error loading dashboard data. Please refresh the page.",
      "error"
    );
  }
}

function setupEventListeners() {
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

async function handleLogout() {
  try {
    showLoading("Logging out...", "Please wait");
    await signOut(auth);
    window.location.href =
      "/redirect/index.html?to=/auth/login&message=Logged out successfully";
  } catch (error) {
    console.error("Error during logout:", error);
    showToast("Failed to log out", "error");
    hideLoading();
  }
}

function initializeCharts(analytics) {
  // Activity Timeline Chart
  const activityCtx = document
    .getElementById("activityChart")
    ?.getContext("2d");
  if (activityCtx) {
    new Chart(activityCtx, {
      type: "line",
      data: {
        labels: analytics.activityData.dates,
        datasets: [
          {
            label: "Daily Activities",
            data: analytics.activityData.counts,
            borderColor: "#00f2ff",
            backgroundColor: "rgba(0, 242, 255, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
          },
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            callbacks: {
              label: function (context) {
                return `Activities: ${context.raw}`;
              },
            },
          },
        },
      },
    });
  }

  // Tool Usage Chart (replacing the topics chart)
  const toolUsageCtx = document.getElementById("topicsChart")?.getContext("2d");
  if (toolUsageCtx) {
    new Chart(toolUsageCtx, {
      type: "bar",
      data: analytics.toolUsageData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
          },
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: "Time Spent on Tools (minutes)",
            color: "rgba(255, 255, 255, 0.7)",
            font: {
              size: 14,
            },
          },
        },
      },
    });
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function calculateStreak(activities) {
  if (!activities || !activities.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let currentDate = today;
  const activityDates = new Set(
    activities.map((a) => {
      const date = new Date(a.timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  while (activityDates.has(currentDate.getTime())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return streak;
}

async function getUserAnalytics(userId) {
  try {
    console.log("[Dashboard] Fetching user analytics...");

    // Show loading state
    document
      .querySelectorAll(".stats-grid, .charts-section")
      .forEach((section) => {
        section.style.opacity = "0.5";
      });

    // Get detector analytics
    let detectorDocs = [];
    try {
      const detectorQuery = query(
        collection(db, "analysis_history"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );
      detectorDocs = (await getDocs(detectorQuery)).docs;
    } catch (error) {
      console.warn("[Dashboard] Error fetching detector analytics:", error);
    }

    // Get flashcards analytics
    let flashcardsDocs = [];
    try {
      const flashcardsQuery = query(
        collection(db, "flashcards"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );
      flashcardsDocs = (await getDocs(flashcardsQuery)).docs;
    } catch (error) {
      console.warn("[Dashboard] Error fetching flashcards analytics:", error);
    }

    // Calculate analytics
    const allActivities = [];
    let totalStudyTime = 0;
    let flashcardsCount = 0;
    const activityDates = new Map();
    const aiScores = [];
    const weeklyActivity = new Array(7).fill(0);

    // Tool usage stats
    let detectorStats = {
      totalChecks: 0,
      aiDetections: 0,
      plagiarismDetections: 0,
      timeSpent: 0,
      averageAiScore: 0,
      averagePlagiarismScore: 0,
      totalCharactersScanned: 0,
      highAiScoreCount: 0, // > 70%
      mediumAiScoreCount: 0, // 30-70%
      lowAiScoreCount: 0, // < 30%
    };

    let flashcardsStats = {
      totalSets: 0,
      totalCards: 0,
      timeSpent: 0,
      averageCardsPerSet: 0,
      totalCharactersProcessed: 0,
      byType: {
        definition: 0,
        concept: 0,
        example: 0,
        relationship: 0,
        fillIn: 0,
      },
    };

    // Process detector activities
    detectorDocs.forEach((doc) => {
      const data = doc.data();
      if (data.success) {
        const studyTime = data.studyTime || 5;
        totalStudyTime += studyTime;
        detectorStats.timeSpent += studyTime;
        detectorStats.totalChecks++;

        if (data.aiScore) {
          aiScores.push(data.aiScore);
          detectorStats.aiDetections++;

          // Categorize AI scores
          if (data.aiScore > 70) detectorStats.highAiScoreCount++;
          else if (data.aiScore > 30) detectorStats.mediumAiScoreCount++;
          else detectorStats.lowAiScoreCount++;
        }

        if (data.plagiarismScore) {
          detectorStats.plagiarismDetections++;
          detectorStats.averagePlagiarismScore += data.plagiarismScore;
        }

        if (data.textLength) {
          detectorStats.totalCharactersScanned += data.textLength;
        }

        const date = new Date(data.timestamp);
        const dayOfWeek = date.getDay();
        weeklyActivity[dayOfWeek]++;

        const dateStr = date.toLocaleDateString();
        activityDates.set(
          dateStr,
          (activityDates.get(dateStr) || 0) + studyTime / 60
        );

        allActivities.push({
          type: "detector",
          timestamp: data.timestamp,
          studyTime,
          aiScore: data.aiScore,
          plagiarismScore: data.plagiarismScore,
          textLength: data.textLength,
        });
      }
    });

    // Process flashcards activities
    flashcardsDocs.forEach((doc) => {
      const data = doc.data();
      if (data.cards && Array.isArray(data.cards)) {
        flashcardsStats.totalSets++;
        flashcardsStats.totalCards += data.cards.length;
        flashcardsCount += data.cards.length;

        const studyTime = data.studyTime || data.cards.length * 2;
        totalStudyTime += studyTime;
        flashcardsStats.timeSpent += studyTime;

        // Track card types
        data.cards.forEach((card) => {
          if (card.type) {
            flashcardsStats.byType[card.type] =
              (flashcardsStats.byType[card.type] || 0) + 1;
          }
          if (card.front) {
            flashcardsStats.totalCharactersProcessed += card.front.length;
          }
          if (card.back) {
            flashcardsStats.totalCharactersProcessed += card.back.length;
          }
        });

        const date = new Date(data.timestamp);
        const dayOfWeek = date.getDay();
        weeklyActivity[dayOfWeek]++;

        const dateStr = date.toLocaleDateString();
        activityDates.set(
          dateStr,
          (activityDates.get(dateStr) || 0) + studyTime / 60
        );

        allActivities.push({
          type: "flashcards",
          timestamp: data.timestamp,
          studyTime,
          cardsCount: data.cards.length,
        });
      }
    });

    // Calculate averages and percentages
    if (detectorStats.aiDetections > 0) {
      detectorStats.averageAiScore = Math.round(
        aiScores.reduce((a, b) => a + b, 0) / detectorStats.aiDetections
      );
    }
    if (detectorStats.plagiarismDetections > 0) {
      detectorStats.averagePlagiarismScore = Math.round(
        detectorStats.averagePlagiarismScore /
          detectorStats.plagiarismDetections
      );
    }
    if (flashcardsStats.totalSets > 0) {
      flashcardsStats.averageCardsPerSet = Math.round(
        flashcardsStats.totalCards / flashcardsStats.totalSets
      );
    }

    // Sort activities by date
    allActivities.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate streak
    const streak = calculateStreak(allActivities);

    // Prepare weekly activity data
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date().getDay();
    const reorderedWeekDays = [
      ...weekDays.slice(today + 1),
      ...weekDays.slice(0, today + 1),
    ];
    const reorderedActivity = [
      ...weeklyActivity.slice(today + 1),
      ...weeklyActivity.slice(0, today + 1),
    ];

    // Calculate study time in hours
    const studyTimeHours = totalStudyTime / 60;

    // Calculate time progress
    const timeProgress = calculateTimeProgress(studyTimeHours);

    // Prepare tool usage data for the new chart
    const toolUsageData = {
      labels: ["AI Detector", "Plagiarism", "Flashcards"],
      datasets: [
        {
          label: "Time Spent (minutes)",
          data: [
            detectorStats.timeSpent,
            detectorStats.timeSpent, // Same as AI since they're checked together
            flashcardsStats.timeSpent,
          ],
          backgroundColor: [
            "rgba(0, 242, 255, 0.2)",
            "rgba(255, 78, 78, 0.2)",
            "rgba(0, 255, 157, 0.2)",
          ],
          borderColor: ["#00f2ff", "#ff4e4e", "#00ff9d"],
          borderWidth: 1,
        },
      ],
    };

    // Restore opacity
    document
      .querySelectorAll(".stats-grid, .charts-section")
      .forEach((section) => {
        section.style.opacity = "1";
      });

    return {
      studyTime: studyTimeHours,
      timeProgress,
      flashcardsCreated: flashcardsCount,
      flashcardsProgress: `↑ ${flashcardsCount} total`,
      learningStreak: streak,
      activityData: {
        dates: reorderedWeekDays,
        counts: reorderedActivity,
      },
      toolUsageData,
      detectorStats,
      flashcardsStats,
      totalChecks: detectorStats.totalChecks,
      averageAiScore: detectorStats.averageAiScore,
    };
  } catch (error) {
    console.error("[Dashboard] Error fetching analytics:", error);
    showToast("Failed to load analytics. Please try again later.", "error");
    return defaultAnalytics();
  }
}

function calculateTimeProgress(hours) {
  if (hours === 0) return "Just getting started";
  if (hours < 1) return "First hour of learning";
  if (hours < 5) return "Building momentum";
  if (hours < 10) return "Making progress";
  if (hours < 20) return "Dedicated learner";
  if (hours < 50) return "Knowledge explorer";
  return "Learning master";
}

function defaultAnalytics() {
  return {
    studyTime: 0,
    timeProgress: "Just getting started",
    flashcardsCreated: 0,
    flashcardsProgress: "No cards yet",
    learningStreak: 0,
    activityData: {
      dates: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      counts: [0, 0, 0, 0, 0, 0, 0],
    },
    toolUsageData: {
      labels: ["AI Detector", "Plagiarism", "Flashcards"],
      datasets: [
        {
          label: "Time Spent (minutes)",
          data: [0, 0, 0],
          backgroundColor: [
            "rgba(0, 242, 255, 0.2)",
            "rgba(255, 78, 78, 0.2)",
            "rgba(0, 255, 157, 0.2)",
          ],
          borderColor: ["#00f2ff", "#ff4e4e", "#00ff9d"],
          borderWidth: 1,
        },
      ],
    },
    detectorStats: {
      totalChecks: 0,
      aiDetections: 0,
      plagiarismDetections: 0,
      timeSpent: 0,
      averageAiScore: 0,
      averagePlagiarismScore: 0,
      totalCharactersScanned: 0,
      highAiScoreCount: 0,
      mediumAiScoreCount: 0,
      lowAiScoreCount: 0,
    },
    flashcardsStats: {
      totalSets: 0,
      totalCards: 0,
      timeSpent: 0,
      averageCardsPerSet: 0,
      totalCharactersProcessed: 0,
      byType: {
        definition: 0,
        concept: 0,
        example: 0,
        relationship: 0,
        fillIn: 0,
      },
    },
    totalChecks: 0,
    averageAiScore: 0,
  };
}

function updateActivityList(activities) {
  if (!activities || !activities.length) {
    recentActivity.innerHTML =
      '<div class="no-activity">No recent activity</div>';
    return;
  }

  recentActivity.innerHTML = activities
    .map((activity) => {
      const icon =
        activity.type === "detector" ? "fa-magnifying-glass" : "fa-cards";
      const scoreDisplay =
        activity.type === "detector"
          ? `<div class="activity-scores">
            <span class="score ai">AI: ${activity.aiScore}%</span>
            <span class="score plagiarism">Matches: ${activity.plagiarismMatches}</span>
           </div>`
          : "";

      return `
        <div class="activity-item">
          <div class="activity-info">
            <div class="activity-time">
              <i class="fas ${icon}"></i>
              ${formatTimestamp(activity.timestamp)}
            </div>
            <div class="activity-details">${activity.details}</div>
          </div>
          ${scoreDisplay}
        </div>
      `;
    })
    .join("");
}

// Set up auth state listener
onAuthStateChanged(auth, handleAuthStateChange);

// Auto-refresh analytics every 5 minutes if user is logged in
setInterval(async () => {
  const user = auth.currentUser;
  if (user) {
    const analytics = await getUserAnalytics(user.uid);
    if (analytics) {
      learningStreak.textContent = `${analytics.streak} days`;
      timeLearning.textContent = formatDuration(analytics.timeLearning);
      toolsUsed.textContent = analytics.toolsUsed;
      documentsChecked.textContent = analytics.documentsChecked;
      flashcardsCreated.textContent = analytics.flashcardsCreated;
      averageAiScore.textContent = `${analytics.averageAiScore}%`;
      updateActivityList(analytics.recentActivity);
      initializeCharts(analytics);
    }
  }
}, 5 * 60 * 1000);

// Add logout functionality
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", async () => {
  try {
    showLoading("Logging out...");
    await signOut(auth);
    window.location.href = "/auth/login?message=Logged out successfully";
  } catch (error) {
    console.error("[Dashboard] Error during logout:", error);
    showToast("Failed to log out", "error");
    hideLoading();
  }
});

// Add these functions after your existing code
async function loadUserStats(userId) {
  try {
    const userStatsRef = doc(db, "userStats", userId);
    const statsDoc = await getDoc(userStatsRef);

    if (statsDoc.exists()) {
      const stats = statsDoc.data();

      // Update AI Processing Stats
      document.getElementById("aiProcessed").textContent =
        stats.aiProcessed || 0;
      document.getElementById("aiProgress").textContent = `↑ ${
        stats.aiProcessedToday || 0
      } today`;
      document.getElementById("aiSuccessRate").textContent = `${
        stats.aiSuccessRate || 0
      }%`;
      document.getElementById("aiProcessingTime").textContent = `${
        stats.avgProcessingTime || 0
      }s`;

      // Update Plagiarism Check Stats
      document.getElementById("plagiarismChecks").textContent =
        stats.plagiarismChecks || 0;
      document.getElementById("plagiarismProgress").textContent = `↑ ${
        stats.checksToday || 0
      } today`;
      document.getElementById("plagiarismRate").textContent = `${
        stats.plagiarismDetectionRate || 0
      }%`;
      document.getElementById("aiContentRate").textContent = `${
        stats.aiContentRate || 0
      }%`;

      // Update Total Documents
      document.getElementById("totalDocuments").textContent =
        stats.totalDocuments || 0;
      document.getElementById("documentsProgress").textContent = `↑ ${
        stats.documentsToday || 0
      } today`;

      // Add trend classes based on progress
      updateTrendClasses("aiProgress", stats.aiProcessedToday);
      updateTrendClasses("plagiarismProgress", stats.checksToday);
      updateTrendClasses("documentsProgress", stats.documentsToday);
    }
  } catch (error) {
    console.error("Error loading user stats:", error);
  }
}

function updateTrendClasses(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.classList.remove("positive", "negative");
  if (value > 0) {
    element.classList.add("positive");
  } else if (value < 0) {
    element.classList.add("negative");
  }
}

// Real-time updates for stats
function setupStatsListener(userId) {
  const userStatsRef = doc(db, "userStats", userId);

  onSnapshot(
    userStatsRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const stats = docSnapshot.data();

        // Update stats in real-time
        document.getElementById("aiProcessed").textContent =
          stats.aiProcessed || 0;
        document.getElementById("plagiarismChecks").textContent =
          stats.plagiarismChecks || 0;
        document.getElementById("totalDocuments").textContent =
          stats.totalDocuments || 0;

        // Update detailed stats
        document.getElementById("aiSuccessRate").textContent = `${
          stats.aiSuccessRate || 0
        }%`;
        document.getElementById("aiProcessingTime").textContent = `${
          stats.avgProcessingTime || 0
        }s`;
        document.getElementById("plagiarismRate").textContent = `${
          stats.plagiarismDetectionRate || 0
        }%`;
        document.getElementById("aiContentRate").textContent = `${
          stats.aiContentRate || 0
        }%`;
      }
    },
    (error) => {
      console.error("Error setting up stats listener:", error);
    }
  );
}
