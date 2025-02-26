// Define application routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  CONTINUE_SIGNUP: "/auth/signup/continue.html",
  DASHBOARD: "/dashboard",
  ONBOARDING: "/onboarding",
  ABOUT: "/about",
  FEATURES: "/features",
  PRIVACY: "/privacypolicy",
  TERMS: "/tos",
};

// Navigation helper
export function navigateTo(route, options = {}) {
  if (options.loading) {
    const loadingOverlay = document.querySelector(".loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <h3>${options.loadingMessage || "Loading..."}</h3>
          ${
            options.loadingSubmessage
              ? `<p>${options.loadingSubmessage}</p>`
              : ""
          }
        </div>
      `;
      loadingOverlay.style.display = "flex";
    }
  }

  setTimeout(() => {
    window.location.href = route;
  }, 500);
}

// Redirect to a route (replaces history)
export function redirectTo(path) {
  console.log("[Routes] Redirecting to:", path);
  window.location.href = path;
}

// Handle navigation with error checking
export async function navigateToWithErrorChecking(route, options = {}) {
  try {
    if (options.loading) {
      await showLoading(options.loadingMessage, options.loadingSubmessage);
    }

    // Check if route exists
    if (route.endsWith(".html") || route === "/" || route.startsWith("/")) {
      redirectTo(route);
    } else {
      throw new Error("Invalid route");
    }
  } catch (error) {
    hideLoading();
    showToast(error.message, "error");
    // Fallback to a safe route
    redirectTo(ROUTES.LOGIN);
  }
}

// Navigation utilities
export function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

export function buildUrl(base, params = {}) {
  const url = new URL(base, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

// Path utilities
export function getBasePath() {
  return window.location.pathname.split("/").slice(0, -1).join("/");
}

export function joinPaths(...paths) {
  return paths
    .map((path) => path.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

// Route guards
export function requireAuth(redirectPath = "/auth/login") {
  if (!localStorage.getItem("user")) {
    redirectTo(redirectPath);
    return false;
  }
  return true;
}

export function preventAuthenticatedAccess(redirectPath = "/dashboard") {
  if (localStorage.getItem("user")) {
    redirectTo(redirectPath);
    return false;
  }
  return true;
}
