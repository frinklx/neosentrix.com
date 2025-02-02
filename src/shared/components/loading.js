// Loading Component
export function createLoadingScreen() {
  const loadingScreen = document.createElement("div");
  loadingScreen.className = "loading-screen";
  loadingScreen.innerHTML = `
    <div class="loading-content">
      <div class="loading-logo">
        <i class="fas fa-brain"></i>
      </div>
      <div class="loading-text">Preparing your experience...</div>
      <div class="loading-subtext">Setting up your personalized learning environment...</div>
      <div class="loading-progress">
        <div class="loading-progress-bar"></div>
      </div>
      <div class="loading-steps">
        <div class="loading-step active"></div>
        <div class="loading-step"></div>
        <div class="loading-step"></div>
        <div class="loading-step"></div>
      </div>
    </div>
  `;
  return loadingScreen;
}

// Toast Container Component
export function createToastContainer() {
  const toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  return toastContainer;
}

// Initialize Components
export function initializeComponents() {
  // Add loading screen to body if it doesn't exist
  if (!document.querySelector(".loading-screen")) {
    document.body.appendChild(createLoadingScreen());
  }

  // Add toast container to body if it doesn't exist
  if (!document.querySelector(".toast-container")) {
    document.body.appendChild(createToastContainer());
  }
}
