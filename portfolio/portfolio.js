// Portfolio filtering
const filterButtons = document.querySelectorAll(".filter-btn");
const projectCards = document.querySelectorAll(".project-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Update active button
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const filter = button.getAttribute("data-filter");

    // Filter projects
    projectCards.forEach((card) => {
      const category = card.getAttribute("data-category");

      if (filter === "all" || filter === category) {
        card.style.display = "";
        setTimeout(() => {
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
        }, 100);
      } else {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        setTimeout(() => {
          card.style.display = "none";
        }, 300);
      }
    });
  });
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

// Project card hover effects
document.querySelectorAll(".project-card").forEach((card) => {
  const image = card.querySelector(".project-image img");
  const overlay = card.querySelector(".project-overlay");

  card.addEventListener("mouseenter", () => {
    image.style.transform = "scale(1.1)";
    overlay.style.opacity = "1";
  });

  card.addEventListener("mouseleave", () => {
    image.style.transform = "scale(1)";
    overlay.style.opacity = "0";
  });
});

// GitHub stats counter animation
const animateValue = (element, start, end, duration) => {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    element.textContent = value;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
};

// Animate stats when they come into view
const statsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const statNumbers = entry.target.querySelectorAll(".stat-number");
        statNumbers.forEach((stat) => {
          const endValue = parseInt(stat.textContent);
          stat.textContent = "0";
          animateValue(stat, 0, endValue, 2000);
        });
        statsObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.5,
  }
);

document.querySelector(".github-stats").forEach((stat) => {
  statsObserver.observe(stat);
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
