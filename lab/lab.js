// Neural Network Visualization
class NeuralNetwork {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.learningRate = 0.01;
    this.isTraining = false;
    this.dataPoints = [];
    this.weights = [Math.random() - 0.5, Math.random() - 0.5];
    this.bias = Math.random() - 0.5;
    this.init();
  }

  init() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.generateData();
    window.addEventListener("resize", () => this.handleResize());
  }

  handleResize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.draw();
  }

  generateData() {
    this.dataPoints = [];
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const label = y < this.f(x) ? 1 : 0;
      this.dataPoints.push({ x, y, label });
    }
  }

  f(x) {
    return this.canvas.height / 2 + Math.sin(x * 0.01) * 100;
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  predict(x, y) {
    const sum = x * this.weights[0] + y * this.weights[1] + this.bias;
    return this.sigmoid(sum);
  }

  train() {
    for (const point of this.dataPoints) {
      const prediction = this.predict(point.x, point.y);
      const error = point.label - prediction;

      this.weights[0] += error * point.x * this.learningRate;
      this.weights[1] += error * point.y * this.learningRate;
      this.bias += error * this.learningRate;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw decision boundary
    this.ctx.beginPath();
    this.ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    this.ctx.lineWidth = 2;
    for (let x = 0; x < this.canvas.width; x += 5) {
      const y =
        (-this.weights[0] / this.weights[1]) * x - this.bias / this.weights[1];
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();

    // Draw data points
    this.dataPoints.forEach((point) => {
      this.ctx.beginPath();
      this.ctx.fillStyle =
        point.label === 1 ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
      this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  animate() {
    if (!this.isTraining) return;
    this.train();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  start() {
    if (!this.isTraining) {
      this.isTraining = true;
      this.animate();
    }
  }

  stop() {
    this.isTraining = false;
  }

  reset() {
    this.weights = [Math.random() - 0.5, Math.random() - 0.5];
    this.bias = Math.random() - 0.5;
    this.generateData();
    this.draw();
  }

  setLearningRate(rate) {
    this.learningRate = rate;
  }
}

// Genetic Algorithm Visualization
class GeneticAlgorithm {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.init();
  }

  init() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.animate();
  }

  animate() {
    this.ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw random DNA-like pattern
    this.ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    this.ctx.beginPath();
    for (let i = 0; i < this.canvas.width; i += 20) {
      const y =
        this.canvas.height / 2 + Math.sin(i * 0.05 + Date.now() * 0.001) * 30;
      if (i === 0) {
        this.ctx.moveTo(i, y);
      } else {
        this.ctx.lineTo(i, y);
      }
    }
    this.ctx.stroke();

    requestAnimationFrame(() => this.animate());
  }
}

// Chaos Theory Visualization
class ChaosTheory {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.points = [];
    this.init();
  }

  init() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.points = [{ x: this.canvas.width / 2, y: this.canvas.height / 2 }];
    this.animate();
  }

  animate() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const lastPoint = this.points[this.points.length - 1];
    const newPoint = {
      x: lastPoint.x + Math.sin(Date.now() * 0.001) * 2,
      y: lastPoint.y + Math.cos(Date.now() * 0.002) * 2,
    };
    this.points.push(newPoint);

    if (this.points.length > 100) this.points.shift();

    this.ctx.strokeStyle = "#00ff00";
    this.ctx.beginPath();
    this.points.forEach((point, i) => {
      if (i === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
    });
    this.ctx.stroke();

    requestAnimationFrame(() => this.animate());
  }
}

// Initialize experiments when DOM is loaded
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

  // Initialize Neural Network
  const neuralNetCanvas = document.getElementById("neuralNetCanvas");
  if (neuralNetCanvas) {
    const neuralNet = new NeuralNetwork(neuralNetCanvas);

    // Add event listeners for controls
    document
      .getElementById("trainNetwork")
      .addEventListener("click", function () {
        if (this.innerHTML.includes("Train")) {
          neuralNet.start();
          this.innerHTML = '<i class="fas fa-pause"></i> Pause';
        } else {
          neuralNet.stop();
          this.innerHTML = '<i class="fas fa-play"></i> Train Network';
        }
      });

    document.getElementById("resetNetwork").addEventListener("click", () => {
      neuralNet.reset();
      document.getElementById("trainNetwork").innerHTML =
        '<i class="fas fa-play"></i> Train Network';
    });

    document.getElementById("learningRate").addEventListener("input", (e) => {
      neuralNet.setLearningRate(parseFloat(e.target.value));
    });

    // Initial draw
    neuralNet.draw();
  }

  // Initialize Genetic Algorithm
  const geneticCanvas = document.getElementById("geneticCanvas");
  if (geneticCanvas) {
    new GeneticAlgorithm(geneticCanvas);
  }

  // Initialize Chaos Theory
  const chaosCanvas = document.getElementById("chaosCanvas");
  if (chaosCanvas) {
    new ChaosTheory(chaosCanvas);
  }

  // Add hover effects to experiment cards
  document.querySelectorAll(".experiment-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-5px)";
      card.style.boxShadow = "0 5px 15px rgba(0, 255, 0, 0.1)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "none";
    });
  });

  // Add hover effects to note cards
  document.querySelectorAll(".note-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      const icon = card.querySelector(".note-header i");
      icon.style.transform = "scale(1.1) rotate(5deg)";
    });

    card.addEventListener("mouseleave", () => {
      const icon = card.querySelector(".note-header i");
      icon.style.transform = "scale(1) rotate(0deg)";
    });
  });
});
