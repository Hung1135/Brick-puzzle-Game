/**
 * Test file cho Use Case UC-13: Update High Score
 * Mô tả: Cập nhật điểm cao nhất khi trò chơi kết thúc.
 *
 * Main Flow (13.0-13.4) được đánh dấu trong code nơi phù hợp.
 * Alternative Flow 13A.1 (không có kỷ lục mới) cũng được kiểm thử.
 */
/**
 * Tests for Use Case UC-13 — Update High Score
 * Aligned with startGameTesting.js style: inline model/controller, minimal DOM mocks,
 * clear mapping to main flow (13.0-13.4) and alternative 13A.1.
 */

// ─────────────────────────────
// MOCK: localStorage (simple in-memory)
// ─────────────────────────────
const _localStorage = Object.create(null);
global.localStorage = {
    getItem: (k) => (_localStorage[k] === undefined ? null : String(_localStorage[k])),
    setItem: (k, v) => { _localStorage[k] = String(v); },
};

// ─────────────────────────────
// Simple GameModel (only score needed for UC-13)
// ─────────────────────────────
class GameModel {
    constructor() { this.reset(); }
    reset() { this.score = 0; }
}

// ─────────────────────────────
// Controller implementing updateHighScore()
// Comments reference Use Case steps 13.0-13.4
// ─────────────────────────────
function makeController() {
    const model = new GameModel();

    return {
        model,
        hi: 0,
        newRecord: false,

        updateHighScore() {
            // 13.0: get current score
            const current = this.model && typeof this.model.score === 'number' ? this.model.score : 0;

            // 13.1: read stored hi
            const stored = localStorage.getItem('hi');
            const parsed = stored ? parseInt(stored, 10) : NaN;
            const prevHi = Number.isNaN(parsed) ? 0 : parsed;

            // 13.2: compare and possibly update
            if (current > prevHi) {
                this.hi = current;
                this.newRecord = true; // mark new record
                // 13.3: persist
                localStorage.setItem('hi', String(this.hi));
            } else {
                // 13A.1: no new record
                this.hi = prevHi;
                this.newRecord = false;
            }

            // 13.4: end — return result for assertions
            return { hi: this.hi, newRecord: this.newRecord };
        }
    };
}

// ─────────────────────────────
// MINI TEST RUNNER (same utility used in startGame tests)
// ─────────────────────────────
let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  ✅ PASS: ${name}`); passed++; } catch (e) { console.log(`  ❌ FAIL: ${name}`); console.log(`     → ${e.message}`); failed++; } }

function expect(actual) {
    return {
        toBe(expected) { if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); },
        toBeTrue() { if (actual !== true) throw new Error(`Expected true, got ${JSON.stringify(actual)}`); },
        toBeFalse() { if (actual !== false) throw new Error(`Expected false, got ${JSON.stringify(actual)}`); },
        toBeNull() { if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`); },
        toBeString(str) { if (typeof actual !== 'string' || actual !== str) throw new Error(`Expected string '${str}', got ${JSON.stringify(actual)}`); },
    };
}

console.log('\n🧪 updateHighScore() Tests — UC-13\n');

// helper: clear mock storage
function clearStorage() { for (const k of Object.keys(_localStorage)) delete _localStorage[k]; }

// ── UC-13 13.2: No stored hi -> current > 0 should update and persist ──
test('[13.2] No stored hi and current > 0 -> update & persist', () => {
    clearStorage();
    const ctrl = makeController();
    ctrl.model.score = 123;

    const r = ctrl.updateHighScore();
    expect(r.hi).toBe(123);
    expect(r.newRecord).toBeTrue();
    expect(localStorage.getItem('hi')).toBeString('123');
});

// ── UC-13 13.2: Stored hi lower than current -> update & newRecord ──
test('[13.2] Stored hi lower than current -> update & mark newRecord', () => {
    clearStorage();
    localStorage.setItem('hi', '50');
    const ctrl = makeController();
    ctrl.model.score = 77;

    const r = ctrl.updateHighScore();
    expect(r.hi).toBe(77);
    expect(r.newRecord).toBeTrue();
    expect(localStorage.getItem('hi')).toBeString('77');
});

// ── UC-13 13A.1: current <= stored -> no update ──
test('[13A.1] Current <= stored hi -> no update', () => {
    clearStorage();
    localStorage.setItem('hi', '300');
    const ctrl = makeController();
    ctrl.model.score = 200;

    const r = ctrl.updateHighScore();
    expect(r.hi).toBe(300);
    expect(r.newRecord).toBeFalse();
    expect(localStorage.getItem('hi')).toBeString('300');
});

// ── Edge: multiple calls are idempotent and flags correct ──
test('[Edge] Multiple calls: hi stable after first update', () => {
    clearStorage();
    localStorage.setItem('hi', '20');
    const ctrl = makeController();
    ctrl.model.score = 100;

    const r1 = ctrl.updateHighScore();
    expect(r1.hi).toBe(100);
    expect(r1.newRecord).toBeTrue();

    // lowering score should not change stored hi
    ctrl.model.score = 10;
    const r2 = ctrl.updateHighScore();
    expect(r2.hi).toBe(100);
    expect(r2.newRecord).toBeFalse();
});

// ── Edge: invalid/missing model score treated as 0 and doesn't overwrite higher hi ──
test('[Edge] Invalid score treated as 0 and will not overwrite higher hi', () => {
    clearStorage();
    localStorage.setItem('hi', '88');
    const ctrl = makeController();
    ctrl.model.score = null;

    const r = ctrl.updateHighScore();
    expect(r.hi).toBe(88);
    expect(r.newRecord).toBeFalse();
});

// ── Edge: stored hi may be non-numeric string -> parse fallback to 0 ──
test('[Edge] Non-numeric stored hi treated as 0', () => {
    clearStorage();
    localStorage.setItem('hi', 'NaN');
    const ctrl = makeController();
    ctrl.model.score = 5;

    const r = ctrl.updateHighScore();
    expect(r.hi).toBe(5);
    expect(r.newRecord).toBeTrue();
    expect(localStorage.getItem('hi')).toBeString('5');
});

// Summary
console.log(`\n📊 Kết quả: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

// If not running under Node, print a short note
if (typeof process === 'undefined' || !process.release || process.release.name !== 'node') {
    console.error('Run tests with Node.js:');
    console.error('  node "src/main/webapp/tetris-mvc/js/test/updateHighScoreTesting.js"');
    if (typeof process !== 'undefined' && typeof process.exit === 'function') process.exit(2);
}

