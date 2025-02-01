// Particle System
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.isRunning = false;
    this.particleCount = 100;
    this.init();
  }

  init() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.createParticles();
    window.addEventListener("resize", () => this.handleResize());
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: `rgba(0, ${Math.random() * 255}, 0, ${
          Math.random() * 0.5 + 0.5
        })`,
      });
    }
  }

  handleResize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  update() {
    this.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((particle) => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
    });

    this.drawConnections();
  }

  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(0, 255, 0, ${
            ((100 - distance) / 100) * 0.2
          })`;
          this.ctx.lineWidth = 1;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
  }

  animate() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
  }

  stop() {
    this.isRunning = false;
  }

  reset() {
    this.stop();
    this.createParticles();
    this.draw();
  }

  setParticleCount(count) {
    this.particleCount = count;
    this.reset();
    if (this.isRunning) this.start();
  }
}

// Matrix Rain
class MatrixRain {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    this.drops = [];
    this.init();
  }

  init() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.fontSize = 14;
    const columns = Math.floor(this.canvas.width / this.fontSize);

    for (let i = 0; i < columns; i++) {
      this.drops[i] = Math.random() * -100;
    }

    this.animate();
  }

  draw() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#0f0";
    this.ctx.font = `${this.fontSize}px monospace`;

    for (let i = 0; i < this.drops.length; i++) {
      const char =
        this.characters[Math.floor(Math.random() * this.characters.length)];
      this.ctx.fillText(char, i * this.fontSize, this.drops[i] * this.fontSize);

      if (
        this.drops[i] * this.fontSize > this.canvas.height &&
        Math.random() > 0.975
      ) {
        this.drops[i] = 0;
      }
      this.drops[i]++;
    }
  }

  animate() {
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize demos when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Animate sections on scroll
  const sections = document.querySelectorAll("[data-animate]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate");
        }
      });
    },
    { threshold: 0.1 }
  );

  sections.forEach((section) => observer.observe(section));

  // Initialize Particle System
  const particleCanvas = document.getElementById("particleCanvas");
  if (particleCanvas) {
    const particleSystem = new ParticleSystem(particleCanvas);

    // Add event listeners for controls
    document
      .getElementById("particleStart")
      .addEventListener("click", function () {
        if (this.innerHTML.includes("Start")) {
          particleSystem.start();
          this.innerHTML = '<i class="fas fa-pause"></i> Pause';
        } else {
          particleSystem.stop();
          this.innerHTML = '<i class="fas fa-play"></i> Start';
        }
      });

    document.getElementById("particleReset").addEventListener("click", () => {
      particleSystem.reset();
      document.getElementById("particleStart").innerHTML =
        '<i class="fas fa-play"></i> Start';
    });

    document.getElementById("particleCount").addEventListener("input", (e) => {
      particleSystem.setParticleCount(parseInt(e.target.value));
    });

    // Initial draw
    particleSystem.draw();
  }

  // Initialize Matrix Rain
  const matrixCanvas = document.getElementById("matrixCanvas");
  if (matrixCanvas) {
    new MatrixRain(matrixCanvas);
  }

  // Add hover effects to demo cards
  document.querySelectorAll(".demo-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-5px)";
      card.style.boxShadow = "0 5px 15px rgba(0, 255, 0, 0.1)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "none";
    });
  });
});
