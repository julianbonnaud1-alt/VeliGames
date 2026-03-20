console.log("Connect Four JS loaded!");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ROWS = 6;
const COLS = 7;

function getCellSize() {
    return canvas.width / COLS; // 570 / 7
}

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let playerTurn = true;
let scorePlayer = 0, scoreBot = 0;
let gameOver = false;

const scoreLabel = document.getElementById("score");
const replayBtn = document.getElementById("replay");
const statusLabel = document.getElementById("status");

/* 🔥 Sauvegarde des victoires (1 victoire = 5 points) */
function saveMatchWin() {
    let wins = Number(localStorage.getItem("wins_connect4") || 0);
    localStorage.setItem("wins_connect4", wins + 1);
}

/* ------------------ CLICK + TOUCH FIX ------------------ */

let touchUsed = false;

function getColumnFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();

    // Position du doigt dans l'écran
    const xScreen = clientX - rect.left;

    // Conversion en coordonnées du canvas (570px)
    const xCanvas = xScreen * (canvas.width / rect.width);

    const CELL = getCellSize();
    return Math.floor(xCanvas / CELL);
}

/* PC */
canvas.addEventListener("click", e => {
    if (touchUsed) return;
    if (!playerTurn || gameOver) return;

    const col = getColumnFromClientX(e.clientX);
    dropPiece(col, 1);
});

/* MOBILE */
canvas.addEventListener("touchstart", e => {
    touchUsed = true;
    e.preventDefault();

    if (!playerTurn || gameOver) return;

    const touch = e.touches[0];
    const col = getColumnFromClientX(touch.clientX);
    dropPiece(col, 1);

    setTimeout(() => touchUsed = false, 120);
}, { passive: false });

/* -------------------------------------------------------- */

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

            const cx = c * CELL + CELL / 2;
            const cy = r * CELL + CELL / 2;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }
}

function getRow(col) {
    for (let r = ROWS - 1; r >= 0; r--)
        if (board[r][col] === 0) return r;
    return -1;
}

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

function botMove() {
    if (gameOver) return;

    // 1️⃣ Bot winning move
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

    // 2️⃣ Block player winning move
    for (let c = 0; c < COLS; c++) {
        let r = getRow(c);
        if (r !== -1) {
            board[r][c] = 1;
            if (checkWin(1)) {
                board[r][c] = 0;
                dropPiece(c, 2);
                return;
            }
            board[r][c] = 0;
        }
    }

    // 3️⃣ Avoid losing moves
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
        dropPiece(safeMoves[Math.floor(Math.random() * safeMoves.length)], 2);
        return;
    }

    // 4️⃣ Fallback priority
    const priority = [3, 2, 4, 1, 5, 0, 6];
    for (let col of priority) {
        if (getRow(col) !== -1) {
            dropPiece(col, 2);
            return;
        }
    }
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

drawBoard();
