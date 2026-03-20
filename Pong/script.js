console.log("Pong JS loaded!");

// --- SONS SANS FICHIERS (Web Audio API) ---
function hitSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 350;
    gain.gain.value = 0.25;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
}

function scoreSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = 180;
    gain.gain.value = 0.3;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.3);
}

// CANVAS
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 800;
const HEIGHT = 500;

const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 20;

// Positions
let paddle1Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
let paddle2Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;

// Vitesses constantes
const PADDLE_SPEED = 8;
const BOT_SPEED = 4;

// Balle
let ballX = WIDTH / 2 - BALL_SIZE / 2;
let ballY = HEIGHT / 2 - BALL_SIZE / 2;

const INITIAL_BALL_SPEED = 6;
const MAX_BALL_SPEED = INITIAL_BALL_SPEED * 2;
let ballSpeed = INITIAL_BALL_SPEED;

let ballXSpeed = 0;
let ballYSpeed = 0;

const SPEED_INCREMENT = 1.075;

const MAX_SCORE = 5;

// États
let player1Score = 0;
let player2Score = 0;

let zPressed = false;
let sPressed = false;

// 🔥 États tactiles
let touchUp = false;
let touchDown = false;

let waitingForStart = true;
let gameOver = false;

// Texte unique
const gameText = document.getElementById("gameText");

/* 🔥 Sauvegarde des victoires (1 victoire = 5 points) */
function saveMatchWin() {
    let wins = Number(localStorage.getItem("wins_pong") || 0);
    localStorage.setItem("wins_pong", wins + 1);
}

function resetPaddles() {
    paddle1Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle2Y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
}

function resetBall() {
    ballX = WIDTH / 2 - BALL_SIZE / 2;
    ballY = HEIGHT / 2 - BALL_SIZE / 2;

    ballSpeed = INITIAL_BALL_SPEED;

    ballXSpeed = 0;
    ballYSpeed = 0;
}

function resetGame() {
    player1Score = 0;
    player2Score = 0;
    gameOver = false;
    waitingForStart = true;

    gameText.textContent = "First to 5 wins — Press Z to start";

    resetPaddles();
    resetBall();
}

function draw() {
    ctx.fillStyle = "#4c6ef5";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Ligne centrale
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();

    // Scores
    ctx.fillStyle = "white";
    ctx.font = "36px Arial";
    ctx.fillText(player1Score, WIDTH / 2 - 60, 50);
    ctx.fillText(player2Score, WIDTH / 2 + 40, 50);

    // Paddles
    ctx.fillRect(30, paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(WIDTH - 45, paddle2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Balle
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
}

function update() {
    if (gameOver) return;
    if (waitingForStart) return;

    // 🔥 Déplacement joueur (clavier + tactile)
    if (zPressed || touchUp) paddle1Y -= PADDLE_SPEED;
    if (sPressed || touchDown) paddle1Y += PADDLE_SPEED;

    paddle1Y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, paddle1Y));

    // BOT avec erreurs
    let botFails = Math.random() < 1/30;

    if (!botFails) {
        const anticipation = ballSpeed * 1.50;
        const targetY = ballY + anticipation - PADDLE_HEIGHT / 2;

        if (paddle2Y + PADDLE_HEIGHT / 2 < targetY) paddle2Y += BOT_SPEED;
        if (paddle2Y + PADDLE_HEIGHT / 2 > targetY) paddle2Y -= BOT_SPEED;
    }

    paddle2Y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, paddle2Y));

    // Déplacement balle
    ballX += ballXSpeed;
    ballY += ballYSpeed;

    // Rebonds haut/bas
    if (ballY <= 0 || ballY + BALL_SIZE >= HEIGHT) {
        ballYSpeed *= -1;
    }

    // Collisions paddles
    const ballRect = { x: ballX, y: ballY, w: BALL_SIZE, h: BALL_SIZE };
    const p1 = { x: 30, y: paddle1Y, w: PADDLE_WIDTH, h: PADDLE_HEIGHT };
    const p2 = { x: WIDTH - 45, y: paddle2Y, w: PADDLE_WIDTH, h: PADDLE_HEIGHT };

    if (intersects(ballRect, p1) && ballXSpeed < 0) bounce(true);
    if (intersects(ballRect, p2) && ballXSpeed > 0) bounce(false);

    // Points
    if (ballX < 0) {
        player2Score++;
        pointScored();
    } else if (ballX > WIDTH) {
        player1Score++;
        pointScored();
    }
}

function pointScored() {
    scoreSound(); // 🔊 SON DE BUT

    checkGameOver();

    if (gameOver) {
        resetBall();
        resetPaddles();
        return;
    }

    resetBall();
    resetPaddles();

    waitingForStart = true;
    gameText.textContent = "Press Z to continue";
}

function intersects(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

function bounce(leftPaddle) {
    hitSound(); // 🔊 SON DE COLLISION

    const angles = [-20, 0, 20];
    const offset = angles[Math.floor(Math.random() * angles.length)];
    const angleRad = offset * Math.PI / 180;

    // Accélération balle (max 2×)
    ballSpeed = Math.min(ballSpeed * SPEED_INCREMENT, MAX_BALL_SPEED);

    const direction = leftPaddle ? 1 : -1;

    ballXSpeed = direction * Math.abs(Math.cos(angleRad) * ballSpeed);
    ballYSpeed = Math.sin(angleRad) * ballSpeed;
}

function checkGameOver() {
    if (player1Score >= MAX_SCORE || player2Score >= MAX_SCORE) {
        gameOver = true;

        const winner = player1Score > player2Score ? "Player" : "Bot";
        gameText.textContent = `${winner} wins!`;

        if (winner === "Player") saveMatchWin();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

/* 🎮 Clavier */
document.addEventListener("keydown", e => {

    if (e.key === "z") {
        zPressed = true;

        if (waitingForStart && !gameOver) {
            waitingForStart = false;
            gameText.textContent = "";

            const angles = [-20, 0, 20];
            const offset = angles[Math.floor(Math.random() * angles.length)];
            const angleRad = offset * Math.PI / 180;

            ballXSpeed = Math.cos(angleRad) * ballSpeed;
            ballYSpeed = Math.sin(angleRad) * ballSpeed;
        }
    }

    if (e.key === "s") sPressed = true;

    if (e.key === " " && gameOver) resetGame();
    if (e.key === "Escape") window.location.href = "../index.html";
});

document.addEventListener("keyup", e => {
    if (e.key === "z") zPressed = false;
    if (e.key === "s") sPressed = false;
});

/* 🎮 Touch Controls */
document.getElementById("btnUp").addEventListener("touchstart", () => {
    touchUp = true;

    if (waitingForStart && !gameOver) {
        waitingForStart = false;
        gameText.textContent = "";

        const angles = [-20, 0, 20];
        const offset = angles[Math.floor(Math.random() * angles.length)];
        const angleRad = offset * Math.PI / 180;

        ballXSpeed = Math.cos(angleRad) * ballSpeed;
        ballYSpeed = Math.sin(angleRad) * ballSpeed;
    }
});

document.getElementById("btnUp").addEventListener("touchend", () => {
    touchUp = false;
});

document.getElementById("btnDown").addEventListener("touchstart", () => {
    touchDown = true;
});

document.getElementById("btnDown").addEventListener("touchend", () => {
    touchDown = false;
});

resetGame();
loop();
