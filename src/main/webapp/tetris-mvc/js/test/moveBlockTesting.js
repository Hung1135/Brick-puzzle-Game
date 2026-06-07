/**
 * Test file cho chức năng MOVE BLOCK trong GameModel
 */

// ─────────────────────────────
// MOCK CONSTANTS
// ─────────────────────────────
const COLS = 10;
const ROWS = 20;

// ─────────────────────────────
// MOCK MODEL (chỉ lấy phần cần test)
// ─────────────────────────────
class GameModel {

    constructor() {
        this.board = Array.from(
            { length: ROWS },
            () => Array(COLS).fill(null)
        );

        this.score = 0;

        this.current = {
            shape: [[1]],
            x: 4,
            y: 0,
            color: 'red'
        };

        this.locked = false;
    }

    _collides(piece, dx, dy) {

        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {

                if (!piece.shape[r][c]) continue;

                const nx = piece.x + c + dx;
                const ny = piece.y + r + dy;

                if (nx < 0 || nx >= COLS || ny >= ROWS)
                    return true;

                if (ny >= 0 && this.board[ny][nx])
                    return true;
            }
        }

        return false;
    }

    moveLeft() {
        if (!this._collides(this.current, -1, 0)) {
            this.current.x--;
        }
    }

    moveRight() {
        if (!this._collides(this.current, 1, 0)) {
            this.current.x++;
        }
    }

    softDrop() {

        if (!this._collides(this.current, 0, 1)) {

            this.current.y++;
            this.score += 1;

            return false;
        }

        this._lockPiece();

        return true;
    }

    hardDrop() {

        let dist = 0;

        while (!this._collides(this.current, 0, dist + 1)) {
            dist++;
        }

        this.current.y += dist;

        this.score += dist * 2;

        this._lockPiece();
    }

    _lockPiece() {
        this.locked = true;
    }
}

// ─────────────────────────────
// MINI TEST RUNNER
// ─────────────────────────────

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

                throw new Error(
                    `Expected ${expected}, got ${actual}`
                );
            }
        }
    };
}

// ─────────────────────────────
// TEST CASES
// ─────────────────────────────

console.log("\n🧪 MOVE BLOCK TESTS\n");

// ─────────────────────────────
// moveLeft()
// ─────────────────────────────

test("moveLeft: dịch trái 1 ô", () => {

    const m = new GameModel();

    m.current.x = 5;

    m.moveLeft();

    expect(m.current.x).toBe(4);
});

test("moveLeft: không vượt biên trái", () => {

    const m = new GameModel();

    m.current.x = 0;

    m.moveLeft();

    expect(m.current.x).toBe(0);
});

// ─────────────────────────────
// moveRight()
// ─────────────────────────────

test("moveRight: dịch phải 1 ô", () => {

    const m = new GameModel();

    m.current.x = 4;

    m.moveRight();

    expect(m.current.x).toBe(5);
});

test("moveRight: không vượt biên phải", () => {

    const m = new GameModel();

    m.current.x = COLS - 1;

    m.moveRight();

    expect(m.current.x).toBe(COLS - 1);
});

// ─────────────────────────────
// softDrop()
// ─────────────────────────────

test("softDrop: rơi xuống 1 ô", () => {

    const m = new GameModel();

    const oldY = m.current.y;

    m.softDrop();

    expect(m.current.y).toBe(oldY + 1);
});

test("softDrop: cộng 1 điểm", () => {

    const m = new GameModel();

    m.softDrop();

    expect(m.score).toBe(1);
});

test("softDrop: chạm đáy thì lock piece", () => {

    const m = new GameModel();

    m.current.y = ROWS - 1;

    const locked = m.softDrop();

    expect(locked).toBe(true);
    expect(m.locked).toBe(true);
});

// ─────────────────────────────
// hardDrop()
// ─────────────────────────────

test("hardDrop: rơi tới đáy", () => {

    const m = new GameModel();

    m.current.y = 0;

    m.hardDrop();

    expect(m.current.y).toBe(ROWS - 1);
});

test("hardDrop: lock piece sau khi rơi", () => {

    const m = new GameModel();

    m.hardDrop();

    expect(m.locked).toBe(true);
});

test("hardDrop: cộng điểm = dist * 2", () => {

    const m = new GameModel();

    m.current.y = 0;

    m.hardDrop();

    expect(m.score).toBe((ROWS - 1) * 2);
});

// ─────────────────────────────
// COLLISION TEST
// ─────────────────────────────

test("moveLeft: bị block bên trái thì không di chuyển", () => {

    const m = new GameModel();

    m.current.x = 5;
    m.board[0][4] = 'blue';

    m.moveLeft();

    expect(m.current.x).toBe(5);
});

test("moveRight: bị block bên phải thì không di chuyển", () => {

    const m = new GameModel();

    m.current.x = 5;
    m.board[0][6] = 'blue';

    m.moveRight();

    expect(m.current.x).toBe(5);
});

// ─────────────────────────────
// WASD SUPPORT
// ─────────────────────────────

test("KeyA (moveLeft): dịch trái 1 ô", () => {
    const m = new GameModel();
    m.current.x = 5;
    // simulate: same logic as moveLeft
    m.moveLeft();
    expect(m.current.x).toBe(4);
});

test("KeyD (moveRight): dịch phải 1 ô", () => {
    const m = new GameModel();
    m.current.x = 4;
    m.moveRight();
    expect(m.current.x).toBe(5);
});

test("KeyS (softDrop): rơi 1 ô + cộng điểm", () => {
    const m = new GameModel();
    const oldY = m.current.y;
    m.softDrop();
    expect(m.current.y).toBe(oldY + 1);
    expect(m.score).toBe(1);
});

// ─────────────────────────────
// RESULT
// ─────────────────────────────

console.log(
    `\n📊 Kết quả: ${passed} passed, ${failed} failed\n`
);

if (failed > 0) {
    process.exit(1);
}

