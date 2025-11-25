const BOARD_SIZE = 4;
const API_BASE = window.__API_BASE__ || "/games/api";

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const movesEl = document.getElementById("moves");
const durationEl = document.getElementById("duration");
const seedEl = document.getElementById("seed");
const dailyDayEl = document.getElementById("daily-day");
const dailyTargetEl = document.getElementById("daily-target");
const dailySeedEl = document.getElementById("daily-seed");
const leaderboardEl = document.getElementById("leaderboard");
const apiHealthEl = document.getElementById("api-health");

const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
const newGameBtn = document.getElementById("new-game");
const playDailyBtn = document.getElementById("play-daily");
const refreshLeaderboardBtn = document.getElementById("refresh-leaderboard");
const usernameInput = document.getElementById("username");

class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 2 ** 32;
  }

  nextInt(max) {
    return Math.floor(this.next() * max);
  }
}

let board = createEmptyBoard();
let currentScore = 0;
let currentMoves = 0;
let startTime = null;
let sessionId = null;
let currentMode = "free";
let rng = new SeededRandom(Date.now());
let stepsLog = [];

renderBoard();
updateStats();

newGameBtn.addEventListener("click", () => startNewGame(currentMode));
playDailyBtn.addEventListener("click", () => startNewGame("daily"));
refreshLeaderboardBtn.addEventListener("click", () => fetchLeaderboard());

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    startNewGame(currentMode);
  });
});

document.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };

  const direction = keyMap[event.key];
  if (!direction) return;
  event.preventDefault();
  applyMove(direction);
});

let touchStart = null;
boardEl.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  },
  { passive: true }
);

boardEl.addEventListener(
  "touchend",
  (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (Math.max(absX, absY) < 24) return;

    if (absX > absY) {
      applyMove(deltaX > 0 ? "right" : "left");
    } else {
      applyMove(deltaY > 0 ? "down" : "up");
    }
    touchStart = null;
  },
  { passive: true }
);

async function startNewGame(mode = "free") {
  try {
    const payload = {
      mode,
    };
    const username = usernameInput.value.trim();
    if (username) {
      payload.username = username;
    }

    const response = await fetch(`${API_BASE}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`创建对局失败：${response.status}`);
    }

    const data = await response.json();
    sessionId = data.id;
    currentMode = data.mode;
    rng = new SeededRandom(Number(data.seed));
    currentScore = 0;
    currentMoves = 0;
    stepsLog = [];
    startTime = performance.now();
    board = createEmptyBoard();
    spawnTile();
    spawnTile();
    renderBoard();
    updateStats();
    seedEl.textContent = data.seed;
  } catch (error) {
    console.error(error);
    showHealthMessage("创建对局失败，请检查网络 / 后端服务。", true);
  }
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0)
  );
}

function spawnTile() {
  const emptyCells = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] === 0) {
        emptyCells.push([r, c]);
      }
    }
  }

  if (emptyCells.length === 0) return;
  const [row, col] = emptyCells[rng.nextInt(emptyCells.length)];
  const value = rng.next() < 0.9 ? 2 : 4;
  board[row][col] = value;
}

function applyMove(direction) {
  const { moved, gained } = shiftBoard(direction);
  if (!moved) return;

  currentScore += gained;
  currentMoves += 1;
  spawnTile();
  renderBoard();
  updateStats();

  if (isGameOver()) {
    finishGame();
  }
}

function shiftBoard(direction) {
  const rotationsForDirection = {
    left: 0,
    up: 1,
    right: 2,
    down: 3,
  };

  let rotations = rotationsForDirection[direction] ?? 0;
  let rotated = cloneBoard(board);
  for (let i = 0; i < rotations; i += 1) {
    rotated = rotateMatrix(rotated);
  }

  let moved = false;
  let gained = 0;
  const processed = rotated.map((row) => {
    const nonZero = row.filter((value) => value !== 0);
    const mergedRow = [];
    let skip = false;
    for (let i = 0; i < nonZero.length; i += 1) {
      if (skip) {
        skip = false;
        continue;
      }
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        const mergedValue = nonZero[i] * 2;
        mergedRow.push(mergedValue);
        gained += mergedValue;
        skip = true;
        moved = true;
      } else {
        mergedRow.push(nonZero[i]);
      }
    }
    while (mergedRow.length < BOARD_SIZE) {
      mergedRow.push(0);
    }
    if (!arraysEqual(mergedRow, row)) {
      moved = true;
    }
    return mergedRow;
  });

  let restored = cloneBoard(processed);
  for (let i = 0; i < (4 - rotations) % 4; i += 1) {
    restored = rotateMatrix(restored);
  }

  if (!boardsEqual(board, restored)) {
    board = cloneBoard(restored);
    stepsLog.push({
      move: direction.charAt(0).toUpperCase(),
      board: cloneBoard(board),
    });
  }

  return { moved, gained };
}

function rotateMatrix(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      rotated[c][size - 1 - r] = matrix[r][c];
    }
  }
  return rotated;
}

function arraysEqual(a, b) {
  return a.every((value, index) => value === b[index]);
}

function boardsEqual(a, b) {
  for (let r = 0; r < a.length; r += 1) {
    if (!arraysEqual(a[r], b[r])) {
      return false;
    }
  }
  return true;
}

function cloneBoard(src) {
  return src.map((row) => [...row]);
}

function isGameOver() {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] === 0) return false;
      if (c + 1 < BOARD_SIZE && board[r][c] === board[r][c + 1]) return false;
      if (r + 1 < BOARD_SIZE && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const value = board[r][c];
      const tile = document.createElement("div");
      tile.classList.add("tile");
      if (value > 0) {
        tile.textContent = value;
        if (value > 2048) {
          tile.classList.add("tile-super");
        } else {
          tile.classList.add(`tile-${value}`);
        }
      } else {
        tile.textContent = "";
      }
      boardEl.appendChild(tile);
    }
  }
}

function updateStats() {
  scoreEl.textContent = currentScore;
  movesEl.textContent = currentMoves;
  const elapsed = startTime ? Math.floor((performance.now() - startTime) / 1000) : 0;
  durationEl.textContent = elapsed;
}

async function finishGame() {
  updateStats();
  if (!sessionId) return;
  try {
    const body = {
      score: currentScore,
      moves: currentMoves,
      duration_ms: Math.floor(performance.now() - startTime),
      steps: stepsLog,
    };
    const response = await fetch(`${API_BASE}/session/${sessionId}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error("提交成绩失败");
    }
    showHealthMessage("对局结束，成绩已提交。", false);
    fetchLeaderboard();
  } catch (error) {
    console.error(error);
    showHealthMessage("提交成绩失败，请稍后重试。", true);
  }
}

function showHealthMessage(message, isError = false) {
  apiHealthEl.textContent = message;
  apiHealthEl.style.color = isError ? "#e74c3c" : "#2ecc71";
}

async function fetchDaily() {
  try {
    const response = await fetch(`${API_BASE}/daily`);
    if (!response.ok) throw new Error("daily 获取失败");
    const data = await response.json();
    dailyDayEl.textContent = data.day;
    dailyTargetEl.textContent = data.target_score;
    dailySeedEl.textContent = data.seed;
  } catch (error) {
    console.error(error);
    dailyDayEl.textContent = "--";
    dailyTargetEl.textContent = "--";
    dailySeedEl.textContent = "--";
  }
}

async function fetchLeaderboard(scope = "daily") {
  try {
    const response = await fetch(
      `${API_BASE}/leaderboard?scope=${encodeURIComponent(scope)}`
    );
    if (!response.ok) throw new Error("排行榜获取失败");
    const data = await response.json();
    leaderboardEl.innerHTML = "";
    if (data.length === 0) {
      const li = document.createElement("li");
      li.textContent = "暂无成绩，快来挑战吧！";
      leaderboardEl.appendChild(li);
      return;
    }
    data.forEach((entry) => {
      const li = document.createElement("li");
      const playerName = entry.player || "游客";
      li.innerHTML = `<span>#${entry.rank} ${playerName}</span><span>${entry.score} 分 · ${
        Math.floor(entry.duration_ms / 1000) || 0
      }s</span>`;
      leaderboardEl.appendChild(li);
    });
  } catch (error) {
    console.error(error);
    leaderboardEl.innerHTML =
      "<li>排行榜暂时不可用，请稍后刷新。</li>";
  }
}

async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error("健康检查失败");
    const data = await response.json();
    showHealthMessage(`API 正常 · ${new Date(data.timestamp).toLocaleTimeString()}`);
  } catch (error) {
    console.error(error);
    showHealthMessage("API 不可用，请检查后端或网关。", true);
  }
}

setInterval(() => {
  updateStats();
}, 1000);

setInterval(fetchLeaderboard, 60000);
setInterval(checkHealth, 20000);

fetchDaily();
fetchLeaderboard();
checkHealth();
startNewGame("free");

