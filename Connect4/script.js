console.log("Connect Four – Learning Bot Loaded!");

/* --- SON DE VICTOIRE --- */
function winSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 400;
    gain.gain.value = 0.25;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.3);
}

/* --- CANVAS & CONSTANTES --- */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ROWS = 6;
const COLS = 7;

function getCellSize() {
    return canvas.width / COLS;
}

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let playerTurn = true;
let gameOver = false;

let scorePlayer = 0;
let scoreBot = 0;

const scoreLabel = document.getElementById("score");
const replayBtn = document.getElementById("replay");
const statusLabel = document.getElementById("status");

/* --- STATS D’APPRENTISSAGE --- */
// Combien de fois le joueur joue dans chaque colonne
let playerColumnStats = Array(COLS).fill(0);
// Combien de menaces (3 alignés, double menaces) viennent de chaque colonne
let threatStats = Array(COLS).fill(0);

/* --- SAUVEGARDE DES MATCHS GAGNÉS --- */
function saveMatchWin() {
    let wins = Number(localStorage.getItem("wins_connect4") || 0);
    localStorage.setItem("wins_connect4", wins + 1);
}

/* --- GESTION INPUT (CLICK + TOUCH) --- */
let touchUsed = false;

function getColumnFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const xScreen = clientX - rect.left;
    const xCanvas = xScreen * (canvas.width / rect.width);
    return Math.floor(xCanvas / getCellSize());
}

canvas.addEventListener("click", e => {
    if (touchUsed) return;
    if (!playerTurn || gameOver) return;
    const col = getColumnFromClientX(e.clientX);
    handlePlayerMove(col);
});

canvas.addEventListener("touchstart", e => {
    touchUsed = true;
    e.preventDefault();
    if (!playerTurn || gameOver) return;
    const col = getColumnFromClientX(e.touches[0].clientX);
    handlePlayerMove(col);
    setTimeout(() => touchUsed = false, 120);
}, { passive: false });

function handlePlayerMove(col) {
    playerColumnStats[col]++; // le bot apprend où tu joues souvent
    dropPiece(col, 1);
}

/* --- RESET --- */
replayBtn.onclick = () => {
    replayBtn.style.display = "none";
    gameOver = false;
    resetBoard();
};

function resetBoard() {

    if (scorePlayer >= 5) {
        statusLabel.textContent = "CONGRATULATIONS! You've won!";
        saveMatchWin();
        return;
    }

    if (scoreBot >= 5) {
        statusLabel.textContent = "Too bad, maybe next time...";
        return;
    }

    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    playerTurn = true;
    statusLabel.textContent = "Your turn";
    drawBoard();
}

/* --- DESSIN DU PLATEAU --- */
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const CELL = getCellSize();
    const radius = CELL * 0.37;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {

            ctx.fillStyle = "#222";
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);

            let color = "#000";
            if (board[r][c] === 1) color = "red";
            if (board[r][c] === 2) color = "blue";

            ctx.beginPath();
            ctx.arc(
                c * CELL + CELL / 2,
                r * CELL + CELL / 2,
                radius,
                0, Math.PI * 2
            );
            ctx.fillStyle = color;
            ctx.fill();
        }
    }
}

/* --- LOGIQUE DE JEU --- */
function getRow(col) {
    for (let r = ROWS - 1; r >= 0; r--)
        if (board[r][col] === 0) return r;
    return -1;
}

function isFull() {
    return board[0].every(v => v !== 0);
}

function checkWin(p) {
    // Horizontal
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS - 3; c++)
            if (board[r][c] === p && board[r][c+1] === p && board[r][c+2] === p && board[r][c+3] === p)
                return true;

    // Vertical
    for (let c = 0; c < COLS; c++)
        for (let r = 0; r < ROWS - 3; r++)
            if (board[r][c] === p && board[r+1][c] === p && board[r+2][c] === p && board[r+3][c] === p)
                return true;

    // Diagonal ↘
    for (let r = 0; r < ROWS - 3; r++)
        for (let c = 0; c < COLS - 3; c++)
            if (board[r][c] === p && board[r+1][c+1] === p && board[r+2][c+2] === p && board[r+3][c+3] === p)
                return true;

    // Diagonal ↗
    for (let r = 3; r < ROWS; r++)
        for (let c = 0; c < COLS - 3; c++)
            if (board[r][c] === p && board[r-1][c+1] === p && board[r-2][c+2] === p && board[r-3][c+3] === p)
                return true;

    return false;
}

/* --- DÉTECTION DOUBLE MENACE --- */
function createsDoubleThreat(player, col) {
    let r = getRow(col);
    if (r === -1) return false;

    board[r][col] = player;

    let winningMoves = 0;

    for (let c = 0; c < COLS; c++) {
        let rr = getRow(c);
        if (rr !== -1) {
            board[rr][c] = player;
            if (checkWin(player)) winningMoves++;
            board[rr][c] = 0;
        }
    }

    board[r][col] = 0;

    if (winningMoves >= 2) {
        threatStats[col]++; // le bot apprend que cette colonne génère des menaces
        return true;
    }

    return false;
}

/* --- DROP AVEC ANIMATION --- */
function dropPiece(col, player) {
    if (gameOver) return;
    if (col < 0 || col >= COLS) return;

    const row = getRow(col);
    if (row === -1) return;

    const CELL = getCellSize();
    let y = 0;
    const targetY = row * CELL;
    const radius = CELL * 0.37;

    const anim = setInterval(() => {
        drawBoard();

        ctx.beginPath();
        ctx.arc(col * CELL + CELL / 2, y + CELL / 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = player === 1 ? "red" : "blue";
        ctx.fill();

        y += CELL / 5;

        if (y >= targetY) {
            clearInterval(anim);
            board[row][col] = player;
            drawBoard();

            if (checkWin(player)) {
                winSound();
                if (player === 1) scorePlayer++;
                else scoreBot++;
                updateScore();
                gameOver = true;
                replayBtn.style.display = "block";
                statusLabel.textContent = player === 1 ? "Player wins!" : "Bot wins!";
                return;
            }

            if (isFull()) {
                gameOver = true;
                replayBtn.style.display = "block";
                statusLabel.textContent = "Draw!";
                return;
            }

            if (player === 1) {
                playerTurn = false;
                setTimeout(botMove, 200);
            } else {
                playerTurn = true;
            }
        }
    }, 12);
}

function updateScore() {
    scoreLabel.textContent = `Player: ${scorePlayer} | Bot: ${scoreBot}`;
}

/* ---------------------------------------------------------
   🤖 BOT QUI APPREND TES PATTERNS
   --------------------------------------------------------- */

function botMove() {
    if (gameOver) return;

    // 1️⃣ Coup gagnant pour le bot
    for (let c = 0; c < COLS; c++) {
        let r = getRow(c);
        if (r !== -1) {
            board[r][c] = 2;
            if (checkWin(2)) {
                board[r][c] = 0;
                dropPiece(c, 2);
                return;
            }
            board[r][c] = 0;
        }
    }

    // 2️⃣ Blocage direct des victoires du joueur
    let blockMoves = [];
    for (let c = 0; c < COLS; c++) {
        let r = getRow(c);
        if (r !== -1) {
            board[r][c] = 1;
            if (checkWin(1)) {
                blockMoves.push(c);
            }
            board[r][c] = 0;
        }
    }
    if (blockMoves.length > 0) {
        // Prioriser les colonnes où le joueur joue souvent
        blockMoves.sort((a, b) => (playerColumnStats[b] + threatStats[b]) - (playerColumnStats[a] + threatStats[a]));
        dropPiece(blockMoves[0], 2);
        return;
    }

    // 2️⃣.5 Blocage des doubles menaces
    let doubleThreatBlocks = [];
    for (let c = 0; c < COLS; c++) {
        let r = getRow(c);
        if (r !== -1 && createsDoubleThreat(1, c)) {
            doubleThreatBlocks.push(c);
        }
    }
    if (doubleThreatBlocks.length > 0) {
        doubleThreatBlocks.sort((a, b) => (playerColumnStats[b] + threatStats[b]) - (playerColumnStats[a] + threatStats[a]));
        dropPiece(doubleThreatBlocks[0], 2);
        return;
    }

    // 3️⃣ Coups sûrs (ne donnent pas une victoire immédiate au joueur)
    let safeMoves = [];
    for (let c = 0; c < COLS; c++) {
        let r = getRow(c);
        if (r !== -1) {
            board[r][c] = 2;
            let safe = true;

            for (let cc = 0; cc < COLS; cc++) {
                let rr = getRow(cc);
                if (rr !== -1) {
                    board[rr][cc] = 1;
                    if (checkWin(1)) safe = false;
                    board[rr][cc] = 0;
                }
            }

            board[r][c] = 0;
            if (safe) safeMoves.push(c);
        }
    }

    if (safeMoves.length > 0) {
        // Le bot privilégie les colonnes où tu joues souvent / crées des menaces
        safeMoves.sort((a, b) => (playerColumnStats[b] + threatStats[b]) - (playerColumnStats[a] + threatStats[a]));

        // Mélange léger pour éviter d’être trop prévisible
        if (safeMoves.length > 2) {
            safeMoves = safeMoves.sort(() => Math.random() - 0.5);
        }

        dropPiece(safeMoves[0], 2);
        return;
    }

    // 4️⃣ Fallback : toujours jouer intelligemment, mais avec un peu de variété
    let priority = [3, 2, 4, 1, 5, 0, 6];

    // Pondérer la priorité par les stats du joueur
    priority.sort((a, b) => (playerColumnStats[b] + threatStats[b]) - (playerColumnStats[a] + threatStats[a]));

    // Mélange léger pour ne pas être 100% déterministe
    priority = priority.sort(() => Math.random() - 0.3);

    for (let col of priority) {
        if (getRow(col) !== -1) {
            dropPiece(col, 2);
            return;
        }
    }
}

drawBoard();
