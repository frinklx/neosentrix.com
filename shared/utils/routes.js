// Routes Configuration
export const ROUTES = {
  DASHBOARD: "/dashboard",
  ONBOARDING: "/onboarding",
  CONTINUE_SIGNUP: "/auth/signup/continue.html",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  HOME: "/",
  ABOUT: "/about",
  FEATURES: "/features",
  PRIVACY: "/privacy",
  TERMS: "/terms",
};

// Handle navigation with error checking
export async function navigateTo(route, options = {}) {
  try {
    if (options.loading) {
      await showLoading(options.loadingMessage, options.loadingSubmessage);
    }

    // Check if route exists
    if (route.endsWith(".html") || route === "/" || route.startsWith("/")) {
      window.location.href = route;
    } else {
      throw new Error("Invalid route");
    }
  } catch (error) {
    hideLoading();
    showToast(error.message, "error");
    // Fallback to a safe route
    window.location.href = ROUTES.LOGIN;
  }
}
