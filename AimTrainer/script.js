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

// --- VARIABLES ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- FIX: RESIZE CANVAS BEFORE ANYTHING ELSE ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let W = canvas.width;
let H = canvas.height;

let target = { x: 0, y: 0, size: 120 };
let traps = [];

let gameDuration = 20000;
let remainingTime = 0;
let moveInterval = 750;

let lastMoveTime = 0;
let clicks = 0;
let clickTimes = [];

let bestClicks = 0;
let bestAverage = Infinity;
let worstAverage = 0;

let running = false;

// UI elements
const timerLabel = document.getElementById("timer");
const recordLabel = document.getElementById("record");
const startBtn = document.getElementById("startBtn");

// Create traps
function createTraps() {
    traps = [];
    for (let i = 0; i < 4; i++) {
        traps.push({
            x: 0,
            y: 0,
            size: 120,
            shape: Math.random() < 0.5 ? "square" : "triangle"
        });
    }
}

// Move target + traps
function moveButtons() {
    let s = target.size;

    target.x = Math.random() * (canvas.width - s);
    target.y = Math.random() * (canvas.height - s - 100) + 80;

    traps.forEach(t => {
        do {
            t.x = Math.random() * (canvas.width - s);
            t.y = Math.random() * (canvas.height - s - 100) + 80;
        } while (Math.abs(t.x - target.x) < s && Math.abs(t.y - target.y) < s);
    });
}

// Draw everything
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Target
    ctx.beginPath();
    ctx.arc(target.x + target.size/2, target.y + target.size/2, target.size/2, 0, Math.PI*2);
    ctx.fillStyle = "red";
    ctx.fill();

    // Traps
    traps.forEach(t => {
        ctx.fillStyle = "red";
        if (t.shape === "square") {
            ctx.fillRect(t.x, t.y, t.size, t.size);
        } else {
            ctx.beginPath();
            ctx.moveTo(t.x, t.y + t.size);
            ctx.lineTo(t.x + t.size/2, t.y);
            ctx.lineTo(t.x + t.size, t.y + t.size);
            ctx.fill();
        }
    });
}

// Click detection
canvas.addEventListener("click", e => {
    if (!running) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Target hit?
    let dx = x - (target.x + target.size/2);
    let dy = y - (target.y + target.size/2);
    if (dx*dx + dy*dy <= (target.size/2)**2) {

        hitSound();

        clicks++;
        clickTimes.push(Date.now());
        remainingTime += 500;

        lastMoveTime = Date.now();
        moveButtons();
        return;
    }

    // Trap hit?
    for (let t of traps) {
        if (x >= t.x && x <= t.x+t.size && y >= t.y && y <= t.y+t.size) {
            remainingTime -= 5000;
            if (remainingTime < 0) remainingTime = 0;
            lastMoveTime = Date.now();
            moveButtons();
            return;
        }
    }
});

// Stats
function updateStats() {
    if (clickTimes.length > 1) {
        let total = 0;
        let max = 0;

        for (let i = 1; i < clickTimes.length; i++) {
            let dt = clickTimes[i] - clickTimes[i-1];
            total += dt;
            if (dt > max) max = dt;
        }

        let avg = total / (clickTimes.length - 1);

        if (avg < bestAverage) bestAverage = avg;
        if (max > worstAverage) worstAverage = max;
    }

    if (clicks > bestClicks) bestClicks = clicks;

    recordLabel.innerHTML =
        `Best clicks: ${bestClicks}<br>` +
        `Best avg: ${bestAverage === Infinity ? "N/A" : Math.round(bestAverage)+" ms"}<br>` +
        `Worst time: ${worstAverage === 0 ? "N/A" : (worstAverage/1000).toFixed(1)+" s"}`;
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

    timerLabel.textContent = "Time: " + (remainingTime/1000).toFixed(1) + " s";

    if (now - lastMoveTime >= moveInterval) {
        moveButtons();
        lastMoveTime = now;
    }

    draw();
    requestAnimationFrame(loop);
}

// Start game
startBtn.onclick = () => {
    clicks = 0;
    clickTimes = [];
    remainingTime = gameDuration;
    lastMoveTime = Date.now();

    createTraps();
    moveButtons();

    running = true;
    startBtn.style.display = "none";

    loop();
};

// End game
function endGame() {
    running = false;
    updateStats();
    startBtn.style.display = "block";
}
