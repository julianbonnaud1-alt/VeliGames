window.onload = () => {

console.log("Aim Trainer JS loaded!");

// --- SOUND WHEN TARGET IS HIT ---
function hitSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 500;
    gain.gain.value = 0.25;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

// --- BUZZER SOUND ---
function buzzSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = 120;
    gain.gain.value = 0.3;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
}

// --- VARIABLES ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let target = { x: 0, y: 0, size: 120 };
let traps = [];

let gameDuration = 15000;
let remainingTime = 0;
let moveInterval = 750;

let lastMoveTime = 0;
let clicks = 0;
let totalClicks = 0;

let bestClicks = 0;

// Load best score
if (localStorage.getItem("aimTrainerBestScore")) {
    bestClicks = parseInt(localStorage.getItem("aimTrainerBestScore"));
}

let lastTargetTime = 0;
let bestReaction = Infinity;

// HUD elements
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const precisionLabel = document.getElementById("precision");
const bestReactionLabel = document.getElementById("bestReaction");

// Apply loaded best score
bestScoreLabel.textContent = bestClicks;

// Timer + UI
const bigTimer = document.getElementById("bigTimer");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");

let running = false;

// Create traps
function createTraps() {
    traps = [];
    for (let i = 0; i < 4; i++) {
        traps.push({ x: 0, y: 0, size: 120 });
    }
}

// Prevent overlap
function isOverlapping(ax, ay, bx, by, size) {
    return Math.abs(ax - bx) < size && Math.abs(ay - by) < size;
}

// Move target + traps
function moveButtons() {
    let s = target.size;
    let topSafeZone = 200;

    target.x = Math.random() * (canvas.width - s);
    target.y = Math.random() * (canvas.height - s - topSafeZone) + topSafeZone;

    traps.forEach((t, i) => {
        let valid = false;

        while (!valid) {
            t.x = Math.random() * (canvas.width - s);
            t.y = Math.random() * (canvas.height - s - topSafeZone) + topSafeZone;

            valid = true;

            if (isOverlapping(t.x, t.y, target.x, target.y, s)) {
                valid = false;
                continue;
            }

            for (let j = 0; j < i; j++) {
                if (isOverlapping(t.x, t.y, traps[j].x, traps[j].y, s)) {
                    valid = false;
                    break;
                }
            }
        }
    });

    lastTargetTime = Date.now();
}

// Draw everything
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Target
    ctx.beginPath();
    ctx.arc(target.x + target.size/2, target.y + target.size/2, target.size/2, 0, Math.PI*2);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "white";
    ctx.stroke();

    // Traps
    traps.forEach(t => {
        ctx.fillStyle = "red";
        ctx.fillRect(t.x, t.y, t.size, t.size);

        ctx.lineWidth = 6;
        ctx.strokeStyle = "white";
        ctx.strokeRect(t.x, t.y, t.size, t.size);
    });
}

// Precision
function updatePrecision() {
    if (totalClicks === 0) {
        precisionLabel.textContent = "0%";
        return;
    }
    let p = (clicks / totalClicks) * 100;
    precisionLabel.textContent = p.toFixed(1) + "%";
}

// Click detection
canvas.addEventListener("click", e => {
    if (!running) return;

    totalClicks++;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // HIT TARGET
    let dx = x - (target.x + target.size/2);
    let dy = y - (target.y + target.size/2);
    if (dx*dx + dy*dy <= (target.size/2)**2) {

        hitSound();

        clicks++;
        remainingTime += 500;
        scoreLabel.textContent = clicks;

        // Shrink target
        target.size -= 1;
        if (target.size < 20) target.size = 20;

        // Reaction time
        let reaction = Date.now() - lastTargetTime;
        if (reaction < bestReaction) {
            bestReaction = reaction;
            bestReactionLabel.textContent = reaction + " ms";
        }

        lastMoveTime = Date.now();
        moveButtons();
        updatePrecision();
        return;
    }

    // HIT TRAP
    for (let t of traps) {
        if (x >= t.x && x <= t.x+t.size && y >= t.y && y <= t.y+t.size) {

            buzzSound();

            document.body.classList.add("shake");
            setTimeout(() => document.body.classList.remove("shake"), 300);

            remainingTime -= 2000;
            if (remainingTime < 0) remainingTime = 0;

            lastMoveTime = Date.now();
            moveButtons();
            updatePrecision();
            return;
        }
    }

    updatePrecision();
});

// Stats
function updateStats() {
    if (clicks > bestClicks) {
        bestClicks = clicks;
        bestScoreLabel.textContent = bestClicks;
        localStorage.setItem("aimTrainerBestScore", bestClicks);
        localStorage.setItem("wins_AimTrainer", bestClicks);
    }
}

// Countdown
function startCountdown(callback) {
    let count = 3;
    statusText.textContent = count;
    bigTimer.style.display = "none";

    let interval = setInterval(() => {
        count--;

        if (count > 0) {
            statusText.textContent = count;
        } else if (count === 0) {
            statusText.textContent = "GO!";
        } else {
            clearInterval(interval);
            statusText.textContent = "";
            bigTimer.style.display = "block";
            callback();
        }
    }, 1000);
}

// Game loop
function loop() {
    if (!running) return;

    let now = Date.now();
    remainingTime -= 16;

    if (remainingTime <= 0) {
        remainingTime = 0;
        endGame();
        return;
    }

    bigTimer.textContent = (remainingTime/1000).toFixed(1);

    if (now - lastMoveTime >= moveInterval) {
        moveButtons();
        lastMoveTime = now;
    }

    draw();
    requestAnimationFrame(loop);
}

// Start game
startBtn.onclick = () => {

    bestReaction = Infinity;
    bestReactionLabel.textContent = "N/A";

    clicks = 0;
    totalClicks = 0;
    remainingTime = gameDuration;

    // Reset target size at each new game
    target.size = 120;

    scoreLabel.textContent = "0";
    precisionLabel.textContent = "0%";
    bigTimer.textContent = "15.0";

    startBtn.style.display = "none";

    startCountdown(() => {
        createTraps();
        moveButtons();

        running = true;
        lastMoveTime = Date.now();

        loop();
    });
};

// End game
function endGame() {
    running = false;
    updateStats();
    startBtn.style.display = "block";

    traps = [];
    target.x = -9999;
    target.y = -9999;

    draw();
}

}