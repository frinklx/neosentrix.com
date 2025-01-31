// Handle code block copy functionality
document.querySelectorAll(".copy-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const codeBlock = document.querySelector(button.dataset.clipboardTarget);
    navigator.clipboard.writeText(codeBlock.textContent.trim());

    // Show feedback
    const icon = button.querySelector("i");
    icon.className = "fas fa-check";

    setTimeout(() => {
      icon.className = "far fa-copy";
    }, 2000);
  });
});

// Handle share buttons
document
  .querySelector(".share-button.twitter")
  .addEventListener("click", (e) => {
    e.preventDefault();
    const text = document.title;
    const url = window.location.href;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  });

document
  .querySelector(".share-button.linkedin")
  .addEventListener("click", (e) => {
    e.preventDefault();
    const url = window.location.href;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
      "_blank"
    );
  });

document
  .querySelector(".share-button.copy-link")
  .addEventListener("click", function () {
    navigator.clipboard.writeText(window.location.href);

    const originalText = this.innerHTML;
    this.innerHTML = '<i class="fas fa-check"></i> Copied!';

    setTimeout(() => {
      this.innerHTML = originalText;
    }, 2000);
  });

// Table of Contents highlighting
const observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.5,
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const id = entry.target.getAttribute("id");
    const tocLink = document.querySelector(
      `.table-of-contents a[href="#${id}"]`
    );

    if (entry.isIntersecting) {
      document.querySelectorAll(".table-of-contents a").forEach((link) => {
        link.classList.remove("active");
      });
      if (tocLink) {
        tocLink.classList.add("active");
      }
    }
  });
}, observerOptions);

// Observe all section headings
document.querySelectorAll("h2[id]").forEach((heading) => {
  observer.observe(heading);
});

// Smooth scroll for table of contents
document.querySelectorAll(".table-of-contents a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href");
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Reading progress indicator
const progressBar = document.createElement("div");
progressBar.className = "reading-progress";
document.body.appendChild(progressBar);

window.addEventListener("scroll", () => {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight - windowHeight;
  const scrolled = window.scrollY;

  const progress = (scrolled / documentHeight) * 100;
  progressBar.style.width = `${progress}%`;
});
