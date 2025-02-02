// Route definitions
export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login/",
  SIGNUP: "/auth/signup/",
  CONTINUE_SIGNUP: "/auth/signup/continue.html",
  DASHBOARD: "/dashboard/",
  ONBOARDING: "/onboarding/",
  ABOUT: "/about",
  FEATURES: "/features",
  PRIVACY: "/privacypolicy",
  TERMS: "/tos",
};

// Navigate to a route with history
export function navigateTo(path) {
  console.log("[Routes] Navigating to:", path);
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
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
