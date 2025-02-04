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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let auth;
let firestore;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  initializeFirebase();
  setupEventListeners();
  initializeCharts();
});

async function initializeFirebase() {
  try {
    const { default: firebaseConfig } = await import(
      "../shared/utils/firebase-config.js"
    );
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);

    onAuthStateChanged(auth, handleAuthStateChange);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    showToast("Failed to initialize security features", "error");
  }
}

async function handleAuthStateChange(user) {
  try {
    if (!user) {
      window.location.href =
        "/redirect/index.html?to=/auth/login&message=Please log in";
      return;
    }

    const userDoc = await getDoc(doc(firestore, "users", user.uid));

    if (!userDoc.exists()) {
      window.location.href =
        "/redirect/index.html?to=/auth/signup/continue.html";
      return;
    }

    const userData = userDoc.data();

    if (!userData.isOnboardingComplete) {
      window.location.href = "/redirect/index.html?to=/onboarding";
      return;
    }

    updateUIWithUserData(userData);
    currentUser = user;
  } catch (error) {
    console.error("Error in auth state change:", error);
    showToast("Failed to verify your access", "error");
  }
}

function updateUIWithUserData(userData) {
  const userNameElement = document.getElementById("userName");
  if (userNameElement) {
    userNameElement.textContent =
      userData.displayName || userData.email.split("@")[0];
  }

  const avatarElement = document.getElementById("userAvatar");
  if (avatarElement) {
    const avatarSrc =
      userData.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        userData.email.split("@")[0]
      )}&background=00f2ff&color=000000`;
    avatarElement.src = avatarSrc;
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

function initializeCharts() {
  // Learning Activity Chart
  const activityCtx = document.getElementById("activityChart").getContext("2d");
  new Chart(activityCtx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Study Hours",
          data: [2.5, 3.2, 1.8, 4.0, 2.8, 3.5, 2.9],
          borderColor: "#00f2ff",
          backgroundColor: "rgba(0, 242, 255, 0.1)",
          tension: 0.4,
          fill: true,
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
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#a0a0a0",
          },
        },
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          ticks: {
            color: "#a0a0a0",
          },
        },
      },
    },
  });

  // Topics Performance Chart
  const topicsCtx = document.getElementById("topicsChart").getContext("2d");
  new Chart(topicsCtx, {
    type: "radar",
    data: {
      labels: [
        "Python",
        "JavaScript",
        "Data Structures",
        "Algorithms",
        "Web Dev",
        "Machine Learning",
      ],
      datasets: [
        {
          label: "Proficiency",
          data: [85, 70, 75, 65, 80, 60],
          backgroundColor: "rgba(0, 242, 255, 0.2)",
          borderColor: "#00f2ff",
          pointBackgroundColor: "#00f2ff",
          pointBorderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        r: {
          angleLines: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          pointLabels: {
            color: "#a0a0a0",
          },
          ticks: {
            color: "#a0a0a0",
            backdropColor: "transparent",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}
