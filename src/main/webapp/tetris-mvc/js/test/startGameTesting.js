/**
 * Test file cho chức năng startGame() trong GameController
 * Implements UC-03 - START GAME
 *
 * Flow cần kiểm tra:
 *   1.1 Người chơi nhấn nút Start → hệ thống nhận yêu cầu
 *   1.2 Khởi tạo bảng game với lưới ô trống
 *   1.3 Sinh block đầu tiên và đặt tại vị trí spawn
 *   1.4 Chuyển trạng thái game sang running
 *   1.5 Hiển thị bảng game và block đầu tiên
 *   1.6 Bắt đầu vòng lặp game, block tự động rơi
 */

// ─────────────────────────────
// MOCK CONSTANTS
// ─────────────────────────────
const COLS = 10;
const ROWS = 20;
const SPEEDS = [800, 700, 600, 500, 400, 300, 200, 150, 100, 80];
const SCORE_TABLE = { 1: 100, 2: 300, 3: 500, 4: 800 };
const TETROMINOES = [
    { shape: [[1,1,1,1]], color: '#00f0f0' },  // I
    { shape: [[1,1],[1,1]], color: '#f0f000' }, // O
    { shape: [[0,1,0],[1,1,1]], color: '#a000f0' }, // T
];
const NEXT_CELL = 28;
const CELL = 30;

// ─────────────────────────────
// MOCK: performance.now, requestAnimationFrame, cancelAnimationFrame
// ─────────────────────────────
let _rafCallbacks = [];
let _rafId = 0;

global.performance = { now: () => Date.now() };

global.requestAnimationFrame = (cb) => {
    const id = ++_rafId;
    _rafCallbacks.push({ id, cb });
    return id;
};

global.cancelAnimationFrame = (id) => {
    _rafCallbacks = _rafCallbacks.filter(r => r.id !== id);
};

// ─────────────────────────────
// MOCK: localStorage
// ─────────────────────────────
const _localStorage = {};
global.localStorage = {
    getItem: (k) => _localStorage[k] ?? null,
    setItem: (k, v) => { _localStorage[k] = String(v); },
};

// ─────────────────────────────
// MOCK: document
// ─────────────────────────────
global.document = {
    addEventListener: () => {},
    getElementById: () => null,
};

// ─────────────────────────────
// EXTRACT: GameModel (inline, không import file thật)
// ─────────────────────────────
class GameModel {
    constructor() { this.reset(); }

    reset() {
        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.current = null;
        this.next = null;
        this._bag = [];
        this._fillBag();
        this.next = this._nextPiece();
        this._spawnPiece();
    }

    _fillBag() {
        this._bag = [...Array(TETROMINOES.length).keys()];
        for (let i = this._bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._bag[i], this._bag[j]] = [this._bag[j], this._bag[i]];
        }
    }

    _nextPiece() {
        if (this._bag.length === 0) this._fillBag();
        const idx = this._bag.pop();
        const t = TETROMINOES[idx];
        return {
            shape: t.shape.map(r => [...r]),
            color: t.color,
            x: Math.floor(COLS / 2) - Math.floor(t.shape[0].length / 2),
            y: 0,
        };
    }

    _spawnPiece() {
        this.current = this.next;
        this.next = this._nextPiece();
        if (this._collides(this.current, 0, 0)) {
            this.gameOver = true;
        }
    }

    _collides(piece, dx, dy, shape) {
        const s = shape || piece.shape;
        for (let r = 0; r < s.length; r++)
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                const nx = piece.x + c + dx;
                const ny = piece.y + r + dy;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && this.board[ny][nx]) return true;
            }
        return false;
    }

    getDropSpeed() {
        return SPEEDS[Math.min(this.level - 1, SPEEDS.length - 1)];
    }
}

// ─────────────────────────────
// MOCK: GameView (ghi nhận lời gọi để assert)
// ─────────────────────────────
class MockGameView {
    constructor() { this._reset(); }

    _reset() {
        this.rendered       = false;
        this.renderedNext   = false;
        this.hudUpdated     = false;
        this.allHidden      = false;
        this.startShown     = false;
        this.pauseShown     = false;
        this.gameOverShown  = false;
    }

    render()       { this.rendered = true; }
    renderNext()   { this.renderedNext = true; }
    updateHUD()    { this.hudUpdated = true; }
    hideAll()      { this.allHidden = true; }
    showStart()    { this.startShown = true; }
    showPause()    { this.pauseShown = true; }
    showGameOver() { this.gameOverShown = true; }
    flashLevelUp() {}
}

// ─────────────────────────────
// EXTRACT: startGame logic (inline, không phụ thuộc browser)
// ─────────────────────────────
function makeController(overrideState = 'start') {
    const model = new GameModel();
    const view  = new MockGameView();

    const ctrl = {
        model,
        view,
        state: overrideState,
        hi: 0,
        newRecord: false,
        gameOverHandled: false,
        _lastTick: 0,
        _rafId: null,
        _dropAcc: 0,

        startGame() {
            if (this.state === 'playing') return;

            // 1.2 + 1.3
            this.model.reset();

            if (!this.model.current) return;

            // 1.4
            this.state = 'playing';

            // reset flags
            this.gameOverHandled = false;
            this.newRecord       = false;

            // 1.5
            this.view.hideAll();
            this._syncView();

            // 1.6
            this._dropAcc  = 0;
            this._lastTick = performance.now();

            if (this._rafId) cancelAnimationFrame(this._rafId);

            this._rafId = requestAnimationFrame(() => {});
        },

        _syncView() {
            this.view.render(this.model);
            this.view.renderNext(this.model.next);
            this.view.updateHUD(this.model, this.hi);
        },
    };

    return ctrl;
}

// ─────────────────────────────
// MINI TEST RUNNER
// ─────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ FAIL: ${name}`);
        console.log(`     → ${e.message}`);
        failed++;
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected)
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        },
        toNotBe(expected) {
            if (actual === expected)
                throw new Error(`Expected NOT ${JSON.stringify(expected)}, but got that`);
        },
        toBeNull() {
            if (actual !== null)
                throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
        },
        toNotBeNull() {
            if (actual === null)
                throw new Error(`Expected non-null, but got null`);
        },
        toBeTrue() {
            if (actual !== true)
                throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
        },
        toBeFalse() {
            if (actual !== false)
                throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
        },
        toBeLessThan(n) {
            if (!(actual < n))
                throw new Error(`Expected ${actual} < ${n}`);
        },
        toBeGreaterThanOrEqual(n) {
            if (!(actual >= n))
                throw new Error(`Expected ${actual} >= ${n}`);
        },
    };
}

// ─────────────────────────────
// TEST CASES — UC-03 startGame()
// ─────────────────────────────

console.log('\n🧪 startGame() Tests — UC-03\n');

// ── UC-03 1.1: Guard — không start khi đang chơi ──
test('[1.1] Guard: không cho phép start khi state = playing', () => {
    const ctrl = makeController('playing');
    ctrl.view._reset();
    ctrl.startGame();
    // view.hideAll không được gọi vì bị return sớm
    expect(ctrl.view.allHidden).toBeFalse();
});

// ── UC-03 1.2: Board phải là lưới ô trống sau startGame ──
test('[1.2] Board phải là lưới rỗng ROWS x COLS sau khi start', () => {
    const ctrl = makeController('start');
    // Làm bẩn board trước
    ctrl.model.board[0][0] = 'red';
    ctrl.startGame();
    expect(ctrl.model.board.length).toBe(ROWS);
    expect(ctrl.model.board[0][0]).toBeNull();
});

test('[1.2] Board phải có đúng COLS cột', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    const allColsCorrect = ctrl.model.board.every(row => row.length === COLS);
    expect(allColsCorrect).toBeTrue();
});

// ── UC-03 1.3: Block đầu tiên phải tồn tại sau spawn ──
test('[1.3] current piece phải tồn tại sau startGame', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.model.current).toNotBeNull();
});

test('[1.3] current piece phải có shape hợp lệ (mảng 2D)', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    const shape = ctrl.model.current.shape;
    const valid = Array.isArray(shape) && shape.length > 0 && Array.isArray(shape[0]);
    expect(valid).toBeTrue();
});

test('[1.3] current piece spawn tại y = 0 (trên cùng)', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.model.current.y).toBe(0);
});

test('[1.3] current piece spawn trong phạm vi cột hợp lệ', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    const { x, shape } = ctrl.model.current;
    const pieceWidth = shape[0].length;
    expect(x >= 0 && x + pieceWidth <= COLS).toBeTrue();
});

test('[1.3] next piece phải tồn tại (chuẩn bị sẵn)', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.model.next).toNotBeNull();
});

// ── UC-03 1.4: Chuyển trạng thái sang playing ──
test('[1.4] state phải là playing sau startGame', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.state).toBe('playing');
});

test('[1.4] gameOverHandled phải reset về false', () => {
    const ctrl = makeController('start');
    ctrl.gameOverHandled = true;
    ctrl.startGame();
    expect(ctrl.gameOverHandled).toBeFalse();
});

test('[1.4] newRecord phải reset về false', () => {
    const ctrl = makeController('start');
    ctrl.newRecord = true;
    ctrl.startGame();
    expect(ctrl.newRecord).toBeFalse();
});

test('[1.4] score phải reset về 0', () => {
    const ctrl = makeController('start');
    ctrl.model.score = 9999;
    ctrl.startGame();
    expect(ctrl.model.score).toBe(0);
});

test('[1.4] level phải reset về 1', () => {
    const ctrl = makeController('start');
    ctrl.model.level = 5;
    ctrl.startGame();
    expect(ctrl.model.level).toBe(1);
});

// ── UC-03 1.5: Hiển thị board + block ──
test('[1.5] view.hideAll() phải được gọi', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.view.allHidden).toBeTrue();
});

test('[1.5] view.render() phải được gọi', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.view.rendered).toBeTrue();
});

test('[1.5] view.renderNext() phải được gọi', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.view.renderedNext).toBeTrue();
});

test('[1.5] view.updateHUD() phải được gọi', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl.view.hudUpdated).toBeTrue();
});

// ── UC-03 1.6: Vòng lặp game khởi động ──
test('[1.6] requestAnimationFrame phải được gọi (loop đã bắt đầu)', () => {
    _rafCallbacks = [];
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(_rafCallbacks.length > 0).toBeTrue();
});

test('[1.6] _dropAcc phải reset về 0 khi start', () => {
    const ctrl = makeController('start');
    ctrl._dropAcc = 999;
    ctrl.startGame();
    expect(ctrl._dropAcc).toBe(0);
});

test('[1.6] _lastTick phải được set (> 0)', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    expect(ctrl._lastTick > 0).toBeTrue();
});

test('[1.6] drop speed phải dương và khớp với level 1', () => {
    const ctrl = makeController('start');
    ctrl.startGame();
    const speed = ctrl.model.getDropSpeed();
    expect(speed).toBe(SPEEDS[0]); // level 1 → SPEEDS[0]
});

// ── Trường hợp đặc biệt ──
test('[edge] Có thể restart sau khi state = over', () => {
    const ctrl = makeController('over');
    // restartGame chỉ hoạt động khi state = over
    ctrl.state = 'over';
    ctrl.startGame(); // gọi trực tiếp (restartGame gọi startGame)
    expect(ctrl.state).toBe('playing');
});

test('[edge] Start từ state = paused vẫn hoạt động', () => {
    const ctrl = makeController('paused');
    ctrl.startGame();
    expect(ctrl.state).toBe('playing');
});

test('[edge] gameOver flag phải false sau khi reset', () => {
    const ctrl = makeController('start');
    ctrl.model.gameOver = true;
    ctrl.startGame();
    expect(ctrl.model.gameOver).toBeFalse();
});

// ─────────────────────────────
// KẾT QUẢ
// ─────────────────────────────
console.log(`\n📊 Kết quả: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);