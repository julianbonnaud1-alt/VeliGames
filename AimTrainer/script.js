window.onload = () => {

console.log("Aim Trainer JS loaded!");

// ── COULEUR FIXE POUR LA CIBLE ────────────────────────────────────
const TARGET_COLOR = { fill: "#ff1744", glow: "rgba(255,23,68,0.8)" };

// ── COULEURS ALÉATOIRES POUR LES PIÈGES (sans rouge) ─────────────
const TRAP_COLORS = [
    { fill: "#2979ff", glow: "rgba(41,121,255,0.8)"  },  // bleu
    { fill: "#00e676", glow: "rgba(0,230,118,0.8)"   },  // vert
    { fill: "#ffea00", glow: "rgba(255,234,0,0.8)"   },  // jaune
    { fill: "#d500f9", glow: "rgba(213,0,249,0.8)"   },  // violet
];
function randomTrapColor() { return TRAP_COLORS[Math.floor(Math.random() * TRAP_COLORS.length)]; }

// ── SONS ─────────────────────────────────────────────────────────
function hitSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "square"; osc.frequency.value = 500; gain.gain.value = 0.25;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
}
function buzzSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sawtooth"; osc.frequency.value = 120; gain.gain.value = 0.3;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
}

// ── CANVAS ────────────────────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ── ÉTAT ─────────────────────────────────────────────────────────
let target = { x: 0, y: 0, size: 120, color: TARGET_COLOR };
let traps  = [];

const gameDuration = 15000;
let remainingTime = 0, moveInterval = 750, lastMoveTime = 0;
let clicks = 0, totalClicks = 0, bestClicks = 0;
if (localStorage.getItem("aimTrainerBestScore"))
    bestClicks = parseInt(localStorage.getItem("aimTrainerBestScore"));
let lastTargetTime = 0, bestReaction = Infinity;

const scoreLabel        = document.getElementById("score");
const bestScoreLabel    = document.getElementById("bestScore");
const precisionLabel    = document.getElementById("precision");
const bestReactionLabel = document.getElementById("bestReaction");
const bigTimer          = document.getElementById("bigTimer");
const startBtn          = document.getElementById("startBtn");
const statusText        = document.getElementById("status");

bestScoreLabel.textContent = bestClicks;
let running = false;

// ── HELPERS ───────────────────────────────────────────────────────
function createTraps() {
    traps = [];
    for (let i = 0; i < 4; i++)
        traps.push({ x: 0, y: 0, size: 120, color: randomTrapColor() });
}

function isOverlapping(ax, ay, bx, by, size) {
    return Math.abs(ax - bx) < size && Math.abs(ay - by) < size;
}

function moveButtons() {
    const s = target.size, topSafe = 200;

    // Cible toujours rouge
    target.color = TARGET_COLOR;
    target.x = Math.random() * (canvas.width  - s);
    target.y = Math.random() * (canvas.height - s - topSafe) + topSafe;

    traps.forEach((t, i) => {
        // Nouvelle couleur aléatoire sans rouge
        t.color = randomTrapColor();
        let valid = false;
        while (!valid) {
            t.x = Math.random() * (canvas.width  - s);
            t.y = Math.random() * (canvas.height - s - topSafe) + topSafe;
            valid = true;
            if (isOverlapping(t.x, t.y, target.x, target.y, s)) { valid = false; continue; }
            for (let j = 0; j < i; j++)
                if (isOverlapping(t.x, t.y, traps[j].x, traps[j].y, s)) { valid = false; break; }
        }
    });

    lastTargetTime = Date.now();
}

// ── DRAW CERCLE (cible + pièges) ─────────────────────────────────
function drawCircle(x, y, size, color) {
    const cx = x + size / 2, cy = y + size / 2, r = size / 2;

    ctx.save();
    ctx.shadowColor = color.glow;
    ctx.shadowBlur  = 22;

    // Cercle principal
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color.fill;
    ctx.fill();

    // Anneau blanc
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth   = 4;
    ctx.stroke();

    // Reflet
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();

    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCircle(target.x, target.y, target.size, target.color);
    traps.forEach(t => drawCircle(t.x, t.y, t.size, t.color));
}

// ── PRECISION ─────────────────────────────────────────────────────
function updatePrecision() {
    precisionLabel.textContent = totalClicks === 0
        ? "0%"
        : ((clicks / totalClicks) * 100).toFixed(1) + "%";
}

// ── CLICK ─────────────────────────────────────────────────────────
canvas.addEventListener("click", e => {
    if (!running) return;
    totalClicks++;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    // Cible (cercle rouge)
    const dx = x - (target.x + target.size / 2);
    const dy = y - (target.y + target.size / 2);
    if (dx*dx + dy*dy <= (target.size / 2) ** 2) {
        hitSound();
        clicks++;
        remainingTime += 500;
        scoreLabel.textContent = clicks;
        target.size -= 1;
        if (target.size < 20) target.size = 20;
        const reaction = Date.now() - lastTargetTime;
        if (reaction < bestReaction) {
            bestReaction = reaction;
            bestReactionLabel.textContent = reaction + " ms";
        }
        lastMoveTime = Date.now();
        moveButtons();
        updatePrecision();
        return;
    }

    // Pièges (cercles colorés)
    for (let t of traps) {
        const tdx = x - (t.x + t.size / 2);
        const tdy = y - (t.y + t.size / 2);
        if (tdx*tdx + tdy*tdy <= (t.size / 2) ** 2) {
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

// ── STATS ─────────────────────────────────────────────────────────
function updateStats() {
    if (clicks > bestClicks) {
        bestClicks = clicks;
        bestScoreLabel.textContent = bestClicks;
        localStorage.setItem("aimTrainerBestScore", bestClicks);
        localStorage.setItem("wins_AimTrainer", bestClicks);
    }
}

// ── COUNTDOWN ─────────────────────────────────────────────────────
const countdownEl = document.getElementById("countdown");

function startCountdown(callback) {
    let count = 3;
    countdownEl.textContent = count;
    bigTimer.style.display = "none";

    const interval = setInterval(() => {
        count--;
        if (count > 0)        countdownEl.textContent = count;
        else if (count === 0) countdownEl.textContent = "GO!";
        else {
            clearInterval(interval);
            countdownEl.textContent = "";
            bigTimer.style.display = "block";
            callback();
        }
    }, 1000);
} 
// ── GAME LOOP ─────────────────────────────────────────────────────
function loop() {
    if (!running) return;
    remainingTime -= 16;
    if (remainingTime <= 0) { remainingTime = 0; endGame(); return; }
    bigTimer.textContent = (remainingTime / 1000).toFixed(1);
    if (Date.now() - lastMoveTime >= moveInterval) { moveButtons(); lastMoveTime = Date.now(); }
    draw();
    requestAnimationFrame(loop);
}

// ── START ─────────────────────────────────────────────────────────
startBtn.onclick = () => {
    statusText.remove();
    bestReaction = Infinity;
    bestReactionLabel.textContent = "N/A";
    clicks = 0; totalClicks = 0;
    remainingTime = gameDuration;
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

// ── END ───────────────────────────────────────────────────────────
function endGame() {
    running = false;
    updateStats();
    startBtn.style.display = "block";
    statusText.style.display = "block"; // ← ajoute ça
    traps = [];
    target.x = -9999; target.y = -9999;
    draw();
}

}
