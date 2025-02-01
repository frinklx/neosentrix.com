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

// GitHub Contribution Graph
class ContributionGraph {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.data = this.generateRandomData();
    this.colors = ["#0d1117", "#006d32", "#26a641", "#39d353"];
    this.init();
  }

  init() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.cellSize = 10;
    this.gap = 2;
    this.draw();

    window.addEventListener("resize", () => {
      this.canvas.width = this.canvas.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
      this.draw();
    });
  }

  generateRandomData() {
    const data = [];
    for (let i = 0; i < 52; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        week.push(Math.floor(Math.random() * 4));
      }
      data.push(week);
    }
    return data;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const startX = (this.canvas.width - 52 * (this.cellSize + this.gap)) / 2;
    const startY = (this.canvas.height - 7 * (this.cellSize + this.gap)) / 2;

    this.data.forEach((week, weekIndex) => {
      week.forEach((value, dayIndex) => {
        const x = startX + weekIndex * (this.cellSize + this.gap);
        const y = startY + dayIndex * (this.cellSize + this.gap);

        this.ctx.fillStyle = this.colors[value];
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
      });
    });
  }
}

// GitHub Activity Feed
class ActivityFeed {
  constructor(container) {
    this.container = container;
    this.activities = [];
    this.init();
  }

  init() {
    this.loadActivities();
  }

  generateRandomActivity() {
    const types = ["push", "pull_request", "issue", "star"];
    const repos = ["discord-bot", "react-components", "vscode-theme"];
    const type = types[Math.floor(Math.random() * types.length)];
    const repo = repos[Math.floor(Math.random() * repos.length)];
    const time = Math.floor(Math.random() * 24);

    return {
      type,
      repo,
      time: `${time} hours ago`,
      title: this.getActivityTitle(type, repo),
    };
  }

  getActivityTitle(type, repo) {
    switch (type) {
      case "push":
        return `Pushed to main in ${repo}`;
      case "pull_request":
        return `Opened pull request in ${repo}`;
      case "issue":
        return `Created issue in ${repo}`;
      case "star":
        return `Starred ${repo}`;
      default:
        return "";
    }
  }

  getActivityIcon(type) {
    switch (type) {
      case "push":
        return "fa-code-branch";
      case "pull_request":
        return "fa-code-pull-request";
      case "issue":
        return "fa-exclamation-circle";
      case "star":
        return "fa-star";
      default:
        return "";
    }
  }

  loadActivities() {
    // Clear existing activities
    this.container.innerHTML = "";

    // Generate random activities
    for (let i = 0; i < 5; i++) {
      const activity = this.generateRandomActivity();
      const activityElement = document.createElement("div");
      activityElement.className = "activity-item";
      activityElement.innerHTML = `
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-meta">${activity.time}</div>
                </div>
            `;
      this.container.appendChild(activityElement);
    }
  }
}

// Project Card Hover Effects
const addProjectHoverEffects = () => {
  const projectCards = document.querySelectorAll(".project-card");

  projectCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-5px)";
      card.style.boxShadow = "0 5px 15px rgba(0, 255, 0, 0.1)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "none";
    });
  });
};

// Event Card Hover Effects
const addEventHoverEffects = () => {
  const eventCards = document.querySelectorAll(".event-card");

  eventCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-5px)";
      card.style.background = "rgba(255, 255, 255, 0.08)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.background = "rgba(255, 255, 255, 0.05)";
    });
  });
};

// Initialize all functionality
document.addEventListener("DOMContentLoaded", () => {
  // Animate sections
  animateSections();

  // Initialize GitHub contribution graph
  const contributionCanvas = document.getElementById("contributionGraph");
  if (contributionCanvas) {
    new ContributionGraph(contributionCanvas);
  }

  // Initialize activity feed
  const activityList = document.getElementById("activityList");
  if (activityList) {
    new ActivityFeed(activityList);
  }

  // Add hover effects
  addProjectHoverEffects();
  addEventHoverEffects();

  // Add Discord widget resize handler
  const discordWidget = document.querySelector(".discord-widget iframe");
  if (discordWidget) {
    const resizeWidget = () => {
      const width = discordWidget.parentElement.offsetWidth;
      const height = Math.min(600, Math.max(400, width * 0.8));
      discordWidget.style.height = `${height}px`;
    };

    window.addEventListener("resize", resizeWidget);
    resizeWidget();
  }
});
