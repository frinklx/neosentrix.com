class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.score = 0;
    this.highScore = localStorage.getItem("highScore") || 0;
    this.isGameOver = false;
    this.isPlaying = false;

    // Game settings
    this.width = 800;
    this.height = 300;
    this.groundY = this.height - 40;
    this.speed = 6;

    // Player
    this.player = {
      x: 50,
      y: this.groundY,
      width: 30,
      height: 30,
      jumping: false,
      jumpForce: -15,
      gravity: 0.8,
      velocityY: 0,
    };

    // Obstacles
    this.obstacles = [];
    this.obstacleTimer = 0;
    this.obstacleInterval = 60;

    // Initialize
    this.init();
    this.setupEventListeners();
  }

  init() {
    // Set canvas size
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Update high score display
    document.getElementById("highScore").textContent = this.highScore;
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        if (!this.isPlaying) {
          this.start();
        } else {
          this.jump();
        }
        e.preventDefault();
      }
    });

    // Mobile controls
    document.getElementById("jumpButton").addEventListener("click", () => {
      this.jump();
    });

    // Start button
    document.getElementById("startGame").addEventListener("click", () => {
      if (!this.isPlaying) {
        this.start();
      }
    });

    // Touch controls
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (!this.isPlaying) {
        this.start();
      } else {
        this.jump();
      }
    });
  }

  start() {
    this.isPlaying = true;
    this.isGameOver = false;
    this.score = 0;
    this.obstacles = [];
    this.speed = 6;
    this.player.y = this.groundY;
    this.player.velocityY = 0;
    document.getElementById("gameMessage").style.display = "none";
    this.animate();
  }

  jump() {
    if (!this.player.jumping) {
      this.player.jumping = true;
      this.player.velocityY = this.player.jumpForce;
    }
  }

  updatePlayer() {
    // Apply gravity
    this.player.velocityY += this.player.gravity;
    this.player.y += this.player.velocityY;

    // Ground collision
    if (this.player.y >= this.groundY) {
      this.player.y = this.groundY;
      this.player.velocityY = 0;
      this.player.jumping = false;
    }
  }

  updateObstacles() {
    // Generate new obstacles
    if (this.obstacleTimer <= 0) {
      this.obstacles.push({
        x: this.width,
        y: this.groundY - 20,
        width: 20,
        height: 40,
      });
      this.obstacleTimer = this.obstacleInterval;
    }
    this.obstacleTimer--;

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      obstacle.x -= this.speed;

      // Remove off-screen obstacles
      if (obstacle.x + obstacle.width < 0) {
        this.obstacles.splice(i, 1);
        this.score++;
        document.getElementById("score").textContent = this.score;

        // Increase difficulty
        if (this.score % 10 === 0) {
          this.speed += 0.5;
        }
      }

      // Collision detection
      if (this.checkCollision(this.player, obstacle)) {
        this.gameOver();
      }
    }
  }

  checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  gameOver() {
    this.isGameOver = true;
    this.isPlaying = false;

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("highScore", this.highScore);
      document.getElementById("highScore").textContent = this.highScore;
    }

    // Show game over message
    const gameMessage = document.getElementById("gameMessage");
    gameMessage.style.display = "block";
    gameMessage.innerHTML = `
            <h2>Game Over</h2>
            <p>Score: ${this.score}</p>
            <div class="code-comment">// Press START to play again</div>
        `;
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = "#0f0f0f";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw ground
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.fillRect(0, this.groundY + this.player.height, this.width, 2);

    // Draw player
    this.ctx.fillStyle = "#00ff00";
    this.ctx.fillRect(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );

    // Draw obstacles
    this.ctx.fillStyle = "#ff0000";
    this.obstacles.forEach((obstacle) => {
      this.ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height
      );
    });
  }

  animate() {
    if (!this.isPlaying) return;

    this.updatePlayer();
    this.updateObstacles();
    this.draw();

    requestAnimationFrame(() => this.animate());
  }
}

// Start the game when the page loads
window.addEventListener("load", () => {
  new Game();
});
