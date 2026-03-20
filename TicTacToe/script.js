console.log("JS loaded!");

// --- SON DE VICTOIRE (sans fichier) ---
function winSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 500;
    gain.gain.value = 0.25;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.3);
}

const SIZE = 3;
let board = [];
let movesX = [];
let movesO = [];
let gameOver = false;
let scoreX = 0, scoreO = 0;

const statusLabel = document.getElementById("status");
const scoreLabel = document.getElementById("score");
const replayBtn = document.getElementById("replay");
const boardDiv = document.getElementById("board");

/* 🔥 Sauvegarde des victoires */
function saveMatchWin() {
    let wins = Number(localStorage.getItem("wins_TicTacToe") || 0);
    localStorage.setItem("wins_TicTacToe", wins + 1);
}

function startGame() {
    scoreX = 0;
    scoreO = 0;
    updateScore();
    resetBoardOnly();
}

function resetBoardOnly() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(" "));
    movesX = [];
    movesO = [];
    gameOver = false;

    boardDiv.classList.remove("board-flash");

    replayBtn.style.display = "none";
    statusLabel.textContent = "First in 5 win !";
    drawBoard();
}

function drawBoard() {
    boardDiv.innerHTML = "";

    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {

            const cell = document.createElement("div");
            cell.className = "cell";

            let value = board[i][j];

            if (movesX.length > 0 && movesX[0][0] === i && movesX[0][1] === j) {
                cell.style.color = "red";
            }

            if (movesO.length > 0 && movesO[0][0] === i && movesO[0][1] === j) {
                cell.style.color = "red";
            }

            cell.textContent = value === " " ? "" : value;
            cell.onclick = () => handleMove(i, j);
            boardDiv.appendChild(cell);
        }
    }
}

function handleMove(row, col) {
    if (gameOver || board[row][col] !== " ") return;

    placeMove(row, col, "X", movesX);
    drawBoard();

    let win = checkWin("X");
    if (win) return endGame("X", win);

    setTimeout(() => {
        if (gameOver) return;
        botPlayInsane();
        drawBoard();

        let winBot = checkWin("O");
        if (winBot) return endGame("O", winBot);

    }, 300);
}

function endGame(symbol, winCells) {
    gameOver = true;

    winSound(); // 🔊 SON DE VICTOIRE

    if (symbol === "X") scoreX++;
    else scoreO++;

    if (scoreX >= 5) {
        statusLabel.textContent = "CONGRATULATIONS! You've won !";

        saveMatchWin(); // 🔥 1 victoire enregistrée

        boardDiv.classList.add("board-flash");
        replayBtn.style.display = "none";
        updateScore();
        return;
    }

    if (scoreO >= 5) {
        statusLabel.textContent = "Maybe next time...";
        boardDiv.classList.add("board-flash");
        replayBtn.style.display = "none";
        updateScore();
        return;
    }

    statusLabel.textContent = (symbol === "X") ? "Player Win!" : "Bot Win!";
    replayBtn.style.display = "block";

    winCells.forEach(([r, c]) => {
        const index = r * SIZE + c;
        boardDiv.children[index].classList.add("win");
    });

    updateScore();
}

function updateScore() {
    scoreLabel.textContent = `Player: ${scoreX} | Bot: ${scoreO}`;
}

function placeMove(row, col, symbol, moves) {
    if (moves.length === 3) {
        const old = moves.shift();
        board[old[0]][old[1]] = " ";
    }

    board[row][col] = symbol;
    moves.push([row, col]);
}

/* BOT INSANE + erreur 1/15 */
function botPlayInsane() {

    let winMove = findWinningMoveSimulated("O", movesO);
    if (winMove) {
        placeMove(winMove[0], winMove[1], "O", movesO);
        return;
    }

    let blockMove = findWinningMoveSimulated("X", movesX);
    if (blockMove) {
        placeMove(blockMove[0], blockMove[1], "O", movesO);
        return;
    }

    const makeMistake = Math.random() < (1/15);

    if (makeMistake) {
        let safeMoves = getSafeMoves();
        if (safeMoves.length > 0) {
            const [r, c] = safeMoves[Math.floor(Math.random() * safeMoves.length)];
            placeMove(r, c, "O", movesO);
            return;
        }
    }

    if (board[1][1] === " ") {
        placeMove(1, 1, "O", movesO);
        return;
    }

    const corners = [[0,0],[0,2],[2,0],[2,2]];
    const freeCorners = corners.filter(([r,c]) => board[r][c] === " ");
    if (freeCorners.length > 0) {
        const [r,c] = freeCorners[Math.floor(Math.random() * freeCorners.length)];
        placeMove(r, c, "O", movesO);
        return;
    }

    const sides = [[0,1],[1,0],[1,2],[2,1]];
    const freeSides = sides.filter(([r,c]) => board[r][c] === " ");
    if (freeSides.length > 0) {
        const [r,c] = freeSides[Math.floor(Math.random() * freeSides.length)];
        placeMove(r, c, "O", movesO);
        return;
    }
}

function getSafeMoves() {
    let safe = [];

    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {

            if (board[i][j] !== " ") continue;

            let tempBoard = board.map(row => [...row]);
            let tempMoves = movesO.map(m => [...m]);

            if (tempMoves.length === 3) {
                let old = tempMoves.shift();
                tempBoard[old[0]][old[1]] = " ";
            }

            tempBoard[i][j] = "O";
            tempMoves.push([i, j]);

            if (!findWinningMoveSimulated("X", movesX)) {
                safe.push([i, j]);
            }
        }
    }

    return safe;
}

function findWinningMoveSimulated(player, movesList) {

    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {

            if (board[i][j] !== " ") continue;

            let tempBoard = board.map(row => [...row]);
            let tempMoves = movesList.map(m => [...m]);

            if (tempMoves.length === 3) {
                let old = tempMoves.shift();
                tempBoard[old[0]][old[1]] = " ";
            }

            tempBoard[i][j] = player;
            tempMoves.push([i, j]);

            if (checkWinSimulated(tempBoard, player)) {
                return [i, j];
            }
        }
    }

    return null;
}

function checkWinSimulated(b, s) {
    for (let i = 0; i < SIZE; i++) {
        if (b[i][0] === s && b[i][1] === s && b[i][2] === s)
            return true;
    }

    for (let j = 0; j < SIZE; j++) {
        if (b[0][j] === s && b[1][j] === s && b[2][j] === s)
            return true;
    }

    if (b[0][0] === s && b[1][1] === s && b[2][2] === s)
        return true;

    if (b[0][2] === s && b[1][1] === s && b[2][0] === s)
        return true;

    return false;
}

function checkWin(s) {
    return checkWinSimulated(board, s) ? 
        getWinningCells(s) : null;
}

function getWinningCells(s) {
    for (let i = 0; i < SIZE; i++) {
        if (board[i][0] === s && board[i][1] === s && board[i][2] === s)
            return [[i,0],[i,1],[i,2]];
    }

    for (let j = 0; j < SIZE; j++) {
        if (board[0][j] === s && board[1][j] === s && board[2][j] === s)
            return [[0,j],[1,j],[2,j]];
    }

    if (board[0][0] === s && board[1][1] === s && board[2][2] === s)
        return [[0,0],[1,1],[2,2]];

    if (board[0][2] === s && board[1][1] === s && board[2][0] === s)
        return [[0,2],[1,1],[2,0]];

    return null;
}

/* 🔥 Lancement automatique du jeu au chargement */
startGame();
