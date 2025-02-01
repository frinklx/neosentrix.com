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

// Handle form submission
const handleFormSubmission = () => {
  const form = document.getElementById("contactForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector(".submit-btn");
    const originalBtnText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    // Get form data
    const formData = {
      name: form.name.value,
      email: form.email.value,
      subject: form.subject.value,
      message: form.message.value,
    };

    try {
      // Simulate API call (replace with actual API endpoint)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show success message
      showNotification("Message sent successfully!", "success");

      // Reset form
      form.reset();
    } catch (error) {
      // Show error message
      showNotification("Failed to send message. Please try again.", "error");
    } finally {
      // Reset button state
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });
};

// Show notification
const showNotification = (message, type) => {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <i class="fas fa-${
          type === "success" ? "check-circle" : "exclamation-circle"
        }"></i>
        <span>${message}</span>
    `;

  // Add notification to DOM
  document.body.appendChild(notification);

  // Add show class after a small delay (for animation)
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
};

// Handle FAQ toggles
const handleFAQToggles = () => {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      // Close all FAQ items
      faqItems.forEach((faqItem) => {
        faqItem.classList.remove("active");
      });

      // Open clicked item if it wasn't active
      if (!isActive) {
        item.classList.add("active");
      }
    });
  });
};

// Add input focus effects
const addInputFocusEffects = () => {
  const inputs = document.querySelectorAll(
    ".form-group input, .form-group textarea"
  );

  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      input.parentElement.classList.add("focused");
    });

    input.addEventListener("blur", () => {
      if (!input.value) {
        input.parentElement.classList.remove("focused");
      }
    });

    // Add focused class if input has value (e.g., after form submission error)
    if (input.value) {
      input.parentElement.classList.add("focused");
    }
  });
};

// Add hover effects to contact info items
const addContactInfoHoverEffects = () => {
  const infoItems = document.querySelectorAll(".info-item");

  infoItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      const icon = item.querySelector(".info-icon");
      icon.style.transform = "scale(1.1) rotate(5deg)";
    });

    item.addEventListener("mouseleave", () => {
      const icon = item.querySelector(".info-icon");
      icon.style.transform = "scale(1) rotate(0deg)";
    });
  });
};

// Initialize all functionality
document.addEventListener("DOMContentLoaded", () => {
  animateSections();
  handleFormSubmission();
  handleFAQToggles();
  addInputFocusEffects();
  addContactInfoHoverEffects();

  // Add styles for notifications
  const style = document.createElement("style");
  style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
        }

        .notification.show {
            transform: translateY(0);
            opacity: 1;
        }

        .notification.success {
            border-left: 4px solid #00ff00;
        }

        .notification.error {
            border-left: 4px solid #ff0000;
        }

        .notification i {
            font-size: 1.2rem;
        }

        .notification.success i {
            color: #00ff00;
        }

        .notification.error i {
            color: #ff0000;
        }
    `;
  document.head.appendChild(style);
});
