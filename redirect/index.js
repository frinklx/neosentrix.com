// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const destination = urlParams.get("to");
const message = urlParams.get("message") || "Redirecting...";
const submessage =
  urlParams.get("submessage") || "Please wait while we prepare your experience";

// Update messages
document.getElementById("redirectMessage").textContent = message;
document.getElementById("redirectSubMessage").textContent = submessage;

// Redirect after animation
setTimeout(() => {
  if (destination) {
    window.location.href = destination;
  } else {
    console.error("No destination provided for redirect");
    window.location.href = "/";
  }
}, 2000); // Wait for 2 seconds to show the animation
