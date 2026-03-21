const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 20;
let snake;
let direction;
let food;
let score;
let best = Number(localStorage.getItem("bestSnakeScore") || 0);

document.getElementById("best").textContent = "Best : " + best;

const gameOverText = document.getElementById("gameOver");
const restartMsg = document.getElementById("restartMsg");

let gameLoop = null;
let gameStarted = false;

// -------------------------
// 🔊 Son crunch
// -------------------------
let audioCtx = null;
function playCrunch() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

// -------------------------
// 🍏 Génération de nourriture SANS spawn dans le serpent
// -------------------------
function generateFood() {
    let newFood;
    let conflict;

    do {
        conflict = false;

        newFood = {
            x: Math.floor(Math.random() * 16) * box,
            y: Math.floor(Math.random() * 16) * box
        };

        for (let part of snake) {
            if (part.x === newFood.x && part.y === newFood.y) {
                conflict = true;
                break;
            }
        }

    } while (conflict);

    return newFood;
}

// -------------------------
// 🎨 Dégradé + écailles
// -------------------------
function getSnakeColor(index) {
    const start = { r: 0, g: 255, b: 180 };
    const end   = { r: 0, g: 120, b: 60 };

    const t = Math.min(index / 20, 1);

    const r = start.r + (end.r - start.r) * t;
    const g = start.g + (end.g - start.g) * t;
    const b = start.b + (end.b - start.b) * t;

    return `rgb(${r}, ${g}, ${b})`;
}

// -------------------------
// 🐍 Tête orientée
// -------------------------
function drawHead(x, y) {
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.roundRect(x, y, box, box, 8);
    ctx.fill();

    ctx.fillStyle = "#000";

    if (direction === "UP") {
        ctx.fillRect(x + 5, y + 3, 3, 3);
        ctx.fillRect(x + box - 8, y + 3, 3, 3);
    }
    if (direction === "DOWN") {
        ctx.fillRect(x + 5, y + box - 6, 3, 3);
        ctx.fillRect(x + box - 8, y + box - 6, 3, 3);
    }
    if (direction === "LEFT") {
        ctx.fillRect(x + 3, y + 5, 3, 3);
    }
    if (direction === "RIGHT") {
        ctx.fillRect(x + box - 6, y + 5, 3, 3);
    }
}

// -------------------------
// 🐍 Corps avec écailles
// -------------------------
function drawBody(x, y, index) {
    ctx.fillStyle = getSnakeColor(index);

    ctx.beginPath();
    ctx.roundRect(x, y, box, box, 10);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(x + box/2, y + box/2, 4, 0, Math.PI * 2);
    ctx.fill();
}

// -------------------------
// 🍏 Dessin de la nourriture
// -------------------------
function drawFood() {
    ctx.fillStyle = "#ff004c";
    ctx.beginPath();
    ctx.arc(food.x + box/2, food.y + box/2, box/2 - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00ff4c";
    ctx.fillRect(food.x + box/2 - 2, food.y + 2, 4, 6);
}

// -------------------------
// 🎮 Initialisation du jeu
// -------------------------
function initGame() {
    snake = [{ x: 8 * box, y: 8 * box }];
    direction = null;
    score = 0;
    gameStarted = false;

    document.getElementById("score").textContent = "Score : 0";
    gameOverText.classList.add("hidden");
    restartMsg.classList.add("hidden");

    food = generateFood();

    if (gameLoop) clearInterval(gameLoop);

    gameLoop = setInterval(draw, 120);
}

initGame();

// -------------------------
// ⌨️ Contrôles clavier (PC)
// -------------------------
document.addEventListener("keydown", (e) => {

    if (e.key === " ") {
        initGame();
        return;
    }

    // 🔥 DÉMARRAGE DANS LA DIRECTION DE LA TOUCHE
    if (!gameStarted) {
        gameStarted = true;

        if (e.key === "z") direction = "UP";
        if (e.key === "s") direction = "DOWN";
        if (e.key === "q") direction = "LEFT";
        if (e.key === "d") direction = "RIGHT";

        return;
    }

    if (e.key === "z" && direction !== "DOWN") direction = "UP";
    if (e.key === "s" && direction !== "UP") direction = "DOWN";
    if (e.key === "q" && direction !== "RIGHT") direction = "LEFT";
    if (e.key === "d" && direction !== "LEFT") direction = "RIGHT";
});

// -------------------------
// 📱 Contrôles tactiles (mobile)
// -------------------------
["up","down","left","right"].forEach(id=>{
    document.getElementById(id).onclick = () => {

        // 🔥 Restart mobile : bouton HAUT
        if (id === "up" && !gameStarted) {
            initGame();
            return;
        }

        // 🔥 DÉMARRAGE DANS LA DIRECTION DU BOUTON
        if (!gameStarted) {
            gameStarted = true;
            direction = id.toUpperCase(); // "UP", "DOWN", "LEFT", "RIGHT"
            return;
        }

        if (id==="up" && direction!=="DOWN") direction="UP";
        if (id==="down" && direction!=="UP") direction="DOWN";
        if (id==="left" && direction!=="RIGHT") direction="LEFT";
        if (id==="right" && direction!=="LEFT") direction="RIGHT";
    };
});

// -------------------------
// 🖥️ Boucle de jeu
// -------------------------
function draw() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawFood();

    snake.forEach((part, index) => {
        if (index === 0) drawHead(part.x, part.y);
        else drawBody(part.x, part.y, index);
    });

    if (!gameStarted || !direction) return;

    let head = { x: snake[0].x, y: snake[0].y };

    if (direction === "UP") head.y -= box;
    if (direction === "DOWN") head.y += box;
    if (direction === "LEFT") head.x -= box;
    if (direction === "RIGHT") head.x += box;

    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height)
        return gameOver();

    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y)
            return gameOver();
    }

    if (head.x === food.x && head.y === food.y) {
        score++;
        document.getElementById("score").textContent = "Score : " + score;

        playCrunch();

        food = generateFood();
    } else {
        snake.pop();
    }

    snake.unshift(head);
}

// -------------------------
// 💀 Game Over
// -------------------------
function gameOver() {
    clearInterval(gameLoop);
    gameOverText.classList.remove("hidden");
    restartMsg.classList.remove("hidden");
    gameStarted = false;

    if (score > best) {
        best = score;
        localStorage.setItem("bestSnakeScore", best);
        localStorage.setItem("wins_Snake", best);
        document.getElementById("best").textContent = "Best : " + best;
    }
}
