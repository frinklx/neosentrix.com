// UI Utilities

// Show toast notification
export function showToast(message, type = "success") {
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

// Show loading screen with custom message
export async function showLoading(
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
export function hideLoading() {
  const loadingScreen = document.querySelector(".loading-screen");
  if (!loadingScreen) return;

  loadingScreen.classList.remove("visible");
  // Reset loading screen state
  const steps = loadingScreen.querySelectorAll(".loading-step");
  steps.forEach((step) => step.classList.remove("active"));
  steps[0].classList.add("active");
}

// Show error in loading screen
export function showLoadingError(error) {
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
