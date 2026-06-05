/**
 * Test file cho Use Case UC-12: Stop Game Loop
 * Kiểm tra quá trình dừng vòng lặp trò chơi sau khi Game Over xảy ra.
 */

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

// utility to run all pending RAF callbacks (simulates browser frame execution)
function runAllRafCallbacks() {
    const work = _rafCallbacks.slice();
    _rafCallbacks = [];
    work.forEach(w => { try { w.cb(); } catch(e) {} });
}

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
global.document = { addEventListener: () => {}, getElementById: () => null };

// ─────────────────────────────
// NOTE: Controller implementation is provided in controller/stopGameLoop.js
// The module exports makeController(), which includes its own SimpleModel and MockView.
// ─────────────────────────────
const makeController = require('../controller/stopGameLoop.js');

// ─────────────────────────────
// MINI TEST RUNNER
// ─────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  ✅ PASS: ${name}`); passed++; } catch(e) { console.log(`  ❌ FAIL: ${name}`); console.log(`     → ${e.message}`); failed++; } }
function expect(actual) { return {
    toBe(expected) { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); },
    toBeTrue() { if (actual !== true) throw new Error(`Expected true, got ${actual}`); },
    toBeFalse() { if (actual !== false) throw new Error(`Expected false, got ${actual}`); },
    toBeGreaterThan(n) { if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`); }
}; }

console.log('\n🧪 stopGameLoop() Tests — UC-12\n');
_rafCallbacks = [];

// Test: stop cancels RAF and prevents further render
test('12.2-12.4 stopGameLoop cancels RAF and prevents future render', () => {
    const ctrl = makeController();
    ctrl.startLoop();
    // after starting there should be at least one raf scheduled
    expect(_rafCallbacks.length > 0).toBeTrue();
    // run one frame to ensure render happens once
    runAllRafCallbacks();
    expect(ctrl.view.rendered).toBeGreaterThan(0);

    // schedule another frame and then stop loop before executing it
    ctrl._rafId = requestAnimationFrame(() => { ctrl.view.render(); });
    expect(_rafCallbacks.length > 0).toBeTrue();

    // call stopGameLoop -> should cancel the scheduled frame
    ctrl.stopGameLoop();
    expect(ctrl.state).toBe('over');
    // run pending callbacks (should be none because canceled)
    runAllRafCallbacks();
    // rendered count should not increase
    const countAfter = ctrl.view.rendered;
    // try to force-run any remaining callbacks again
    runAllRafCallbacks();
    expect(ctrl.view.rendered).toBe(countAfter);
    expect(ctrl.view.gameOverShown).toBeTrue();
});

// Test: idempotent stop - calling stop again does nothing harmful
test('12.x stopGameLoop is idempotent when already over', () => {
    const ctrl = makeController();
    ctrl.startLoop();
    // schedule and then stop
    ctrl._rafId = requestAnimationFrame(() => { ctrl.view.render(); });
    ctrl.stopGameLoop();
    const before = ctrl.view.rendered;
    // call again
    ctrl.stopGameLoop();
    // run any callbacks to be safe
    runAllRafCallbacks();
    expect(ctrl.view.rendered).toBe(before);
    expect(ctrl.state).toBe('over');
});

// Test: stop has no effect if loop isn't running
test('12.x stopGameLoop when loop not running simply sets state to over', () => {
    const ctrl = makeController();
    expect(ctrl.state).toBe('start');
    ctrl.stopGameLoop();
    expect(ctrl.state).toBe('over');
});

// NEW: Main Flow test explicitly covering steps 12.0-12.5
test('12.0-12.5 Main Flow: stopGameLoop follows main flow (state check, state change, cancel RAF, prevent render)', () => {
    const ctrl = makeController();
    // Preconditions: loop must be running (12.0)
    ctrl.startLoop();
    expect(ctrl.state).toBe('playing'); // 12.1 system checks current state
    expect(_rafCallbacks.length > 0).toBeTrue(); // RAF scheduled

    // simulate one frame of normal play
    runAllRafCallbacks();
    expect(ctrl.view.rendered).toBeGreaterThan(0);

    // System receives request to stop game loop (12.0) -> perform stop
    ctrl.stopGameLoop(); // 12.2 set state to 'over', 12.3 cancel RAF, 12.4 prevent further render
    expect(ctrl.state).toBe('over'); // 12.2
    expect(ctrl._rafId).toBe(null);
    expect((_rafCallbacks.length === 0)).toBeTrue(); // 12.3 canceled frames

    // ensure no further rendering occurs (12.4)
    const renderedBefore = ctrl.view.rendered;
    runAllRafCallbacks();
    expect(ctrl.view.rendered).toBe(renderedBefore);
    expect(ctrl.view.gameOverShown).toBeTrue();

    // 12.5 use case ends (implicit by assertions above)
});

console.log(`\n📊 Kết quả: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

/** If not run under Node, print instructions and exit. */
if (typeof process === 'undefined' || !process.release || process.release.name !== 'node') {
    console.error('Please run this test with Node.js. Example:');
    console.error('  node "D:\\NMCNPM\\Brick_Game\\Brick-puzzle-Game\\src\\main\\webapp\\tetris-mvc\\js\\test\\stopGameLoopTesting.js"');
    // Stop execution to avoid runtime errors outside Node
    if (typeof process !== 'undefined' && typeof process.exit === 'function') process.exit(2);
}
