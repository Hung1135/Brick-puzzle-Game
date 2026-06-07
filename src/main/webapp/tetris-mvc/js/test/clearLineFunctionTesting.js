/**
 * UC-07
 * CLEAR LINE, SCORE & COMBO CALCULATION TEST (UPDATED)
 *
 * Mục đích:
 * Kiểm thử chức năng sau khi bổ sung tính năng mới:
 * - Xóa dòng đầy (_clearLines)
 * - Cập nhật điểm tích hợp chuỗi Combo, Perfect Clear, Level (_updatePerformanceAndScore)
 * - Các kịch bản luồng thay thế (Alternative Flows): đứt chuỗi Combo, Game Over khi khóa khối ngoài màn hình.
 *
 * Chạy:
 * node clearLineTesting.js
 */

// ==================================================
// MOCK CONSTANTS
// ==================================================
const COLS = 10;
const ROWS = 20;

// Đồng bộ bảng điểm SCORE_TABLE tương ứng với cấu trúc tính điểm của GameModel mới
const SCORE_TABLE = {
    1: 100,
    2: 300,
    3: 500,
    4: 800
};

// ==================================================
// EXTRACTED LOGIC TỪ GAMEMODEL (UPDATED)
// ==================================================

/**
 * 🔴 [MAIN FLOW - 7.3]
 * Loại bỏ hàng lấp đầy, bổ sung hàng trống phía trên và dịch chuyển khối xuống
 */
function clearLines(board) {
    let count = 0;

    for (let r = ROWS - 1; r >= 0; r--) {
        // Kiểm tra tất cả ô trong hàng đều có dữ liệu
        if (board[r].every(cell => cell !== null)) {
            // Xóa hàng đầy
            board.splice(r, 1);
            // Thêm hàng trống ở phía trên
            board.unshift(Array(COLS).fill(null));
            count++;
            // Kiểm tra lại vị trí hiện tại để xử lý trường hợp clear nhiều dòng liên tiếp
            r++;
        }
    }
    return count;
}

/**
 * Hàm phụ kiểm tra xem toàn bộ ma trận board có trống sạch hay không
 */
function isPerfectClear(board) {
    return board.every(row => row.every(cell => cell === null));
}

/**
 * 🔴 [MAIN FLOW - 7.4] & [ALTERNATIVE FLOW - 7.2]
 * Cập nhật điểm số, chuỗi combo, perfect clear và cấp độ mới
 */
function updatePerformanceAndScore(state, linesCleared, board) {
    // 🔴 [ALTERNATIVE FLOW - 7.2.1 -> 7.2.3]: Không phát hiện hàng nào được lấp đầy
    if (linesCleared === 0) {
        // 🔴 [ALTERNATIVE FLOW - 7.2.3]: Đặt lại chuỗi Combo hiện tại bằng 0
        state.combo = 0;
        return;
    }

    // 🔴 7.4.1. Cập nhật số lượng dòng đã xóa và tính điểm cơ bản dựa trên số dòng được loại bỏ
    state.lines += linesCleared;
    let baseScore = (SCORE_TABLE[linesCleared] || 800) * state.level;
    state.score += baseScore;

    // 🔴 7.4.2. Tăng giá trị Combo và cộng điểm thưởng Combo tương ứng
    state.combo++;
    if (state.combo > 1) {
        let comboBonus = (state.combo - 1) * 50 * state.level;
        state.score += comboBonus;
    }

    // 🔴 7.4.3. Kiểm tra trạng thái Perfect Clear
    if (isPerfectClear(board)) {
        let perfectClearBonus = 2000 * state.level;
        state.score += perfectClearBonus;
    }

    // 🔴 7.4.4. Tính toán và cập nhật cấp độ mới (Mỗi 10 dòng lên 1 cấp)
    state.level = Math.floor(state.lines / 10) + 1;
}

/**
 * 🔴 [ALTERNATIVE FLOW - 7.1.0 -> 7.1.2]
 * Giả lập việc cố định khối gạch (_lockPiece) để kiểm tra lỗi vượt quá biên trên (Game Over)
 */
function simulateLockPiece(state, board, currentPiece) {
    const { shape, x, y, color } = currentPiece;

    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;

            const ny = y + r;
            // 🔴 Phát hiện khối gạch nằm ngoài vùng hiển thị hợp lệ (ny < 0)
            if (ny < 0) {
                state.gameOver = true;
                return;
            }
            board[ny][x + c] = color;
        }
    }
}

// ==================================================
// HELPER FUNCTIONS
// ==================================================
function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function fillRow(board, r) {
    board[r] = Array(COLS).fill("red");
}

function fillPartial(board, r, cols = 5) {
    for (let c = 0; c < cols; c++) {
        board[r][c] = "red";
    }
}

// ==================================================
// MINI TEST FRAMEWORK
// ==================================================
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   → ${e.message}`);
        failed++;
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toEqual(expected) {
            const a = JSON.stringify(actual);
            const b = JSON.stringify(expected);
            if (a !== b) {
                throw new Error(`Expected ${b}, got ${a}`);
            }
        }
    };
}

// ==================================================
// UC-07 TEST CASES
// ==================================================

console.log("\n🧪 UC-07 CLEAR LINE & PERFORMANCE TESTS (UPDATED)\n");

// --- LINE CLEAR TESTS (TC01 -> TC08 duy trì tính đúng đắn của giải thuật nền) ---
test("TC01 - Board trống: trả về 0 dòng cleared", () => {
    const board = emptyBoard();
    const count = clearLines(board);
    expect(count).toBe(0);
});

test("TC02 - 1 hàng đầy ở đáy: xóa 1 dòng", () => {
    const board = emptyBoard();
    fillRow(board, ROWS - 1);
    const count = clearLines(board);
    expect(count).toBe(1);
});

test("TC03 - Hàng mới phía trên cùng sau khi dịch chuyển phải rỗng", () => {
    const board = emptyBoard();
    fillRow(board, ROWS - 1);
    clearLines(board);
    expect(board[0].every(c => c === null)).toBe(true);
});

test("TC04 - Hàng chưa đầy hoàn toàn: không thực hiện xóa", () => {
    const board = emptyBoard();
    fillPartial(board, ROWS - 1, 9);
    const count = clearLines(board);
    expect(count).toBe(0);
});

// --- NEW FEATURES TESTS: COMBO LOGIC (MAIN FLOW - 7.4.2 & AF - 7.2.3) ---
test("TC09 - Combo tăng lên 1 ở lượt xóa đầu tiên (Chưa nhận điểm thưởng)", () => {
    const state = { score: 0, lines: 0, level: 1, combo: 0 };
    const board = emptyBoard();

    updatePerformanceAndScore(state, 1, board); // Xóa 1 dòng

    expect(state.combo).toBe(1);
    expect(state.score).toBe(100); // Chỉ có điểm cơ bản: 100 * level 1
});

test("TC10 - Tích lũy chuỗi Combo liên tiếp: Nhận điểm thưởng Combo ở lượt thứ hai trở đi", () => {
    const state = { score: 0, lines: 0, level: 1, combo: 1 }; // Giả lập đã có sẵn combo = 1
    const board = emptyBoard();
    fillPartial(board, ROWS - 1, 2); // Giữ board không trống hoàn toàn để tránh Perfect Clear

    updatePerformanceAndScore(state, 1, board); // Tiếp tục xóa 1 dòng

    expect(state.combo).toBe(2);
    // Điểm = Điểm cơ bản (100 * 1) + Thưởng Combo [(2 - 1) * 50 * 1] = 150
    expect(state.score).toBe(150);
});

test("TC11 - AF 7.2.3: Đứt chuỗi Combo về 0 nếu lượt chơi hiện tại không xóa được hàng", () => {
    const state = { score: 500, lines: 4, level: 1, combo: 3 }; // Đang có chuỗi combo cao
    const board = emptyBoard();

    updatePerformanceAndScore(state, 0, board); // 0 dòng bị xóa

    expect(state.combo).toBe(0);
    expect(state.score).toBe(500); // Giữ nguyên điểm cũ
});

// --- NEW FEATURES TESTS: PERFECT CLEAR (MAIN FLOW - 7.4.3) ---
test("TC12 - Đạt trạng thái Perfect Clear: Cộng điểm thưởng lớn", () => {
    const state = { score: 0, lines: 0, level: 1, combo: 0 };
    const board = emptyBoard();
    // Board hoàn toàn trống sạch sau khi clearLines chạy trước đó

    updatePerformanceAndScore(state, 4, board); // Kích hoạt xóa Tetris sạch board

    // Điểm = Cơ bản (800 * 1) + Combo lượt 1 (0) + Perfect Clear (2000 * 1) = 2800
    expect(state.score).toBe(2800);
});

test("TC13 - AF 7.4.3.1: Không thỏa Perfect Clear nếu bàn chơi vẫn còn gạch sót lại", () => {
    const state = { score: 0, lines: 0, level: 1, combo: 0 };
    const board = emptyBoard();
    board[ROWS - 5][0] = "blue"; // Còn sót một block ở phía trên

    updatePerformanceAndScore(state, 1, board);

    // Chỉ nhận điểm cơ bản 100, không được cộng 2000 điểm Perfect Clear
    expect(state.score).toBe(100);
});

// --- LEVEL UP LOGIC TESTS (MAIN FLOW - 7.4.4) ---
test("TC14 - Hệ thống tự động tăng cấp độ (Level) sau mỗi 10 dòng tích lũy", () => {
    const state = { score: 0, lines: 8, level: 1, combo: 0 };
    const board = emptyBoard();

    updatePerformanceAndScore(state, 2, board); // Tổng lines đạt 10

    expect(state.level).toBe(2);
});

test("TC15 - Điểm số cơ bản và điểm thưởng Combo nhân theo cấp độ (Level) mới", () => {
    const state = { score: 0, lines: 10, level: 2, combo: 1 }; // Khởi đầu ở Level 2
    const board = emptyBoard();
    fillPartial(board, ROWS - 1, 1);

    updatePerformanceAndScore(state, 1, board); // Xóa 1 dòng

    // Điểm cơ bản = 100 * Level 2 = 200
    // Thưởng Combo = (2 - 1) * 50 * Level 2 = 100
    // Tổng cộng thêm = 300
    expect(state.score).toBe(300);
});

// --- ALTERNATIVE FLOW TESTS: GAME OVER CONDITIONS (AF - 7.1.0 -> 7.1.2) ---
test("TC16 - AF 7.1.0: Phát hiện khối gạch cố định vượt quá biên trên màn hình hiển thị hợp lệ", () => {
    const state = { gameOver: false };
    const board = emptyBoard();

    // Giả lập khối gạch bị kẹt cố định tại vị trí có toạ độ y âm (ny < 0)
    const currentPiece = {
        shape: [[1, 1], [1, 1]],
        x: 4,
        y: -1,
        color: "yellow"
    };

    simulateLockPiece(state, board, currentPiece);

    expect(state.gameOver).toBe(true);
});

// ==================================================
// KẾT QUẢ IN RA
// ==================================================
console.log(`\n📊 Kết quả kiểm thử: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    process.exit(1);
}