// Newsletter Form Handling
document
  .getElementById("newsletterForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;

    // Here you would typically send this to your backend
    // For now, we'll just show a success message
    const button = e.target.querySelector("button");
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-check"></i> Subscribed!';
    button.style.backgroundColor = "rgba(0, 255, 0, 0.2)";

    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.backgroundColor = "";
      e.target.reset();
    }, 3000);
  });

// Animate elements when they come into view
const animateOnScroll = () => {
  const elements = document.querySelectorAll("[data-animate]");

  elements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top <= window.innerHeight * 0.8;

    if (isVisible) {
      const delay = element.getAttribute("data-delay") || 0;
      setTimeout(() => {
        element.classList.add(element.getAttribute("data-animate"));
      }, delay * 200);
    }
  });
};

// Initial check for animations
document.addEventListener("DOMContentLoaded", animateOnScroll);
window.addEventListener("scroll", animateOnScroll);

// Create a blog post preview effect
document.querySelectorAll(".blog-card").forEach((card) => {
  card.addEventListener("mouseenter", () => {
    card.style.transform = "translateY(-5px)";
    card.style.borderColor = "#00ff00";
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
    card.style.borderColor = "";
  });
});

// Add smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});
