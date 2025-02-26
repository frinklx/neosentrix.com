// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  initializeRedirect();
  createParticles();
});

function initializeRedirect() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const destination = urlParams.get("to") || "/";
  const message = urlParams.get("message") || "Setting Up Your Workspace";
  const submessage =
    urlParams.get("submessage") ||
    "Please wait while we prepare your experience";

  // Update messages
  const messageElement = document.querySelector("h1");
  const submessageElement = document.querySelector("p");

  if (messageElement) messageElement.textContent = message;
  if (submessageElement) submessageElement.textContent = submessage;

  // Start progress animation
  animateProgress();

  // Redirect after animation
  setTimeout(() => {
    window.location.href = destination;
  }, 3000);
}

function animateProgress() {
  const progressFill = document.querySelector(".progress-fill");
  const statusMessage = document.querySelector(".status-message span");

  const messages = ["Initializing...", "Almost there...", "Redirecting..."];

  let progress = 0;
  const duration = 3000; // 3 seconds
  const interval = 30; // Update every 30ms
  const steps = duration / interval;
  const increment = 100 / steps;

  const updateProgress = () => {
    progress = Math.min(100, progress + increment);
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    // Update message based on progress
    if (statusMessage) {
      const messageIndex = Math.min(2, Math.floor(progress / 34));
      statusMessage.textContent = messages[messageIndex];
    }

    if (progress < 100) {
      requestAnimationFrame(() => setTimeout(updateProgress, interval));
    }
  };

  requestAnimationFrame(updateProgress);
}

function createParticles() {
  const particles = document.querySelector(".particles");
  if (!particles) return;

  const particleCount = Math.min(50, Math.floor(window.innerWidth / 30));

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.setProperty("--delay", `${Math.random() * 3}s`);
    particle.style.setProperty("--size", `${Math.random() * 1.5 + 0.5}px`);
    particle.style.left = `${Math.random() * 100}%`;
    particles.appendChild(particle);
  }
}
