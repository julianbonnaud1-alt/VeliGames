console.log("JS loaded!");

/* --- SON DE VICTOIRE --- */
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

/* --- VARIABLES --- */
const SIZE = 3;
let board = [];
let movesX = [];
let movesO = [];
let gameOver = false;
let scoreX = 0, scoreO = 0;

let nextStarter = "X";      // joueur commence toujours
let inputLocked = false;    // empêche les clics pendant le tour du bot
let clickHistory = [];      // système blanc → rose → rouge

const statusLabel = document.getElementById("status");
const scoreLabel = document.getElementById("score");
const replayBtn = document.getElementById("replay");
const boardDiv = document.getElementById("board");

/* --- CRÉATION DES 9 CASES --- */
function createBoard() {
    boardDiv.innerHTML = "";

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;
        boardDiv.appendChild(cell);
    }

    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", () => {
            const index = Number(cell.dataset.index);
            const row = Math.floor(index / 3);
            const col = index % 3;
            handleClickColor(row, col); // ton système blanc → rose → rouge
            handleMove(row, col);       // logique du jeu
        });
    });
}

/* --- SAUVEGARDE DES VICTOIRES --- */
function saveMatchWin() {
    let wins = Number(localStorage.getItem("wins_TicTacToe") || 0);
    localStorage.setItem("wins_TicTacToe", wins + 1);
}

/* --- DÉMARRAGE --- */
function startGame() {
    scoreX = 0;
    scoreO = 0;
    nextStarter = "X";
    updateScore();
    resetBoardOnly();
}

/* --- RESET DU PLATEAU --- */
function resetBoardOnly() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(" "));
    movesX = [];
    movesO = [];
    clickHistory = [];
    gameOver = false;
    inputLocked = false;

    boardDiv.classList.remove("board-flash");
    replayBtn.style.display = "none";

    statusLabel.textContent = "Your turn!";

    drawBoard();
}

/* --- SYSTÈME BLANC → ROSE → ROUGE --- */
function handleClickColor(row, col) {
    const index = row * 3 + col;
    const cell = boardDiv.children[index];

    // ignore si déjà dans l'historique
    if (clickHistory.some(c => c.row === row && c.col === col)) return;

    clickHistory.push({ row, col });

    // si plus de 3 clics → on supprime le plus ancien
    if (clickHistory.length > 3) {
        const old = clickHistory.shift();
        const oldIndex = old.row * 3 + old.col;
        boardDiv.children[oldIndex].style.color = ""; // reset
    }

    // mise à jour des couleurs (TEXTE uniquement)
    clickHistory.forEach((c, i) => {
        const idx = c.row * 3 + c.col;
        const cell = boardDiv.children[idx];

        if (i === clickHistory.length - 1) {
            cell.style.color = "#ffffff"; // blanc
        } else if (i === clickHistory.length - 2) {
            cell.style.color = "#fbdddd"; // rose clair
        } else if (i === clickHistory.length - 3) {
            cell.style.color = "red"; // rouge
        }
    });
}



/* --- AFFICHAGE DU PLATEAU (couleurs du jeu) --- */
function drawBoard() {
    const cells = document.querySelectorAll(".cell");

    cells.forEach((cell, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const value = board[row][col];

        cell.textContent = value === " " ? "" : value;
        cell.classList.remove("win");

        // couleur normale du symbole
        cell.style.color = "#e0e8ff";

        // 1ère pièce la plus ancienne (rouge vif)
        if (movesX.length >= 1 && movesX[0][0] === row && movesX[0][1] === col)
            cell.style.color = "red";
        if (movesO.length >= 1 && movesO[0][0] === row && movesO[0][1] === col)
            cell.style.color = "red";

        // 2ème pièce la plus ancienne (rose clair)
        if (movesX.length >= 2 && movesX[1][0] === row && movesX[1][1] === col)
            cell.style.color = "#ff8080";
        if (movesO.length >= 2 && movesO[1][0] === row && movesO[1][1] === col)
            cell.style.color = "#ff8080";
    });
}


/* --- CLIC JOUEUR (logique du jeu) --- */
function handleMove(row, col) {
    if (gameOver || inputLocked || board[row][col] !== " ") return;

    placeMove(row, col, "X", movesX);
    drawBoard();

    let win = checkWin("X");
    if (win) return endGame("X", win);

    inputLocked = true;

    let delay = 250 + Math.random() * 350; // bot plus humain
    setTimeout(() => {
        if (gameOver) return;

        botPlayPerfect();
        drawBoard();

        let winBot = checkWin("O");
        if (winBot) return endGame("O", winBot);

        inputLocked = false;
    }, delay);
}

/* --- FIN DE PARTIE --- */
function endGame(symbol, winCells) {
    gameOver = true;
    inputLocked = true;
    winSound();

    if (symbol === "X") scoreX++;
    else scoreO++;

    if (scoreX >= 5) {
        statusLabel.textContent = "CONGRATULATIONS! You've won!";
        saveMatchWin();
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

/* --- SCORE --- */
function updateScore() {
    scoreLabel.textContent = `Player: ${scoreX} | Bot: ${scoreO}`;
}

/* --- PLACER UN COUP AVEC RÈGLE DES 3 PIÈCES --- */
function placeMove(row, col, symbol, moves) {
    if (moves.length === 3) {
        const old = moves.shift();
        board[old[0]][old[1]] = " ";
    }

    board[row][col] = symbol;
    moves.push([row, col]);
}

/* --- BOT AVANCÉ AVEC 1/50 ERREUR --- */
function botPlayPerfect() {
    // 1 chance sur 50 de faire une erreur
    if (Math.random() < 1 / 50) {
        let randomMoves = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c] === " ") randomMoves.push([r, c]);
            }
        }
        if (randomMoves.length > 0) {
            const [r, c] = randomMoves[Math.floor(Math.random() * randomMoves.length)];
            placeMove(r, c, "O", movesO);
            return;
        }
    }

    let bestScore = -Infinity;
    let bestMove = null;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] !== " ") continue;

            const sim = simulateMove(board, movesX, movesO, r, c, "O");
            const score = minimax(sim.board, sim.movesX, sim.movesO, false, 0);

            if (score > bestScore) {
                bestScore = score;
                bestMove = [r, c];
            }
        }
    }

    if (bestMove) {
        placeMove(bestMove[0], bestMove[1], "O", movesO);
    }
}

/* --- SIMULATION D'UN COUP --- */
function simulateMove(b, mX, mO, row, col, player) {
    const newBoard = b.map(row => [...row]);
    const newMovesX = mX.map(m => [...m]);
    const newMovesO = mO.map(m => [...m]);

    let moves = player === "X" ? newMovesX : newMovesO;

    if (moves.length === 3) {
        const old = moves.shift();
        newBoard[old[0]][old[1]] = " ";
    }

    newBoard[row][col] = player;
    moves.push([row, col]);

    return {
        board: newBoard,
        movesX: newMovesX,
        movesO: newMovesO
    };
}

/* --- MINIMAX AVEC PROFONDEUR MAX = 4 --- */
function minimax(b, mX, mO, isMaximizing, depth) {
    if (checkWinSimulated(b, "O")) return 10 - depth;
    if (checkWinSimulated(b, "X")) return depth - 10;

    if (depth >= 4) return 0;

    if (isMaximizing) {
        let best = -Infinity;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (b[r][c] !== " ") continue;

                const sim = simulateMove(b, mX, mO, r, c, "O");
                const score = minimax(sim.board, sim.movesX, sim.movesO, false, depth + 1);
                best = Math.max(best, score);
            }
        }

        return best;
    } else {
        let best = Infinity;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (b[r][c] !== " ") continue;

                const sim = simulateMove(b, mX, mO, r, c, "X");
                const score = minimax(sim.board, sim.movesX, sim.movesO, true, depth + 1);
                best = Math.min(best, score);
            }
        }

        return best;
    }
}

/* --- CHECK WIN SIMULÉ --- */
function checkWinSimulated(b, s) {
    for (let i = 0; i < SIZE; i++) {
        if (b[i][0] === s && b[i][1] === s && b[i][2] === s) return true;
    }

    for (let j = 0; j < SIZE; j++) {
        if (b[0][j] === s && b[1][j] === s && b[2][j] === s) return true;
    }

    if (b[0][0] === s && b[1][1] === s && b[2][2] === s) return true;
    if (b[0][2] === s && b[1][1] === s && b[2][0] === s) return true;

    return false;
}

function checkWin(s) {
    return checkWinSimulated(board, s) ? getWinningCells(s) : null;
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

/* --- REPLAY --- */
replayBtn.addEventListener("click", resetBoardOnly);

/* --- LANCEMENT --- */
createBoard();
startGame();