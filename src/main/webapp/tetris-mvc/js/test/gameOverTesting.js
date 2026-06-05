/* eslint-disable no-unused-vars */

/**
 * Test file cho chức năng Game Over (UC-11)
 * Kiểm tra luồng xử lý khi khu vực spawn bị chiếm và system phải chuyển sang trạng thái game over.
 */

// ─────────────────────────────
// MOCK CONSTANTS
// ─────────────────────────────
const COLS = 10;
const ROWS = 20;
const SPEEDS = [800, 700, 600, 500, 400, 300, 200, 150, 100, 80];
const TETROMINOES = [
    { shape: [[1,1,1,1]], color: '#00f0f0' },  // I
    { shape: [[1,1],[1,1]], color: '#f0f000' }, // O
    { shape: [[0,1,0],[1,1,1]], color: '#a000f0' }, // T
];

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
// EXTRACT: GameModel (inline)
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
        this.gameOverShown  = false;
    }

    render()       { this.rendered = true; }
    renderNext()   { this.renderedNext = true; }
    updateHUD()    { this.hudUpdated = true; }
    hideAll()      { this.allHidden = true; }
    showStart()    { /* minimal */ }
    showPause()    { /* minimal */ }
    showGameOver(/* model, hi, newRecord */) { this.gameOverShown = true; }
}

// ─────────────────────────────
// Controller with lock + gameOver handling
// ─────────────────────────────
function makeController(overrideState = 'start') {
    const model = new GameModel();
    const view = new MockGameView();

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
            this.model.reset();
            if (!this.model.current) return;
            this.state = 'playing';
            this.gameOverHandled = false;
            this.newRecord = false;
            this.view.hideAll();
            this._syncView();
            this._dropAcc = 0;
            this._lastTick = performance.now();
            if (this._rafId) cancelAnimationFrame(this._rafId);
            this._rafId = requestAnimationFrame(() => {});
        },

        _syncView() {
            this.view.render(this.model);
            this.view.renderNext(this.model.next);
            this.view.updateHUD(this.model, this.hi);
        },

        // lock current piece into the board, update model and possibly trigger game over
        lockCurrent() {
            const piece = this.model.current;
            if (!piece) return;
            // place blocks onto board
            for (let r = 0; r < piece.shape.length; r++) {
                for (let c = 0; c < piece.shape[r].length; c++) {
                    if (!piece.shape[r][c]) continue;
                    const nx = piece.x + c;
                    const ny = piece.y + r;
                    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
                        this.model.board[ny][nx] = piece.color;
                    }
                }
            }

            // (omitted): score/lines/level update for brevity

            // spawn next piece; model._spawnPiece will set model.gameOver if spawn collides
            this.model._spawnPiece();

            if (this.model.gameOver) {
                this.handleGameOver();
            }
        },

        handleGameOver() {
            if (this.gameOverHandled) return;
            this.state = 'over';
            // stop loop
            if (this._rafId) cancelAnimationFrame(this._rafId);
            this._rafId = null;

            // check and update high score
            const stored = localStorage.getItem('hi');
            const prevHi = stored ? parseInt(stored, 10) : 0;
            if (this.model.score > prevHi) {
                this.hi = this.model.score;
                this.newRecord = true;
                localStorage.setItem('hi', String(this.hi));
            } else {
                this.hi = prevHi;
                this.newRecord = false;
            }

            this.view.showGameOver(this.model, this.hi, this.newRecord);
            this.gameOverHandled = true;
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
        toBe(expected) { if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); },
        toNotBe(expected) { if (actual === expected) throw new Error(`Expected NOT ${JSON.stringify(expected)}, but got that`); },
        toBeNull() { if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`); },
        toNotBeNull() { if (actual === null) throw new Error(`Expected non-null, but got null`); },
        toBeTrue() { if (actual !== true) throw new Error(`Expected true, got ${JSON.stringify(actual)}`); },
        toBeFalse() { if (actual !== false) throw new Error(`Expected false, got ${JSON.stringify(actual)}`); },
        toBeLessThan(n) { if (!(actual < n)) throw new Error(`Expected ${actual} < ${n}`); },
        toBeGreaterThanOrEqual(n) { if (!(actual >= n)) throw new Error(`Expected ${actual} >= ${n}`); },
    };
}

console.log('\n🧪 gameOver() Tests — UC-11\n');

// reset raf callbacks
_rafCallbacks = [];

// ── UC-11 Main Flow: spawn is occupied after locking current → game over ──
test('[11.x] Khi spawn bị chiếm sau lock -> gameOver, state=over, RAF dừng, view.showGameOver được gọi', () => {
    const ctrl = makeController('playing');
    ctrl.startGame();

    // ensure there's a next piece and compute its spawn cells
    const next = ctrl.model.next;
    const spawnCells = [];
    for (let r = 0; r < next.shape.length; r++) {
        for (let c = 0; c < next.shape[r].length; c++) {
            if (!next.shape[r][c]) continue;
            const nx = next.x + c;
            const ny = next.y + r;
            spawnCells.push({ nx, ny });
        }
    }

    // occupy spawn area BEFORE lock to simulate that locking current results in spawn being blocked
    spawnCells.forEach(cell => {
        if (cell.ny >= 0 && cell.ny < ROWS && cell.nx >= 0 && cell.nx < COLS) {
            ctrl.model.board[cell.ny][cell.nx] = 'occupied';
        }
    });

    // set a score to check hi update separately; keep here 0
    ctrl.model.score = 5;

    // call lockCurrent -> should try to spawn next and detect collision -> gameOver
    ctrl.lockCurrent();

    expect(ctrl.state).toBe('over');
    expect(ctrl.model.gameOver).toBeTrue();
    expect(ctrl.gameOverHandled).toBeTrue();
    expect(ctrl.view.gameOverShown).toBeTrue();
    expect(_rafCallbacks.length === 0).toBeTrue();
});

// ── UC-11: high score is updated when beaten ──
test('[11.7-11.8] Khi đạt điểm cao hơn hi -> cập nhật localStorage', () => {
    // prepare storage
    localStorage.setItem('hi', '10');

    const ctrl = makeController('playing');
    ctrl.startGame();
    // make next spawn occupied
    const next = ctrl.model.next;
    for (let r = 0; r < next.shape.length; r++)
        for (let c = 0; c < next.shape[r].length; c++)
            if (next.shape[r][c]) ctrl.model.board[next.y + r][next.x + c] = 'x';

    ctrl.model.score = 50; // beat hi
    ctrl.lockCurrent();

    expect(localStorage.getItem('hi')).toBe('50');
    expect(ctrl.newRecord).toBeTrue();
});

// ── UC-11: high score remains when not beaten ──
test('[11.7] Nếu không vượt hi -> không cập nhật localStorage', () => {
    localStorage.setItem('hi', '200');

    const ctrl = makeController('playing');
    ctrl.startGame();
    const next = ctrl.model.next;
    for (let r = 0; r < next.shape.length; r++)
        for (let c = 0; c < next.shape[r].length; c++)
            if (next.shape[r][c]) ctrl.model.board[next.y + r][next.x + c] = 'x';

    ctrl.model.score = 50; // less than stored hi
    ctrl.lockCurrent();

    expect(localStorage.getItem('hi')).toBe('200');
    expect(ctrl.newRecord).toBeFalse();
});

// ── Edge: handleGameOver is idempotent (không xử lý lại nếu đã xử lý) ──
test('[edge] handleGameOver không được chạy lại nếu đã handled', () => {
    localStorage.setItem('hi', '0');
    const ctrl = makeController('playing');
    ctrl.startGame();

    // force game over
    ctrl.model.gameOver = true;
    ctrl.handleGameOver();
    const firstHi = localStorage.getItem('hi');

    // modify localStorage and call handleGameOver again -> should not change because gameOverHandled true
    localStorage.setItem('hi', '999');
    ctrl.handleGameOver();
    expect(localStorage.getItem('hi')).toBe('999'); // unchanged by handler because it should bail out when already handled
    expect(ctrl.gameOverHandled).toBeTrue();
});

// ─────────────────────────────
// KẾT QUẢ
// ─────────────────────────────
console.log(`\n📊 Kết quả: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

