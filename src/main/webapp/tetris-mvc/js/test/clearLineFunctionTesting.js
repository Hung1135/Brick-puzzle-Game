/**
 * Test file cho chức năng _clearLines() trong GameModel
 */

// ─────────────────────────────
// MOCK CONSTANTS (copy từ constants.js của bạn)
// ─────────────────────────────
const COLS = 10;
const ROWS = 20;
const SCORE_TABLE = { 1: 100, 2: 300, 3: 500, 4: 800 };

// ─────────────────────────────
// EXTRACT LOGIC CẦN TEST
// (copy 2 method từ GameModel, không phụ thuộc `this.current`)
// ─────────────────────────────
function clearLines(board) {
    let count = 0;

    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== null)) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(null));
            count++;
            r++; // kiểm tra lại dòng vừa dịch xuống
        }
    }

    return count;
}

function addScore(state, lines) {
    if (lines === 0) return;
    state.score += (SCORE_TABLE[lines] || 800) * state.level;
    state.lines += lines;
    state.level = Math.floor(state.lines / 10) + 1;
}

// ─────────────────────────────
// HELPER
// ─────────────────────────────

/** Tạo board trống ROWS x COLS */
function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** Điền đầy 1 hàng tại row r */
function fillRow(board, r) {
    board[r] = Array(COLS).fill('red');
}

/** Điền một phần hàng (không đầy) */
function fillPartial(board, r, cols = 5) {
    for (let c = 0; c < cols; c++) board[r][c] = 'red';
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
        toEqual(expected) {
            const a = JSON.stringify(actual);
            const b = JSON.stringify(expected);
            if (a !== b)
                throw new Error(`Expected ${b}, got ${a}`);
        },
    };
}

// ─────────────────────────────
// TEST CASES
// ─────────────────────────────

console.log('\n🧪 _clearLines() Tests\n');

// ── 1. Board trống → không xóa gì ──
test('Board trống: trả về 0 dòng cleared', () => {
    const board = emptyBoard();
    const count = clearLines(board);
    expect(count).toBe(0);
    expect(board.length).toBe(ROWS);
});

// ── 2. 1 hàng đầy → xóa 1 ──
test('1 hàng đầy ở đáy: xóa 1 dòng', () => {
    const board = emptyBoard();
    fillRow(board, ROWS - 1); // hàng cuối
    const count = clearLines(board);
    expect(count).toBe(1);
    expect(board.length).toBe(ROWS); // board vẫn đủ ROWS
});

// ── 3. Hàng đầy bị xóa → hàng mới trên cùng phải null hết ──
test('Hàng đầu tiên sau khi clear phải rỗng', () => {
    const board = emptyBoard();
    fillRow(board, ROWS - 1);
    clearLines(board);
    expect(board[0].every(c => c === null)).toBe(true);
});

// ── 4. Hàng không đầy → không xóa ──
test('Hàng không đầy: không xóa', () => {
    const board = emptyBoard();
    fillPartial(board, ROWS - 1, 9); // 9/10 ô
    const count = clearLines(board);
    expect(count).toBe(0);
});

// ── 5. 2 hàng đầy liên tiếp ──
test('2 hàng đầy liên tiếp: xóa 2', () => {
    const board = emptyBoard();
    fillRow(board, ROWS - 1);
    fillRow(board, ROWS - 2);
    const count = clearLines(board);
    expect(count).toBe(2);
    expect(board.length).toBe(ROWS);
});

// ── 6. 4 hàng đầy (Tetris!) ──
test('4 hàng đầy (Tetris): xóa 4', () => {
    const board = emptyBoard();
    fillRow(board, ROWS - 1);
    fillRow(board, ROWS - 2);
    fillRow(board, ROWS - 3);
    fillRow(board, ROWS - 4);
    const count = clearLines(board);
    expect(count).toBe(4);
});

// ── 7. 2 hàng đầy không liên tiếp ──
test('2 hàng đầy cách nhau: xóa đúng 2', () => {
    const board = emptyBoard();
    fillRow(board, ROWS - 1);
    fillRow(board, ROWS - 5); // cách 3 hàng
    const count = clearLines(board);
    expect(count).toBe(2);
    expect(board.length).toBe(ROWS);
});

// ── 8. Sau khi xóa, các hàng bên trên dịch xuống đúng ──
test('Hàng bên trên dịch xuống sau khi clear', () => {
    const board = emptyBoard();
    // Đặt marker ở hàng ROWS-2
    board[ROWS - 2][0] = 'blue';
    // Điền đầy hàng ROWS-1
    fillRow(board, ROWS - 1);
    clearLines(board);
    // Sau clear, 'blue' phải dịch xuống hàng ROWS-1
    expect(board[ROWS - 1][0]).toBe('blue');
});

// ── 9. _addScore: 0 dòng → score không đổi ──
test('addScore với 0 dòng: score không thay đổi', () => {
    const state = { score: 0, lines: 0, level: 1 };
    addScore(state, 0);
    expect(state.score).toBe(0);
});

// ── 10. _addScore: 1 dòng level 1 ──
test('addScore 1 dòng level 1: score = 100', () => {
    const state = { score: 0, lines: 0, level: 1 };
    addScore(state, 1);
    expect(state.score).toBe(100);
});

// ── 11. _addScore: 4 dòng level 1 (Tetris bonus) ──
test('addScore 4 dòng level 1 (Tetris): score = 800', () => {
    const state = { score: 0, lines: 0, level: 1 };
    addScore(state, 4);
    expect(state.score).toBe(800);
});

// ── 12. _addScore: level tăng sau 10 lines ──
test('addScore: level tăng lên 2 sau khi đủ 10 lines', () => {
    const state = { score: 0, lines: 8, level: 1 };
    addScore(state, 2); // tổng 10 lines
    expect(state.level).toBe(2);
});

// ── 13. _addScore: score nhân theo level ──
test('addScore: score nhân theo level (level 2, 1 dòng = 200)', () => {
    const state = { score: 0, lines: 10, level: 2 };
    addScore(state, 1);
    expect(state.score).toBe(200); // 100 * level 2
});

// ─────────────────────────────
// KẾT QUẢ
// ─────────────────────────────
console.log(`\n📊 Kết quả: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);