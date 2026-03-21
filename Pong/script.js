console.log("Pong JS loaded!");

function hitSound() {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.type = "square"; o.frequency.value = 350; g.gain.value = 0.25;
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.07);
}
function scoreSound() {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sawtooth"; o.frequency.value = 180; g.gain.value = 0.3;
    o.connect(g); g.connect(c.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.25);
    o.stop(c.currentTime + 0.3);
}

const canvas = document.getElementById("pongCanvas");
const ctx    = canvas.getContext("2d");

const WIDTH  = 800;
const HEIGHT = 500;
const PADDLE_WIDTH  = 14;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS   = 10;

let paddle1Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
let paddle2Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;

const PADDLE_SPEED = 8;
const BOT_SPEED    = 4;

let ballX = WIDTH / 2;
let ballY = HEIGHT / 2;

const INITIAL_SPEED  = 6;
const MAX_BALL_SPEED = INITIAL_SPEED * 2;
const SPEED_INC      = 1.075;
let ballSpeed  = INITIAL_SPEED;
let ballXSpeed = 0;
let ballYSpeed = 0;

const MAX_SCORE = 3;
let p1Score = 0, p2Score = 0;

let zPressed = false, sPressed = false;
let touchUp  = false, touchDown = false;
let waiting  = true;
let over     = false;

const gameText = document.getElementById("gameText");

function saveWin() {
    localStorage.setItem("wins_pong",
        Number(localStorage.getItem("wins_pong") || 0) + 1);
}

/* ── DRAW ─────────────────────────────────────────────────────── */
function draw() {
    // Fond noir
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    
    // Côté gauche rouge
    ctx.strokeStyle = "#ff1744";
    ctx.shadowColor = "rgba(255,23,68,0.9)";
    ctx.shadowBlur  = 18;
    ctx.beginPath();
    ctx.moveTo(1, 1); ctx.lineTo(1, HEIGHT - 1);         // gauche
    ctx.moveTo(1, 1); ctx.lineTo(WIDTH - 1, 1);          // haut
    ctx.moveTo(1, HEIGHT - 1); ctx.lineTo(WIDTH - 1, HEIGHT - 1); // bas
    ctx.stroke();
    // Côté droit bleu
    ctx.strokeStyle = "#2979ff";
    ctx.shadowColor = "rgba(41,121,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(WIDTH - 1, 1); ctx.lineTo(WIDTH - 1, HEIGHT - 1);
    ctx.stroke();
    ctx.restore();

    // Ligne centrale pointillée
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.restore();

    // Scores
    ctx.save();
    ctx.font = "bold 56px 'Orbitron', monospace";
    ctx.textAlign = "center";
    // Score joueur rouge
    ctx.fillStyle = "rgba(255,23,68,0.3)";
    ctx.shadowColor = "rgba(255,23,68,0.5)";
    ctx.shadowBlur  = 10;
    ctx.fillText(p1Score, WIDTH / 2 - 80, 70);
    // Score bot bleu
    ctx.fillStyle = "rgba(41,121,255,0.3)";
    ctx.shadowColor = "rgba(41,121,255,0.5)";
    ctx.fillText(p2Score, WIDTH / 2 + 80, 70);
    ctx.restore();

    // Paddle joueur — néon rouge
    ctx.save();
    ctx.shadowColor = "#ff1744";
    ctx.shadowBlur  = 22;
    ctx.fillStyle   = "#ff1744";
    roundRect(30, paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
    ctx.restore();

    // Paddle bot — néon bleu
    ctx.save();
    ctx.shadowColor = "#2979ff";
    ctx.shadowBlur  = 22;
    ctx.fillStyle   = "#2979ff";
    roundRect(WIDTH - 44, paddle2Y, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
    ctx.restore();

    // Balle — néon blanc
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur  = 28;
    ctx.fillStyle   = "#ffffff";
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Bordure dégradée rouge → violet → bleu
    const borderGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
    borderGrad.addColorStop(0,   '#ff1744');
    borderGrad.addColorStop(0.5, '#cc00ff');
    borderGrad.addColorStop(1,   '#2979ff');

    ctx.save();
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth   = 3;
    ctx.strokeRect(1.5, 1.5, WIDTH - 3, HEIGHT - 3);
    ctx.restore();
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
    ctx.fill();
}

/* ── UPDATE ───────────────────────────────────────────────────── */
function update() {
    if (over || waiting) return;

    if (zPressed || touchUp)   paddle1Y -= PADDLE_SPEED;
    if (sPressed || touchDown) paddle1Y += PADDLE_SPEED;
    paddle1Y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, paddle1Y));

    if (Math.random() > 1/30) {
        const target = ballY + ballSpeed * 1.5 - PADDLE_HEIGHT / 2;
        if (paddle2Y + PADDLE_HEIGHT / 2 < target) paddle2Y += BOT_SPEED;
        if (paddle2Y + PADDLE_HEIGHT / 2 > target) paddle2Y -= BOT_SPEED;
    }
    paddle2Y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, paddle2Y));

    ballX += ballXSpeed;
    ballY += ballYSpeed;

    if (ballY - BALL_RADIUS <= 0 || ballY + BALL_RADIUS >= HEIGHT) ballYSpeed *= -1;

    const p1 = { x: 30,          y: paddle1Y, w: PADDLE_WIDTH, h: PADDLE_HEIGHT };
    const p2 = { x: WIDTH - 44,  y: paddle2Y, w: PADDLE_WIDTH, h: PADDLE_HEIGHT };

    if (hits(ballX, ballY, BALL_RADIUS, p1) && ballXSpeed < 0) bounce(true);
    if (hits(ballX, ballY, BALL_RADIUS, p2) && ballXSpeed > 0) bounce(false);

    if (ballX < 0)      { p2Score++; scored(); }
    else if (ballX > WIDTH) { p1Score++; scored(); }
}

function hits(bx, by, br, p) {
    return bx + br > p.x && bx - br < p.x + p.w &&
           by + br > p.y && by - br < p.y + p.h;
}

function scored() {
    scoreSound();
    resetBall(); resetPaddles();
    checkOver();
    if (!over) {
        waiting = true;
        gameText.textContent = "Press Z to continue";
        gameText.style.color = "";
    }
}

function bounce(left) {
    hitSound();
    const a = [-20, 0, 20][Math.floor(Math.random() * 3)] * Math.PI / 180;
    ballSpeed  = Math.min(ballSpeed * SPEED_INC, MAX_BALL_SPEED);
    ballXSpeed = (left ? 1 : -1) * Math.abs(Math.cos(a) * ballSpeed);
    ballYSpeed = Math.sin(a) * ballSpeed;
}

function checkOver() {
    if (p1Score >= MAX_SCORE || p2Score >= MAX_SCORE) {
        over = true;
        if (p1Score > p2Score) {
            gameText.textContent = "PLAYER WINS!";
            gameText.style.color = "#ff1744";
            saveWin();
        } else {
            gameText.textContent = "BOT WINS!";
            gameText.style.color = "#2979ff";
        }
    }
}

function resetBall() {
    ballX = WIDTH / 2; ballY = HEIGHT / 2;
    ballSpeed = INITIAL_SPEED; ballXSpeed = 0; ballYSpeed = 0;
}
function resetPaddles() {
    paddle1Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle2Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
}
function resetGame() {
    p1Score = 0; p2Score = 0; over = false; waiting = true;
    gameText.textContent = "First to 5 wins — Press Z to start";
    gameText.style.color = "";
    resetBall(); resetPaddles();
}

function startBall() {
    if (!waiting || over) return;
    waiting = false;
    gameText.textContent = "";
    const a = [-20, 0, 20][Math.floor(Math.random() * 3)] * Math.PI / 180;
    ballXSpeed = Math.cos(a) * ballSpeed;
    ballYSpeed = Math.sin(a) * ballSpeed;
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

document.addEventListener("keydown", e => {
    if (e.key === "z") { zPressed = true; startBall(); }
    if (e.key === "s")  sPressed = true;
    if (e.key === " " && over) resetGame();
    if (e.key === "Escape") window.location.href = "../index.html";
});
document.addEventListener("keyup", e => {
    if (e.key === "z") zPressed = false;
    if (e.key === "s") sPressed = false;
});

document.getElementById("btnUp").addEventListener("touchstart",   () => { touchUp = true;  startBall(); }, { passive: true });
document.getElementById("btnUp").addEventListener("touchend",     () => { touchUp = false; });
document.getElementById("btnDown").addEventListener("touchstart", () => { touchDown = true; },  { passive: true });
document.getElementById("btnDown").addEventListener("touchend",   () => { touchDown = false; });

resetGame();
loop();