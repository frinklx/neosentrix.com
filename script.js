// Smooth scroll for navigation links
console.log("Initializing smooth scroll functionality");
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      console.log("Scrolling to:", this.getAttribute("href"));
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Initialize all interactive elements
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Initializing all features");

  // Mobile menu functionality - Only initialize on mobile
  if (window.innerWidth <= 768) {
    const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
    const mobileMenu = document.querySelector(".mobile-menu");
    const closeMenuBtn = document.querySelector(".close-menu-btn");

    if (mobileMenuBtn && mobileMenu && closeMenuBtn) {
      console.log("Mobile menu elements found - Setting up listeners");
      mobileMenuBtn.addEventListener("click", () => {
        console.log("Opening mobile menu");
        mobileMenu.classList.add("active");
      });

      closeMenuBtn.addEventListener("click", () => {
        console.log("Closing mobile menu");
        mobileMenu.classList.remove("active");
      });
    }
  }

  // Cursor trailer effect
  console.log("Setting up cursor trailer effect");
  const cursor = document.createElement("div");
  cursor.className = "cursor-trailer";
  document.body.appendChild(cursor);

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateCursor() {
    const dx = mouseX - cursorX;
    const dy = mouseY - cursorY;

    cursorX += dx * 0.1;
    cursorY += dy * 0.1;

    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  // Mouse move effect for hero section
  const heroContent = document.querySelector(".hero-content");
  const maxTilt = 5;

  if (heroContent) {
    console.log("Hero content found - Setting up tilt effect");
    document.addEventListener("mousemove", (e) => {
      const xPos = (e.clientX / window.innerWidth - 0.5) * maxTilt;
      const yPos = (e.clientY / window.innerHeight - 0.5) * maxTilt;
      heroContent.style.transform = `perspective(1000px) rotateX(${-yPos}deg) rotateY(${xPos}deg)`;
    });
  }

  // Intersection Observer for animations
  console.log("Setting up Intersection Observer");
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        console.log("Element entering viewport:", entry.target.className);
        entry.target.classList.add("animate-in");
        if (entry.target.classList.contains("stat-value")) {
          animateValue(entry.target);
        }
      }
    });
  }, observerOptions);

  // Observe elements for animation
  const elementsToObserve = document.querySelectorAll(
    ".glass-card, .feature-icon, .stat-value, .hero-content > *, .step, .pricing-card, .testimonial-card"
  );
  console.log(`Found ${elementsToObserve.length} elements to observe`);
  elementsToObserve.forEach((el) => observer.observe(el));

  // Animate stat values
  function animateValue(element) {
    if (!element) return;
    console.log("Animating value for:", element.className);
    const value = parseFloat(element.innerText);
    const suffix = element.innerText.replace(/[0-9.]/g, "");
    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      current += stepValue;
      step++;

      if (step >= steps) {
        current = value;
        clearInterval(timer);
        console.log("Value animation completed:", value);
      }

      element.innerText = current.toFixed(1) + suffix;
    }, duration / steps);
  }

  // Feature card hover effect
  const featureCards = document.querySelectorAll(".feature-card");
  console.log(`Found ${featureCards.length} feature cards`);
  featureCards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
    });
  });

  // Button hover effect
  const buttons = document.querySelectorAll(".primary-btn, .secondary-btn");
  console.log(`Found ${buttons.length} interactive buttons`);
  buttons.forEach((button) => {
    button.addEventListener("mousemove", (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      button.style.setProperty("--mouse-x", `${x}px`);
      button.style.setProperty("--mouse-y", `${y}px`);
    });
  });

  // Gradient sphere parallax
  const spheres = document.querySelectorAll(
    ".gradient-sphere, .gradient-sphere-2"
  );
  if (spheres.length > 0) {
    console.log(`Found ${spheres.length} gradient spheres`);
    window.addEventListener("mousemove", (e) => {
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;

      spheres.forEach((sphere) => {
        const speed = sphere.classList.contains("gradient-sphere") ? 30 : -30;
        const xPos = (mouseX - 0.5) * speed;
        const yPos = (mouseY - 0.5) * speed;

        sphere.style.transform = `translate(${xPos}px, ${yPos}px)`;
      });
    });
  }

  // Initialize animations on load
  console.log("Initializing on-load animations");
  document.body.classList.add("loaded");

  // Add scroll progress indicator
  const scrollProgress = document.createElement("div");
  scrollProgress.className = "scroll-progress";
  document.body.appendChild(scrollProgress);

  window.addEventListener("scroll", () => {
    const windowHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    scrollProgress.style.setProperty("--scroll-width", `${scrolled}%`);
  });

  // Mobile menu functionality - Only initialize on mobile
  if (window.innerWidth <= 768) {
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    const navContainer = document.querySelector(".nav-container");

    menuToggle.addEventListener("click", function () {
      menuToggle.classList.toggle("active");
      navLinks.classList.toggle("active");
    });

    // Close menu when clicking outside
    document.addEventListener("click", function (event) {
      const isClickInside = navContainer.contains(event.target);

      if (!isClickInside && navLinks.classList.contains("active")) {
        menuToggle.classList.remove("active");
        navLinks.classList.remove("active");
      }
    });

    // Close menu when clicking on a link
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuToggle.classList.remove("active");
        navLinks.classList.remove("active");
      });
    });
  }
});
