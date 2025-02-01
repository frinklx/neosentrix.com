// Animate sections on scroll
const animateSections = () => {
  const sections = document.querySelectorAll("[data-animate]");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate");
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  sections.forEach((section) => {
    observer.observe(section);
  });
};

// Add hover effects to resource cards
const addCardHoverEffects = () => {
  const cards = document.querySelectorAll(".resource-card");

  cards.forEach((card) => {
    const icon = card.querySelector(".resource-icon");

    card.addEventListener("mouseenter", () => {
      icon.style.transform = "scale(1.1) rotate(5deg)";
      icon.style.transition = "transform 0.3s ease";
    });

    card.addEventListener("mouseleave", () => {
      icon.style.transform = "scale(1) rotate(0deg)";
    });
  });
};

// Add hover effects to extension items
const addExtensionHoverEffects = () => {
  const extensions = document.querySelectorAll(".extension-item");

  extensions.forEach((extension) => {
    extension.addEventListener("mouseenter", () => {
      extension.style.transform = "translateY(-5px)";
      extension.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
    });

    extension.addEventListener("mouseleave", () => {
      extension.style.transform = "translateY(0)";
      extension.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
    });
  });
};

// Add hover effects to guide items
const addGuideHoverEffects = () => {
  const guides = document.querySelectorAll(".guide-item");

  guides.forEach((guide) => {
    guide.addEventListener("mouseenter", () => {
      guide.style.transform = "translateY(-5px)";
      guide.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
    });

    guide.addEventListener("mouseleave", () => {
      guide.style.transform = "translateY(0)";
      guide.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
    });
  });
};

// Add smooth scrolling to anchor links
const addSmoothScrolling = () => {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
};

// Initialize all functionality
document.addEventListener("DOMContentLoaded", () => {
  animateSections();
  addCardHoverEffects();
  addExtensionHoverEffects();
  addGuideHoverEffects();
  addSmoothScrolling();
});
