// UI Utilities

// Toast notifications
let toastContainer;

export function showToast(message, type = "success", duration = 3000) {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
        <i class="fas ${
          type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
        }"></i>
        <span>${message}</span>
    `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toastContainer.removeChild(toast);
      if (toastContainer.children.length === 0) {
        document.body.removeChild(toastContainer);
        toastContainer = null;
      }
    }, 300);
  }, duration);
}

// Loading screen
let loadingScreen;

export function showLoading(message = "Loading...", submessage = "") {
  if (!loadingScreen) {
    loadingScreen = document.createElement("div");
    loadingScreen.className = "loading-screen";
    loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-logo">
                    <i class="fas fa-brain"></i>
                </div>
                <h2 class="loading-text">${message}</h2>
                ${
                  submessage
                    ? `<p class="loading-subtext">${submessage}</p>`
                    : ""
                }
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
    setTimeout(() => loadingScreen.classList.add("visible"), 0);
  }
}

export function hideLoading() {
  if (loadingScreen) {
    loadingScreen.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(loadingScreen);
      loadingScreen = null;
    }, 300);
  }
}

// Form validation
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

// DOM utilities
export function createElement(tag, className, innerHTML = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}
