/**
 * UC-07
 * CLEAR LINE & SCORE CALCULATION TEST
 *
 * Mục đích:
 * Kiểm thử chức năng:
 * - Xóa dòng đầy (_clearLines)
 * - Cập nhật điểm (_addScore)
 * - Cập nhật tổng số dòng đã clear
 * - Tăng level
 *
 * Chạy:
 * node clearLineTesting.js
 */

// ==================================================
// MOCK CONSTANTS
// ==================================================
// Sao chép từ constants.js để độc lập với project
// ==================================================

const COLS = 10;
const ROWS = 20;

const SCORE_TABLE = {
    1: 100,
    2: 300,
    3: 500,
    4: 800
};

// ==================================================
// EXTRACT LOGIC TỪ GameModel
// ==================================================

/**
 * UC-07
 * Xóa các hàng đầy trong board
 *
 * Trả về:
 * số dòng đã được xóa
 */
function clearLines(board) {

    let count = 0;

    for (let r = ROWS - 1; r >= 0; r--) {

        // Nếu toàn bộ ô đều có dữ liệu
        // => hàng đã đầy
        if (board[r].every(cell => cell !== null)) {

            // Xóa hàng đầy
            board.splice(r, 1);

            // Thêm hàng rỗng phía trên
            board.unshift(
                Array(COLS).fill(null)
            );

            count++;

            // Kiểm tra lại vị trí hiện tại
            // vì các hàng đã dịch xuống
            r++;
        }
    }

    return count;
}

/**
 * UC-07
 * Cập nhật:
 * - Score
 * - Lines
 * - Level
 */
function addScore(state, lines) {

    if (lines === 0) return;

    // Cộng điểm theo bảng SCORE_TABLE
    state.score +=
        (SCORE_TABLE[lines] || 800)
        * state.level;

    // Tổng số dòng đã clear
    state.lines += lines;

    // Tăng level mỗi 10 lines
    state.level =
        Math.floor(state.lines / 10) + 1;
}

// ==================================================
// HELPER FUNCTIONS
// ==================================================

/**
 * Tạo board rỗng
 */
function emptyBoard() {

    return Array.from(
        { length: ROWS },
        () => Array(COLS).fill(null)
    );
}

/**
 * Điền đầy một hàng
 */
function fillRow(board, r) {

    board[r] =
        Array(COLS).fill("red");
}

/**
 * Điền một phần hàng
 */
function fillPartial(
    board,
    r,
    cols = 5
) {

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

        console.log(
            `✅ PASS: ${name}`
        );

        passed++;

    } catch (e) {

        console.log(
            `❌ FAIL: ${name}`
        );

        console.log(
            `   → ${e.message}`
        );

        failed++;
    }
}

function expect(actual) {

    return {

        toBe(expected) {

            if (actual !== expected) {

                throw new Error(
                    `Expected ${expected}, got ${actual}`
                );
            }
        },

        toEqual(expected) {

            const a =
                JSON.stringify(actual);

            const b =
                JSON.stringify(expected);

            if (a !== b) {

                throw new Error(
                    `Expected ${b}, got ${a}`
                );
            }
        }
    };
}

// ==================================================
// UC-07 TEST CASES
// ==================================================

console.log(
    "\n🧪 UC-07 CLEAR LINE TESTS\n"
);

// --------------------------------------------------
// TC01
// Board trống
// --------------------------------------------------

test(
    "Board trống: trả về 0 dòng cleared",
    () => {

        const board =
            emptyBoard();

        const count =
            clearLines(board);

        expect(count).toBe(0);

        expect(board.length)
            .toBe(ROWS);
    }
);

// --------------------------------------------------
// TC02
// 1 hàng đầy
// --------------------------------------------------

test(
    "1 hàng đầy ở đáy: xóa 1 dòng",
    () => {

        const board =
            emptyBoard();

        fillRow(
            board,
            ROWS - 1
        );

        const count =
            clearLines(board);

        expect(count)
            .toBe(1);

        expect(board.length)
            .toBe(ROWS);
    }
);

// --------------------------------------------------
// TC03
// Hàng mới phía trên
// --------------------------------------------------

test(
    "Hàng đầu tiên sau khi clear phải rỗng",
    () => {

        const board =
            emptyBoard();

        fillRow(
            board,
            ROWS - 1
        );

        clearLines(board);

        expect(
            board[0].every(
                c => c === null
            )
        ).toBe(true);
    }
);

// --------------------------------------------------
// TC04
// Hàng chưa đầy
// --------------------------------------------------

test(
    "Hàng không đầy: không xóa",
    () => {

        const board =
            emptyBoard();

        fillPartial(
            board,
            ROWS - 1,
            9
        );

        const count =
            clearLines(board);

        expect(count)
            .toBe(0);
    }
);

// --------------------------------------------------
// TC05
// 2 hàng liên tiếp
// --------------------------------------------------

test(
    "2 hàng đầy liên tiếp: xóa 2",
    () => {

        const board =
            emptyBoard();

        fillRow(board, ROWS - 1);
        fillRow(board, ROWS - 2);

        const count =
            clearLines(board);

        expect(count)
            .toBe(2);
    }
);

// --------------------------------------------------
// TC06
// Tetris (4 hàng)
// --------------------------------------------------

test(
    "4 hàng đầy (Tetris): xóa 4",
    () => {

        const board =
            emptyBoard();

        fillRow(board, ROWS - 1);
        fillRow(board, ROWS - 2);
        fillRow(board, ROWS - 3);
        fillRow(board, ROWS - 4);

        const count =
            clearLines(board);

        expect(count)
            .toBe(4);
    }
);

// --------------------------------------------------
// TC07
// Hàng đầy không liên tiếp
// --------------------------------------------------

test(
    "2 hàng đầy cách nhau",
    () => {

        const board =
            emptyBoard();

        fillRow(board, ROWS - 1);
        fillRow(board, ROWS - 5);

        const count =
            clearLines(board);

        expect(count)
            .toBe(2);
    }
);

// --------------------------------------------------
// TC08
// Kiểm tra dịch hàng
// --------------------------------------------------

test(
    "Hàng phía trên dịch xuống",
    () => {

        const board =
            emptyBoard();

        board[ROWS - 2][0] =
            "blue";

        fillRow(
            board,
            ROWS - 1
        );

        clearLines(board);

        expect(
            board[ROWS - 1][0]
        ).toBe("blue");
    }
);

// ==================================================
// SCORE TEST
// ==================================================

// TC09

test(
    "addScore với 0 dòng",
    () => {

        const state = {
            score: 0,
            lines: 0,
            level: 1
        };

        addScore(state, 0);

        expect(state.score)
            .toBe(0);
    }
);

// TC10

test(
    "addScore 1 dòng level 1",
    () => {

        const state = {
            score: 0,
            lines: 0,
            level: 1
        };

        addScore(state, 1);

        expect(state.score)
            .toBe(100);
    }
);

// TC11

test(
    "addScore 4 dòng (Tetris)",
    () => {

        const state = {
            score: 0,
            lines: 0,
            level: 1
        };

        addScore(state, 4);

        expect(state.score)
            .toBe(800);
    }
);

// TC12

test(
    "Level tăng sau 10 lines",
    () => {

        const state = {
            score: 0,
            lines: 8,
            level: 1
        };

        addScore(state, 2);

        expect(state.level)
            .toBe(2);
    }
);

// TC13

test(
    "Score nhân theo level",
    () => {

        const state = {
            score: 0,
            lines: 10,
            level: 2
        };

        addScore(state, 1);

        expect(state.score)
            .toBe(200);
    }
);

// ==================================================
// KẾT QUẢ
// ==================================================

console.log(
    `\n📊 Kết quả: ${passed} passed, ${failed} failed\n`
);

if (failed > 0) {

    process.exit(1);
}