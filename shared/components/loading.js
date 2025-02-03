// Loading Component
export function createLoadingScreen() {
  const loadingScreen = document.createElement("div");
  loadingScreen.className = "loading-screen";
  loadingScreen.innerHTML = `
    <div class="loading-content">
      <div class="loading-logo">
        <i class="fas fa-brain"></i>
      </div>
      <h2 class="loading-text">Loading...</h2>
      <div class="loading-progress">
        <div class="loading-progress-bar"></div>
      </div>
      <div class="loading-steps">
        <div class="loading-step active"></div>
        <div class="loading-step"></div>
        <div class="loading-step"></div>
      </div>
    </div>
  `;
  document.body.appendChild(loadingScreen);
}

// Toast Container Component
export function createToastContainer() {
  const toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  return toastContainer;
}

// Initialize Components
export function initializeComponents() {
  createLoadingScreen();
}

export function showLoading(message = "Loading...", submessage = "") {
  const loadingScreen = document.querySelector(".loading-screen");
  if (loadingScreen) {
    const textElement = loadingScreen.querySelector(".loading-text");
    const subtextElement = loadingScreen.querySelector(".loading-subtext");

    if (textElement) {
      textElement.textContent = message;
    }

    if (submessage) {
      if (!subtextElement) {
        const subtext = document.createElement("p");
        subtext.className = "loading-subtext";
        textElement.parentNode.insertBefore(subtext, textElement.nextSibling);
      }
      subtextElement.textContent = submessage;
    }

    loadingScreen.classList.add("visible");
  }
}

export function hideLoading() {
  const loadingScreen = document.querySelector(".loading-screen");
  if (loadingScreen) {
    loadingScreen.classList.remove("visible");
  }
}

export function updateLoadingProgress(progress) {
  const progressBar = document.querySelector(".loading-progress-bar");
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

export function updateLoadingSteps(step) {
  const steps = document.querySelectorAll(".loading-step");
  steps.forEach((stepElement, index) => {
    stepElement.classList.toggle("active", index <= step);
  });
}
