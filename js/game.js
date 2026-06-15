const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game State
let score = 0;
let highscore = localStorage.getItem("gem_highscore") || 0;
let lives = 3;
let gameOver = false;
let gameSpeed = 4;
let shakeTime = 0;

// Entities
const basket = { x: 195, y: 500, width: 70, height: 16, color: "#00f0ff" };
const gem = { x: 200, y: -20, size: 16, speedY: gameSpeed, color: "#ff0055" };
let particles = [];

// Audio Context (Procedural Sound Generation)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'catch') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
}

// Particle System
function createExplosion(x, y, color) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2,
            alpha: 1,
            color: color,
            size: Math.random() * 3 + 2
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.alpha -= 0.02;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

// Controls
function moveBasket(clientX) {
    const rect = canvas.getBoundingClientRect();
    basket.x = clientX - rect.left - basket.width / 2;
    if (basket.x < 0) basket.x = 0;
    if (basket.x > canvas.width - basket.width) basket.x = canvas.width - basket.width;
}

canvas.addEventListener("mousemove", (e) => moveBasket(e.clientX));
canvas.addEventListener("touchmove", (e) => {
    moveBasket(e.touches[0].clientX);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener("click", () => {
    if (gameOver) {
        score = 0;
        lives = 3;
        gameSpeed = 4;
        gameOver = false;
        particles = [];
        resetGem();
        update();
    }
});

function resetGem() {
    gem.x = Math.random() * (canvas.width - gem.size * 2) + gem.size;
    gem.y = -20;
    const colors = ["#ff0055", "#ffcc00", "#9900ff", "#00ff66"];
    gem.color = colors[Math.floor(Math.random() * colors.length)];
}

// Main Game Loop
function update() {
    if (gameOver) return;

    ctx.save();
    if (shakeTime > 0) {
        let dx = (Math.random() - 0.5) * 8;
        let dy = (Math.random() - 0.5) * 8;
        ctx.translate(dx, dy);
        shakeTime--;
    }

    // Draw background
    ctx.fillStyle = "#131722";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update & Draw Particles
    updateParticles();
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
    });

    // Draw Player Basket
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = basket.color;
    ctx.fillStyle = basket.color;
    ctx.beginPath();
    ctx.roundRect(basket.x, basket.y, basket.width, basket.height, 4);
    ctx.fill();
    ctx.restore();

    // Move & Draw Diamond Gem
    gem.y += gameSpeed;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = gem.color;
    ctx.fillStyle = gem.color;
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - gem.size);
    ctx.lineTo(gem.x + gem.size, gem.y);
    ctx.lineTo(gem.x, gem.y + gem.size);
    ctx.lineTo(gem.x - gem.size, gem.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Hitbox Collision
    if (gem.y + gem.size >= basket.y && gem.y - gem.size <= basket.y + basket.height &&
        gem.x + gem.size >= basket.x && gem.x - gem.size <= basket.x + basket.width) {
        
        score += 10;
        createExplosion(gem.x, gem.y, gem.color);
        playSound('catch');
        resetGem();
        gameSpeed += 0.25;
    }

    // Out of bounds (Floor Hit)
    if (gem.y - gem.size > canvas.height) {
        lives--;
        shakeTime = 15;
        playSound('hurt');
        resetGem();
        if (lives <= 0) {
            gameOver = true;
            if (score > highscore) {
                highscore = score;
                localStorage.setItem("gem_highscore", highscore);
            }
        }
    }

    // UI Rendering
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Segoe UI'";
    ctx.fillText("SCORE: " + score, 25, 35);
    ctx.fillText("BEST: " + highscore, 25, 55);

    ctx.textAlign = "right";
    ctx.fillStyle = "#ff2a6d";
    ctx.fillText("LIVES: " + "♥".repeat(lives) + "♡".repeat(3 - lives), canvas.width - 25, 35);
    ctx.textAlign = "left";

    ctx.restore();

    // Game Over UI Overlay
    if (gameOver) {
        ctx.fillStyle = "rgba(13, 14, 21, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";
        ctx.fillStyle = "#ff0055";
        ctx.font = "bold 32px 'Segoe UI'";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = "#fff";
        ctx.font = "16px 'Segoe UI'";
        ctx.fillText("Final Score: " + score, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillStyle = "#00f0ff";
        ctx.fillText("Click anywhere to retry", canvas.width / 2, canvas.height / 2 + 60);
        return;
    }

    requestAnimationFrame(update);
}

// Start Engine
update();
