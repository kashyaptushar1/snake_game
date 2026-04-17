const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const statusText = document.getElementById("statusText");
const overlay = document.getElementById("overlay");
const overlayKicker = document.getElementById("overlayKicker");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const setupPanel = document.getElementById("setupPanel");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");
const touchButtons = document.querySelectorAll(".touch-button");
const difficultyButtons = document.querySelectorAll("[data-difficulty]");
const styleButtons = document.querySelectorAll("[data-style]");
const colorButtons = document.querySelectorAll("[data-color]");
const emojiButtons = document.querySelectorAll("[data-emoji]");
const customColorInput = document.getElementById("customColor");
const emojiInput = document.getElementById("emojiInput");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

const difficultyConfigs = {
    low: {
        label: "Low",
        startSpeed: 180,
        minSpeed: 110,
        speedStep: 3
    },
    medium: {
        label: "Medium",
        startSpeed: 150,
        minSpeed: 70,
        speedStep: 4
    },
    high: {
        label: "High",
        startSpeed: 115,
        minSpeed: 52,
        speedStep: 5
    }
};

const snakeStyles = {
    classic: {
        label: "Classic",
        head: "#4ade80",
        body: "#22c55e",
        bodyAlt: "#16a34a",
        food: "#fb923c",
        eye: "#020617",
        headRadius: 10,
        bodyRadius: 8
    },
    neon: {
        label: "Neon",
        head: "#67e8f9",
        body: "#22d3ee",
        bodyAlt: "#06b6d4",
        food: "#f472b6",
        eye: "#082f49",
        headRadius: 10,
        bodyRadius: 8
    },
    sunset: {
        label: "Sunset",
        head: "#fbbf24",
        body: "#f97316",
        bodyAlt: "#ea580c",
        food: "#fde047",
        eye: "#431407",
        headRadius: 10,
        bodyRadius: 8
    }
};

let snake;
let food;
let direction;
let nextDirection;
let score;
let highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
let loopId = null;
let gameSpeed = difficultyConfigs.medium.startSpeed;
let isRunning = false;
let isPaused = false;
let hasStarted = false;
let selectedDifficulty = "medium";
let selectedSnakeStyle = "classic";
let selectedSnakeColor = "default";
let selectedEmoji = "\u{1F60E}";

highScoreElement.textContent = highScore;

colorButtons.forEach((button) => {
    button.style.setProperty("--swatch", button.dataset.swatch || "#22c55e");
});

function createInitialState() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { ...direction };
    score = 0;
    gameSpeed = getCurrentDifficulty().startSpeed;
    food = spawnFood();
    updateScore();
}

function getCurrentDifficulty() {
    return difficultyConfigs[selectedDifficulty];
}

function getCurrentStyle() {
    return snakeStyles[selectedSnakeStyle];
}

function clampColorChannel(value) {
    return Math.max(0, Math.min(255, value));
}

function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    const expanded = normalized.length === 3
        ? normalized.split("").map((char) => char + char).join("")
        : normalized;

    return {
        r: parseInt(expanded.slice(0, 2), 16),
        g: parseInt(expanded.slice(2, 4), 16),
        b: parseInt(expanded.slice(4, 6), 16)
    };
}

function rgbToHex({ r, g, b }) {
    const toHex = (value) => clampColorChannel(value).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftColor(hex, amount) {
    const rgb = hexToRgb(hex);

    return rgbToHex({
        r: rgb.r + amount,
        g: rgb.g + amount,
        b: rgb.b + amount
    });
}

function getSnakePalette() {
    const style = getCurrentStyle();

    if (selectedSnakeColor === "default") {
        return {
            head: style.head,
            body: style.body,
            bodyAlt: style.bodyAlt,
            eye: style.eye
        };
    }

    return {
        head: shiftColor(selectedSnakeColor, 40),
        body: selectedSnakeColor,
        bodyAlt: shiftColor(selectedSnakeColor, -24),
        eye: "#04111f"
    };
}

function spawnFood() {
    let newFood;

    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y));

    return newFood;
}

function updateScore() {
    scoreElement.textContent = score;

    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem("snakeHighScore", String(highScore));
    }
}

function drawRoundedTile(x, y, color, radius = 6, inset = 2) {
    const px = x * gridSize + inset;
    const py = y * gridSize + inset;
    const size = gridSize - inset * 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, radius);
    ctx.fill();
}

function drawBoard() {
    const style = getCurrentStyle();
    const palette = getSnakePalette();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < tileCount; y += 1) {
        for (let x = 0; x < tileCount; x += 1) {
            ctx.fillStyle = (x + y) % 2 === 0 ? "#152033" : "#101a2b";
            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
        }
    }

    ctx.fillStyle = `${style.food}33`;
    ctx.beginPath();
    ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize * 0.38, 0, Math.PI * 2);
    ctx.fill();
    drawRoundedTile(food.x, food.y, style.food, 10, 3);

    snake.forEach((segment, index) => {
        const color = index === 0 ? palette.head : index % 2 === 0 ? palette.bodyAlt : palette.body;
        const radius = index === 0 ? style.headRadius : style.bodyRadius;
        drawRoundedTile(segment.x, segment.y, color, radius, 2);
    });

    drawFace();
}

function drawFace() {
    const head = snake[0];
    const centerX = head.x * gridSize;
    const centerY = head.y * gridSize;
    ctx.save();
    ctx.font = "14px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(selectedEmoji, centerX + gridSize / 2, centerY + gridSize / 2 + 0.5);
    ctx.restore();
}

function extractEmoji(value) {
    const input = value.trim();

    if (!input) {
        return "";
    }

    if (typeof Intl !== "undefined" && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        const [first] = segmenter.segment(input);
        return first ? first.segment : "";
    }

    return Array.from(input)[0] || "";
}

function showOverlay(kicker, title, text, options = {}) {
    const { showStart = true, showSetup = true } = options;

    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startButton.textContent = hasStarted ? "Play Again" : "Start Game";
    startButton.style.display = showStart ? "inline-flex" : "none";
    setupPanel.classList.toggle("hidden", !showSetup);
    overlay.classList.remove("hidden");
}

function hideOverlay() {
    overlay.classList.add("hidden");
}

function setStatus(message) {
    statusText.textContent = message;
}

function step() {
    if (!isRunning || isPaused) {
        return;
    }

    direction = { ...nextDirection };

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    const hitWall =
        head.x < 0 ||
        head.x >= tileCount ||
        head.y < 0 ||
        head.y >= tileCount;

    const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);

    if (hitWall || hitSelf) {
        endGame();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        updateScore();
        food = spawnFood();
        gameSpeed = Math.max(getCurrentDifficulty().minSpeed, gameSpeed - getCurrentDifficulty().speedStep);
        setStatus("Nice. Fruit collected.");
        restartLoop();
    } else {
        snake.pop();
    }

    drawBoard();
}

function restartLoop() {
    if (loopId) {
        clearInterval(loopId);
    }

    if (isRunning && !isPaused) {
        loopId = setInterval(step, gameSpeed);
    }
}

function startGame() {
    hasStarted = true;
    isRunning = true;
    isPaused = false;
    createInitialState();
    hideOverlay();
    setStatus(`${getCurrentDifficulty().label} difficulty, ${getCurrentStyle().label} snake.`);
    pauseButton.textContent = "Pause";
    drawBoard();
    restartLoop();
}

function endGame() {
    isRunning = false;
    clearInterval(loopId);
    loopId = null;
    drawBoard();
    showOverlay("Game Over", "You Crashed", `Final score: ${score}. Change difficulty or style, then press Play Again.`, {
        showStart: true,
        showSetup: true
    });
    setStatus("Game over.");
}

function togglePause() {
    if (!hasStarted || !isRunning) {
        return;
    }

    isPaused = !isPaused;

    if (isPaused) {
        clearInterval(loopId);
        loopId = null;
        showOverlay("Paused", "Game Paused", "Press Space or Pause to continue.", {
            showStart: false,
            showSetup: false
        });
        pauseButton.textContent = "Resume";
        setStatus("Paused.");
        return;
    }

    hideOverlay();
    pauseButton.textContent = "Pause";
    setStatus("Game in progress.");
    restartLoop();
}

function queueDirection(requestedDirection) {
    const oppositeX = nextDirection.x + requestedDirection.x === 0;
    const oppositeY = nextDirection.y + requestedDirection.y === 0;

    if ((oppositeX && nextDirection.x !== 0) || (oppositeY && nextDirection.y !== 0)) {
        return;
    }

    nextDirection = requestedDirection;
}

function updateOptionButtons(buttons, selectedValue, key) {
    buttons.forEach((button) => {
        const isActive = button.dataset[key] === selectedValue;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

function setDifficulty(value) {
    if (!difficultyConfigs[value]) {
        return;
    }

    selectedDifficulty = value;
    updateOptionButtons(difficultyButtons, selectedDifficulty, "difficulty");
}

function setSnakeStyle(value) {
    if (!snakeStyles[value]) {
        return;
    }

    selectedSnakeStyle = value;
    updateOptionButtons(styleButtons, selectedSnakeStyle, "style");
    drawBoard();
}

function setSnakeColor(value) {
    selectedSnakeColor = value;
    updateOptionButtons(colorButtons, selectedSnakeColor, "color");

    if (value !== "default") {
        customColorInput.value = value;
    }

    drawBoard();
}

function setSnakeEmoji(value) {
    selectedEmoji = value;
    updateOptionButtons(emojiButtons, selectedEmoji, "emoji");
    emojiInput.value = value;
    drawBoard();
}

function handleDirectionInput(directionName) {
    const directions = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    };

    const requestedDirection = directions[directionName];

    if (!requestedDirection) {
        return;
    }

    if (!hasStarted) {
        startGame();
    }

    if (isPaused) {
        togglePause();
    }

    queueDirection(requestedDirection);
}

document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
    }

    if (key === " " || key === "spacebar") {
        togglePause();
        return;
    }

    const keyMap = {
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right"
    };

    handleDirectionInput(keyMap[key]);
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", startGame);

difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setDifficulty(button.dataset.difficulty);
    });
});

styleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setSnakeStyle(button.dataset.style);
    });
});

colorButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setSnakeColor(button.dataset.color);
    });
});

emojiButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setSnakeEmoji(button.dataset.emoji);
    });
});

customColorInput.addEventListener("input", (event) => {
    setSnakeColor(event.target.value);
});

emojiInput.addEventListener("input", (event) => {
    const emoji = extractEmoji(event.target.value);

    if (!emoji) {
        return;
    }

    selectedEmoji = emoji;
    event.target.value = emoji;
    updateOptionButtons(emojiButtons, selectedEmoji, "emoji");
    drawBoard();
});

touchButtons.forEach((button) => {
    button.addEventListener("click", () => {
        handleDirectionInput(button.dataset.direction);
    });
});

setDifficulty(selectedDifficulty);
setSnakeStyle(selectedSnakeStyle);
setSnakeColor(selectedSnakeColor);
setSnakeEmoji(selectedEmoji);
createInitialState();
drawBoard();
showOverlay("Ready", "Choose Your Run", "Pick speed, color, and an emoji face before you start.", {
    showStart: true,
    showSetup: true
});
