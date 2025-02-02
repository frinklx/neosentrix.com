// UI Utilities

// Toast container
let toastContainer;

// Create toast container if it doesn't exist
function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
    console.log("[UI] Toast container created");
  }
}

// Show toast notification
export function showToast(message, type = "info") {
  console.log(`[UI] Showing toast: ${message} (${type})`);
  ensureToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
        <i class="fas fa-${
          type === "error"
            ? "exclamation-circle"
            : type === "success"
            ? "check-circle"
            : "info-circle"
        }"></i>
        <span>${message}</span>
    `;

  toastContainer.appendChild(toast);

  // Trigger reflow for animation
  toast.offsetHeight;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Loading screen
let loadingScreen;
let loadingTimeout;

// Create loading screen if it doesn't exist
function ensureLoadingScreen() {
  if (!loadingScreen) {
    loadingScreen = document.createElement("div");
    loadingScreen.className = "loading-screen";
    loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading...</div>
                <div class="loading-subtext"></div>
                <div class="loading-progress">
                    <div class="loading-progress-bar"></div>
                </div>
            </div>
        `;
    document.body.appendChild(loadingScreen);
    console.log("[UI] Loading screen created");
  }
}

// Show loading screen with optional custom message and submessage
export function showLoading(message = "Loading...", submessage = "") {
  console.log("[UI] Showing loading screen:", { message, submessage });
  ensureLoadingScreen();

  const textElement = loadingScreen.querySelector(".loading-text");
  const subtextElement = loadingScreen.querySelector(".loading-subtext");

  if (textElement) textElement.textContent = message;
  if (subtextElement) subtextElement.textContent = submessage;

  loadingScreen.classList.add("show");

  // Set a timeout to auto-hide after 10 seconds
  if (loadingTimeout) clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(() => {
    console.log("[UI] Loading screen timeout - auto-hiding");
    hideLoading();
    showToast("Operation timed out", "error");
  }, 10000);
}

// Hide loading screen
export function hideLoading() {
  console.log("[UI] Hiding loading screen");
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
  if (loadingScreen) {
    loadingScreen.classList.remove("show");
  }
}

// Show error in loading screen
export function showLoadingError(error) {
  console.log("[UI] Showing loading error:", error);
  ensureLoadingScreen();

  const textElement = loadingScreen.querySelector(".loading-text");
  const subtextElement = loadingScreen.querySelector(".loading-subtext");
  const progressElement = loadingScreen.querySelector(".loading-progress");

  if (textElement) {
    textElement.textContent = "Oops! Something went wrong";
    textElement.style.color = "var(--error-color)";
  }
  if (subtextElement) {
    subtextElement.textContent = error.message;
  }
  if (progressElement) {
    progressElement.style.display = "none";
  }

  loadingScreen.classList.add("show");
  setTimeout(() => {
    hideLoading();
    showToast(error.message, "error");
  }, 3000);
}
