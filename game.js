const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const finalScoreElement = document.getElementById('final-score');

// Sound Engine using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (type) {
        case 'move':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            oscillator.start(now);
            oscillator.stop(now + 0.05);
            break;
        case 'rotate':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(450, now + 0.05);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            oscillator.start(now);
            oscillator.stop(now + 0.05);
            break;
        case 'land':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
        case 'clear':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        case 'gameover':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.5);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
        case 'start':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(523.25, now); // C5
            oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
    }
}

// Scale for canvas
context.scale(30, 30);
nextContext.scale(30, 30);

// Tetromino shapes
function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ];
    } else if (type === 'J') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ];
    }
}

const colors = [
    null,
    '#00f2ff', // I
    '#ff9d00', // L
    '#0044ff', // J
    '#fff700', // O
    '#ff0044', // Z
    '#00ff44', // S
    '#ae00ff', // T
];

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const drawX = x + offset.x;
                const drawY = y + offset.y;
                const baseColor = colors[value];

                // 1. Draw main block with gradient for depth
                const gradient = ctx.createLinearGradient(drawX, drawY, drawX + 1, drawY + 1);
                gradient.addColorStop(0, adjustColor(baseColor, 40));  // Highlight
                gradient.addColorStop(0.5, baseColor);                // Base
                gradient.addColorStop(1, adjustColor(baseColor, -40)); // Shadow

                ctx.fillStyle = gradient;
                ctx.fillRect(drawX, drawY, 1, 1);

                // 2. Add Bevel/Border effect
                ctx.lineWidth = 0.05;

                // Light inner border (top & left)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.moveTo(drawX + 1, drawY);
                ctx.lineTo(drawX, drawY);
                ctx.lineTo(drawX, drawY + 1);
                ctx.stroke();

                // Dark inner border (bottom & right)
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.moveTo(drawX + 1, drawY);
                ctx.lineTo(drawX + 1, drawY + 1);
                ctx.lineTo(drawX, drawY + 1);
                ctx.stroke();

                // 3. Add a small 'shining' spot on the top-left
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(drawX + 0.15, drawY + 0.15, 0.25, 0.25);

                // 4. Outer stroke for definition
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 0.02;
                ctx.strokeRect(drawX, drawY, 1, 1);
            }
        });
    });
}

// Helper function to lighten/darken colors for depth
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color =>
        ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).slice(-2));
}

function draw() {
    // Clear main canvas
    context.fillStyle = '#0a0a0a';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines (Subtle)
    context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    context.lineWidth = 0.02;
    for (let x = 0; x <= 10; x++) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, 20);
        context.stroke();
    }
    for (let y = 0; y <= 20; y++) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(10, y);
        context.stroke();
    }

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);

    // Draw ghost piece
    drawGhost();

    // Clear and Draw Next Piece
    nextContext.fillStyle = '#161616';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Center the next piece
    const nextOffset = {
        x: (nextCanvas.width / 30 - nextPiece.matrix[0].length) / 2,
        y: (nextCanvas.height / 30 - nextPiece.matrix.length) / 2
    };
    drawMatrix(nextPiece.matrix, nextOffset, nextContext);
}

function drawGhost() {
    const ghost = {
        pos: { x: player.pos.x, y: player.pos.y },
        matrix: player.matrix
    };

    while (!collide(arena, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;

    context.globalAlpha = 0.15;
    context.fillStyle = colors[player.colorIndex];
    ghost.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
                context.strokeStyle = colors[player.colorIndex];
                context.strokeRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
            }
        });
    });
    context.globalAlpha = 1.0;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0) {
                const arenaY = y + o.y;
                const arenaX = x + o.x;

                // Out of bounds check
                if (arenaY < 0 || arenaY >= arena.length ||
                    arenaX < 0 || arenaX >= arena[0].length) {
                    return true;
                }

                // Occupied cell check
                if (arena[arenaY][arenaX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const arenaY = y + player.pos.y;
                const arenaX = x + player.pos.x;
                // Only merge if within bounds to avoid crashes
                if (arenaY >= 0 && arenaY < arena.length &&
                    arenaX >= 0 && arenaX < arena[0].length) {
                    arena[arenaY][arenaX] = value;
                }
            }
        });
    });
}

function arenaSweep() {
    let rowCount = 1;
    // Check all rows including the top one (y >= 0)
    for (let y = arena.length - 1; y >= 0; --y) {
        let isFull = true;
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                isFull = false;
                break;
            }
        }

        if (isFull) {
            const row = arena.splice(y, 1)[0].fill(0);
            arena.unshift(row);
            ++y; // Re-check current index

            player.score += rowCount * 10;
            rowCount *= 2;
            player.lines++;

            playSound('clear');

            if (player.lines % 10 === 0) {
                player.level++;
                dropInterval = Math.max(100, dropInterval * 0.8);
            }
        }
    }
    updateScore();
}

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    level: 1,
    lines: 0,
    colorIndex: 0
};

let nextPiece = {
    matrix: null,
    colorIndex: 0
};

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playSound('land');
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    if (!gameStarted || paused) return;

    // Initial safety check
    if (collide(arena, player)) return;

    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;

    // Final score bonus based on distance dropped might be better, 
    // but sticking to your +2 per cell for now.
    playSound('land');
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    } else {
        playSound('move');
    }
}

function playerReset() {
    if (nextPiece.matrix === null) {
        const pieces = 'ILJOTSZ';
        const type = pieces[pieces.length * Math.random() | 0];
        player.matrix = createPiece(type);
        player.colorIndex = pieces.indexOf(type) + 1;
    } else {
        player.matrix = nextPiece.matrix;
        player.colorIndex = nextPiece.colorIndex;
    }

    // Prepare next piece
    const pieces = 'ILJOTSZ';
    const type = pieces[pieces.length * Math.random() | 0];
    nextPiece.matrix = createPiece(type);
    nextPiece.colorIndex = pieces.indexOf(type) + 1;

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        gameOver();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    playSound('rotate');
}

function updateScore() {
    scoreElement.innerText = player.score;
    levelElement.innerText = player.level;
    linesElement.innerText = player.lines;
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;
let gameStarted = false;

function update(time = 0) {
    if (paused || !gameStarted) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function gameOver() {
    gameStarted = false;
    playSound('gameover');
    gameOverOverlay.classList.remove('hidden');
    finalScoreElement.innerText = `최종 점수: ${player.score}`;
}

function togglePause() {
    if (!gameStarted) return;
    paused = !paused;
    if (paused) {
        pauseOverlay.classList.remove('hidden');
    } else {
        pauseOverlay.classList.add('hidden');
        lastTime = performance.now();
        update();
    }
}

function startGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = 1000;
    updateScore();
    playerReset();
    gameStarted = true;
    paused = false;
    playSound('start');
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    lastTime = performance.now();
    update();
}

const arena = createMatrix(10, 20);

document.addEventListener('keydown', event => {
    if (!gameStarted && event.key !== 'Enter') return;

    if (paused && event.key !== 'p' && event.key !== 'P') return;

    switch (event.key) {
        case 'ArrowLeft':
            playerMove(-1);
            break;
        case 'ArrowRight':
            playerMove(1);
            break;
        case 'ArrowDown':
            playerDrop();
            break;
        case 'ArrowUp':
            playerRotate(1);
            break;
        case ' ':
            event.preventDefault(); // Prevent page scrolling
            playerHardDrop();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

draw(); // Initial draw
updateScore();
