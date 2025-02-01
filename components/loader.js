// Function to load HTML components
async function loadComponent(elementId, componentPath) {
  try {
    const response = await fetch(componentPath);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;
  } catch (error) {
    console.error(`Error loading component ${componentPath}:`, error);
  }
}

// Function to fix relative paths based on current page depth
function fixRelativePaths() {
  const currentPath = window.location.pathname;
  const depth = currentPath.split("/").length - 2;
  const prefix = depth > 0 ? "../".repeat(depth) : "./";

  document.querySelectorAll('a[href^="/"]').forEach((link) => {
    if (!link.getAttribute("href").startsWith("//")) {
      link.href = prefix + link.getAttribute("href").substring(1);
    }
  });
}

// Load components when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  // Load navigation
  await loadComponent("nav-container", "/components/nav.html");

  // Load footer
  await loadComponent("footer-container", "/components/footer.html");

  // Fix relative paths
  fixRelativePaths();

  // Initialize navigation functionality
  initializeNavigation();
});

// Initialize navigation functionality
function initializeNavigation() {
  const currentPath = window.location.pathname;
  const currentPage = currentPath === "/" ? "home" : currentPath.split("/")[1];

  // Update active navigation link
  document.querySelectorAll(".nav-link").forEach((link) => {
    const page = link.getAttribute("data-page");
    if (page === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Mobile navigation toggle
  const mobileToggle = document.createElement("button");
  mobileToggle.className = "mobile-nav-toggle";
  mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
  document.querySelector(".nav-container").appendChild(mobileToggle);

  mobileToggle.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.toggle("show");
    mobileToggle.innerHTML = document
      .querySelector(".nav-links")
      .classList.contains("show")
      ? '<i class="fas fa-times"></i>'
      : '<i class="fas fa-bars"></i>';
  });

  // Close mobile menu on link click
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelector(".nav-links").classList.remove("show");
      mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
  });
}
