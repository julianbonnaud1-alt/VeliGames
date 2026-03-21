// -------------------------
// 🔥 Chargement des scores
// -------------------------
function loadScores() {

    const TicTacToe = localStorage.getItem("wins_TicTacToe") || 0;
    const connect4 = localStorage.getItem("wins_connect4") || 0;
    const pong = localStorage.getItem("wins_pong") || 0;
    const SimonSays = localStorage.getItem("wins_SimonSays") || 0;
    const Snake = localStorage.getItem("wins_Snake") || 0;
    const AimTrainer = localStorage.getItem("wins_AimTrainer") || 0;

    const baseText =
        `<span>Tic-Tac-Toe: ${TicTacToe} wins</span>` +
        `<span>Connect Four: ${connect4} wins</span>` +
        `<span>Pong: ${pong} wins</span>` +
        `<span>Simon Says: level ${SimonSays}</span>` +
        `<span>Aim Trainer: ${AimTrainer} points</span>` +
        `<span>Snake: ${Snake} points</span>`;

    document.getElementById("scoreText").innerHTML = baseText + baseText;
}

loadScores();


// -------------------------
// 🔥 Reset complet des scores
// -------------------------
function resetAllScores() {
    localStorage.removeItem("wins_TicTacToe");
    localStorage.removeItem("wins_connect4");
    localStorage.removeItem("wins_pong");
    localStorage.removeItem("wins_SimonSays");
    localStorage.removeItem("wins_AimTrainer");
    localStorage.removeItem("wins_Snake");

    localStorage.setItem("aimTrainerBestScore", 0);
    localStorage.setItem("bestSnakeScore", 0);

    loadScores();
}


// -------------------------
// 🔥 Reset via touche £ (PC)
// -------------------------
document.addEventListener("keydown", (e) => {
    if (e.key === "£") {
        resetAllScores();
        console.log("RESET via touche £");
    }
});


// ----------------------------------------------------
// 🔥 Reset via triple tap sur le titre (mobile only)
// ----------------------------------------------------
(function() {
    let tapCount = 0;
    let firstTapTime = 0;

    const title = document.querySelector("h1");

    title.addEventListener("touchstart", () => {
        const now = Date.now();

        // Si plus de 600ms entre les taps → reset du compteur
        if (now - firstTapTime > 600) {
            tapCount = 0;
            firstTapTime = now;
        }

        tapCount++;

        // Si 3 taps → reset
        if (tapCount === 3) {
            resetAllScores();
            console.log("RESET via triple tap !");
            tapCount = 0;
        }
    });
})();
