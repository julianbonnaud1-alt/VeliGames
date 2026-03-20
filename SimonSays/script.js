console.log("Simon Says JS loaded!");

// ─── AUDIO ────────────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
    }
    return audioCtx;
}


// Fréquences classiques du vrai Simon (en Hz)
const FREQS = [415.30, 310.00, 252.00, 209.00];

function playTone(index, durationSec) {
    try {
        const ctx = getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(FREQS[index], ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationSec + 0.05);
    } catch(e) { console.warn("Audio error:", e); }
}

function playWrongSound() {
    try {
        const ctx  = getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.55);
    } catch(e) {}
}

function playWinJingle() {
    try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            const t = ctx.currentTime + i * 0.13;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            osc.start(t);
            osc.stop(t + 0.30);
        });
    } catch(e) {}
}

// ─── ÉTAT ─────────────────────────────────────────────────────────────────────
const PAD_IDS = ["pad-green", "pad-red", "pad-yellow", "pad-blue"];

let sequence    = [];
let playerIndex = 0;
let round       = 0;
let bestRound   = 0;
let canClick    = false;

function getStepDelay() {
    if (round <= 4) return 800;
    if (round <= 8) return 550;
    return 350;
}

// ─── DOM ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

    const startBtn       = document.getElementById("startBtn");
    const statusEl       = document.getElementById("status");
    const scoreCurrentEl = document.getElementById("score-current");
    const scoreBestEl    = document.getElementById("score-best");
    const hubRing        = document.getElementById("hub-ring");

    // Attacher les clics sur les pads
    PAD_IDS.forEach((id, idx) => {
        document.getElementById(id).addEventListener("click", () => onPadClick(idx));
    });

    // ── DÉMARRAGE ─────────────────────────────────────────────────────────────
    startBtn.addEventListener("click", () => {
        getAudioCtx(); // déverrouille l'audio au premier clic utilisateur

        sequence    = [];
        playerIndex = 0;
        round       = 0;
        canClick    = false;

        startBtn.disabled    = true;
        startBtn.textContent = "▶";
        hubRing.classList.add("active");

        setStatus("GET READY...", "");
        scoreCurrentEl.textContent = "0";
        updateSpeedDots(0);

        setTimeout(() => nextRound(), 800);
    });

    // ── ROUND SUIVANT ─────────────────────────────────────────────────────────
    function nextRound() {
        round++;
        playerIndex = 0;
        canClick    = false;

        sequence.push(Math.floor(Math.random() * 4));

        setStatus("SIMON SAYS...", "");
        lockPads(true);

        setTimeout(() => playSequence(), 700);
    }

    // ── LECTURE SÉQUENCE ──────────────────────────────────────────────────────
    function playSequence() {
        let i = 0;
        const delay = getStepDelay();
        const toneSec = (delay * 0.65) / 1000; // durée du son en secondes

        function step() {
            if (i >= sequence.length) {
                // Séquence terminée → au joueur
                lockPads(false);
                canClick = true;
                setStatus("YOUR TURN!", "#a0ffb0");
                return;
            }
            const idx = sequence[i];
            flashPad(idx, delay * 0.65);
            playTone(idx, toneSec);
            i++;
            setTimeout(step, delay);
        }
        step();
    }

    // ── CLIC JOUEUR ───────────────────────────────────────────────────────────
    function onPadClick(idx) {
        if (!canClick) return;

        const toneSec = getStepDelay() * 0.65 / 1000;
        flashPad(idx, 200);
        playTone(idx, toneSec);

        if (idx === sequence[playerIndex]) {
            // ✓ Bonne touche
            playerIndex++;

            if (playerIndex === sequence.length) {
                // Séquence complète !
                canClick = false;
                lockPads(true);

                const score = round;
                scoreCurrentEl.textContent = score;
                if (score > bestRound) {
                    bestRound = score;
                    scoreBestEl.textContent = bestRound;
                    localStorage.setItem("wins_SimonSays", bestRound);
                }

                playWinJingle();
                setStatus("✓ CORRECT!", "#00e676");
                updateSpeedDots(round);

                setTimeout(() => nextRound(), 1000);
            }
        } else {
            // ✗ Mauvaise touche
            canClick = false;
            lockPads(true);

            playWrongSound();
            document.getElementById(PAD_IDS[idx]).classList.add("wrong");
            setTimeout(() => document.getElementById(PAD_IDS[idx]).classList.remove("wrong"), 500);

            setStatus("✗ WRONG!", "#ff1744");

            // Montre la bonne touche
            setTimeout(() => {
                flashPad(sequence[playerIndex], 600);
                playTone(sequence[playerIndex], 0.5);
            }, 500);

            setTimeout(() => endGame(), 1500);
        }
    }

    // ── FIN DE PARTIE ─────────────────────────────────────────────────────────
    function endGame() {
        canClick = false;
        hubRing.classList.remove("active");

        const finalScore = round - 1;
        if (finalScore > bestRound) {
            bestRound = finalScore;
            scoreBestEl.textContent = bestRound;
            localStorage.setItem("wins_SimonSays", bestRound);
        }

        // Flash de tous les pads
        let flashes = 0;
        const interval = setInterval(() => {
            PAD_IDS.forEach(id => document.getElementById(id).classList.toggle("lit"));
            if (++flashes >= 6) {
                clearInterval(interval);
                PAD_IDS.forEach(id => document.getElementById(id).classList.remove("lit"));
            }
        }, 220);

        setTimeout(() => {
            setStatus(`GAME OVER — Score : ${finalScore}`, "#ff1744");
            startBtn.disabled    = false;
            startBtn.textContent = "START";
            hubRing.classList.add("active");
            updateSpeedDots(0);
        }, 1500);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────
    function flashPad(idx, durationMs) {
        const pad = document.getElementById(PAD_IDS[idx]);
        pad.classList.add("lit");
        setTimeout(() => pad.classList.remove("lit"), durationMs);
    }

    function lockPads(lock) {
        PAD_IDS.forEach(id => {
            document.getElementById(id).classList.toggle("locked", lock);
        });
    }

    function setStatus(msg, color) {
        statusEl.textContent = msg;
        statusEl.style.color = color || "";
    }

    function updateSpeedDots(r) {
        document.getElementById("dot-0").classList.toggle("on", r >= 5);
        document.getElementById("dot-1").classList.toggle("on", r >= 9);
        document.getElementById("dot-2").classList.toggle("on", r >= 13);
    }
});
