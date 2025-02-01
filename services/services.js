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

// FAQ Accordion functionality
document.querySelectorAll(".faq-item").forEach((item) => {
  const question = item.querySelector(".faq-question");
  const answer = item.querySelector(".faq-answer");

  // Initially hide all answers
  answer.style.maxHeight = "0";
  answer.style.overflow = "hidden";
  answer.style.transition = "max-height 0.3s ease";

  question.addEventListener("click", () => {
    const isOpen = answer.style.maxHeight !== "0px";

    // Close all other answers
    document.querySelectorAll(".faq-answer").forEach((a) => {
      a.style.maxHeight = "0";
    });

    // Toggle current answer
    if (!isOpen) {
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
});

// Service card hover effects
document.querySelectorAll(".service-card").forEach((card) => {
  card.addEventListener("mouseenter", () => {
    const icon = card.querySelector(".service-icon i");
    icon.style.transform = "scale(1.2)";
    icon.style.transition = "transform 0.3s ease";
  });

  card.addEventListener("mouseleave", () => {
    const icon = card.querySelector(".service-icon i");
    icon.style.transform = "scale(1)";
  });
});

// Process step hover effects
document.querySelectorAll(".process-step").forEach((step) => {
  step.addEventListener("mouseenter", () => {
    const number = step.querySelector(".step-number");
    number.style.transform = "translateY(-5px)";
    number.style.transition = "transform 0.3s ease";
  });

  step.addEventListener("mouseleave", () => {
    const number = step.querySelector(".step-number");
    number.style.transform = "translateY(0)";
  });
});

// Smooth scroll for anchor links
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
