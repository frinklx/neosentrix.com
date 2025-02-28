import {
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function fetchQuizAnalytics(userId, days = 30) {
  const db = getFirestore();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const q = query(
    collection(db, "quiz_analytics"),
    where("userId", "==", userId),
    where("timestamp", ">=", startDate),
    orderBy("timestamp", "desc")
  );

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("[Analytics] Error fetching quiz data:", error);
    return [];
  }
}

function updateQuizPerformanceChart(data) {
  const ctx = document.getElementById("quizScoreChart").getContext("2d");

  const scores = data.map((quiz) => quiz.quizStats.scorePercentage);
  const dates = data.map((quiz) =>
    new Date(quiz.timestamp.toDate()).toLocaleDateString()
  );

  new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Quiz Score %",
          data: scores,
          borderColor: "rgb(176, 0, 255)",
          backgroundColor: "rgba(176, 0, 255, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: "Quiz Performance Over Time",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
}

function updateQuestionTypeChart(data) {
  const ctx = document.getElementById("questionTypeChart").getContext("2d");

  const questionTypes = data.reduce((acc, quiz) => {
    const types = quiz.quizStats.questionTypes;
    Object.keys(types).forEach((type) => {
      acc[type] = (acc[type] || 0) + types[type];
    });
    return acc;
  }, {});

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(questionTypes).map((type) =>
        type === "mcq"
          ? "Multiple Choice"
          : type === "true_false"
          ? "True/False"
          : "Fill in Blanks"
      ),
      datasets: [
        {
          data: Object.values(questionTypes),
          backgroundColor: [
            "rgba(176, 0, 255, 0.8)",
            "rgba(0, 242, 255, 0.8)",
            "rgba(255, 78, 78, 0.8)",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "right",
        },
      },
    },
  });
}

function updateTimeAnalysisChart(data) {
  const ctx = document.getElementById("timeAnalysisChart").getContext("2d");

  const avgTimes = data.map((quiz) => {
    const duration = quiz.quizStats.duration;
    return duration / (60 * 1000); // Convert to minutes
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((quiz) =>
        new Date(quiz.timestamp.toDate()).toLocaleDateString()
      ),
      datasets: [
        {
          label: "Time Spent (minutes)",
          data: avgTimes,
          backgroundColor: "rgba(0, 242, 255, 0.8)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function updateSuccessRateCharts(data) {
  const questionStats = data.flatMap((quiz) => quiz.questionStats);

  const typeStats = {
    mcq: { correct: 0, total: 0 },
    true_false: { correct: 0, total: 0 },
    fill_blanks: { correct: 0, total: 0 },
  };

  questionStats.forEach((stat) => {
    const type = stat.type || "mcq"; // Default to mcq if type is not specified
    typeStats[type].total++;
    if (stat.isCorrect) typeStats[type].correct++;
  });

  // Create donut charts for each question type
  Object.entries(typeStats).forEach(([type, stats]) => {
    const rate = (stats.correct / stats.total) * 100 || 0;
    const chartId =
      type === "mcq"
        ? "mcqSuccessChart"
        : type === "true_false"
        ? "tfSuccessChart"
        : "fibSuccessChart";

    const ctx = document.getElementById(chartId).getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Correct", "Incorrect"],
        datasets: [
          {
            data: [rate, 100 - rate],
            backgroundColor: [
              "rgba(0, 255, 157, 0.8)",
              "rgba(255, 78, 78, 0.8)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        cutout: "70%",
      },
    });
  });
}

function updateQuickStats(data) {
  const totalQuizzes = data.length;
  const avgScore =
    data.reduce((acc, quiz) => acc + quiz.quizStats.scorePercentage, 0) /
    totalQuizzes;

  const totalQuestions = data.reduce(
    (acc, quiz) => acc + quiz.quizStats.totalQuestions,
    0
  );

  const completedQuizzes = data.filter((quiz) =>
    quiz.userInteractions.some((i) => i.type === "quiz_completed")
  ).length;
  const completionRate = (completedQuizzes / totalQuizzes) * 100;

  document.getElementById("totalQuizzes").textContent = totalQuizzes;
  document.getElementById("avgScore").textContent = `${Math.round(avgScore)}%`;
  document.getElementById("totalQuestions").textContent = totalQuestions;
  document.getElementById("completionRate").textContent = `${Math.round(
    completionRate
  )}%`;
}

function updateRecentActivity(data) {
  const activityList = document.getElementById("recentQuizActivity");
  activityList.innerHTML = "";

  data.slice(0, 5).forEach((quiz) => {
    const date = new Date(quiz.timestamp.toDate()).toLocaleString();
    const score = quiz.quizStats.scorePercentage;
    const questions = quiz.quizStats.totalQuestions;

    const activityItem = document.createElement("div");
    activityItem.className = "activity-item";
    activityItem.innerHTML = `
      <div class="activity-icon ${score >= 70 ? "success" : "warning"}">
        <i class="fas fa-${score >= 70 ? "trophy" : "exclamation-circle"}"></i>
      </div>
      <div class="activity-details">
        <div class="activity-title">
          Completed Quiz (${questions} questions)
        </div>
        <div class="activity-meta">
          Score: ${Math.round(score)}% • ${date}
        </div>
      </div>
    `;

    activityList.appendChild(activityItem);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // ... existing initialization code ...

  // Add quiz analytics initialization
  const timeRangeSelect = document.getElementById("quizTimeRange");
  if (timeRangeSelect) {
    timeRangeSelect.addEventListener("change", async () => {
      const days = parseInt(timeRangeSelect.value);
      const quizData = await fetchQuizAnalytics(currentUser.uid, days);
      updateDashboardCharts(quizData);
    });
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const quizData = await fetchQuizAnalytics(user.uid, 30);
    updateDashboardCharts(quizData);
  }
});

function updateDashboardCharts(data) {
  if (!data || data.length === 0) return;

  updateQuizPerformanceChart(data);
  updateQuestionTypeChart(data);
  updateTimeAnalysisChart(data);
  updateSuccessRateCharts(data);
  updateQuickStats(data);
  updateRecentActivity(data);
}
