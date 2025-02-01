document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".navbar");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelectorAll(".nav-link");

  // Enhanced scroll handling
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > lastScroll && currentScroll > 100) {
      navbar.style.transform = "translateY(-100%)";
    } else {
      navbar.style.transform = "translateY(0)";
    }
    lastScroll = currentScroll;
  });

  // Terminal-style typing effect for logo
  const logo = document.querySelector(".nav-logo");
  const text = logo.textContent;
  logo.textContent = "";

  let i = 0;
  const typeWriter = () => {
    if (i < text.length) {
      logo.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 100);
    } else {
      // Add blinking cursor after typing
      const cursor = document.createElement("span");
      cursor.textContent = "_";
      cursor.style.animation = "blink 1s step-end infinite";
      logo.appendChild(cursor);
    }
  };

  typeWriter();

  // Code comment tooltips
  navLinks.forEach((link) => {
    link.addEventListener("mouseenter", () => {
      const label = link.getAttribute("data-label");
      link.setAttribute("data-tooltip", `// ${label}`);
    });
  });

  // Active link handling with code syntax
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      // Simulate code execution
      console.log(`executing: ${link.getAttribute("data-label")}.js`);
    });
  });

  // Mobile menu with code theme
  navToggle.addEventListener("click", () => {
    navToggle.classList.toggle("active");
    document.querySelector(".nav-links").style.display =
      document.querySelector(".nav-links").style.display === "none"
        ? "flex"
        : "none";
  });

  // Typing effect for role
  function typeRole() {
    const roles = [
      "Full Stack Developer",
      "UI/UX Enthusiast",
      "Open Source Contributor",
    ];
    const roleElement = document.getElementById("role-text");
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
      const currentRole = roles[roleIndex];

      if (isDeleting) {
        roleElement.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
      } else {
        roleElement.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
      }

      if (!isDeleting && charIndex === currentRole.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause at the end
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
      }

      setTimeout(type, typingSpeed);
    }

    type();
  }

  // Initialize
  typeRole();

  // Intersection Observer for reveal animations
  function setupAnimations() {
    const animatedElements = document.querySelectorAll("[data-animate]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const animation = el.dataset.animate;
            const delay = el.dataset.delay;

            el.classList.add(animation);
            if (delay) {
              el.classList.add(`delay-${delay}`);
            }

            // Unobserve after animation
            observer.unobserve(el);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    animatedElements.forEach((el) => observer.observe(el));
  }

  // Initial page load animation sequence
  function initialLoadAnimations() {
    // Navbar animation
    const navbar = document.querySelector(".navbar");
    navbar.style.opacity = "0";
    navbar.style.transform = "translateY(-20px)";

    setTimeout(() => {
      navbar.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
      navbar.style.opacity = "1";
      navbar.style.transform = "translateY(0)";
    }, 100);

    // Hero section stagger animation
    const heroElements = document.querySelectorAll(".hero [data-animate]");
    heroElements.forEach((el, index) => {
      setTimeout(() => {
        const animation = el.dataset.animate;
        el.classList.add(animation);
      }, 200 + index * 100);
    });
  }

  // Setup reveal animations
  setupAnimations();

  // Start initial load animations
  initialLoadAnimations();

  // Get current page from pathname
  const currentPage = window.location.pathname.split("/")[1] || "home";

  // Update active navigation link
  navLinks.forEach((link) => {
    const page = link.getAttribute("data-page");
    if (page === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Fix relative paths for nested pages
  const isNestedPage = window.location.pathname.split("/").length > 2;
  if (isNestedPage) {
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      if (!link.getAttribute("href").startsWith("//")) {
        link.href = "." + link.getAttribute("href");
      }
    });
  }

  // Add mobile navigation toggle
  const navContainer = document.querySelector(".nav-container");
  const mobileToggle = document.createElement("button");
  mobileToggle.className = "mobile-nav-toggle";
  mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
  navContainer.appendChild(mobileToggle);

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
});

// Add mobile navigation styles
const style = document.createElement("style");
style.textContent = `
  @media (max-width: 768px) {
    .nav-links {
      display: none;
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      background: #0a0a0a;
      padding: 1rem;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .nav-links.show {
      display: flex;
    }

    .mobile-nav-toggle {
      display: block;
      background: none;
      border: none;
      color: #00ff00;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
    }

    .mobile-nav-toggle:hover {
      color: #fff;
    }
  }

  @media (min-width: 769px) {
    .mobile-nav-toggle {
      display: none;
    }
  }
`;
document.head.appendChild(style);
