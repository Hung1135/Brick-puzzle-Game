/**
 * ROTATE BLOCK TEST
 */

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
            if (actual !== expected)
                throw new Error(`Expected ${expected}, got ${actual}`);
        },

        toEqual(expected) {

            const a = JSON.stringify(actual);
            const b = JSON.stringify(expected);

            if (a !== b)
                throw new Error(`Expected ${b}, got ${a}`);
        }
    };
}

const COLS = 10;
const ROWS = 20;

class GameModel {

    constructor() {

        this.board = Array.from(
            { length: ROWS },
            () => Array(COLS).fill(null)
        );

        this.current = {
            x: 4,
            y: 0,
            shape: [
                [1, 0],
                [1, 1]
            ]
        };
    }

    _collides(piece, dx, dy, shape) {

        const s = shape || piece.shape;

        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {

                if (!s[r][c]) continue;

                const nx = piece.x + c + dx;
                const ny = piece.y + r + dy;

                if (nx < 0 || nx >= COLS)
                    return true;

                if (ny >= ROWS)
                    return true;

                if (ny >= 0 && this.board[ny][nx])
                    return true;
            }
        }

        return false;
    }

    _rotate(shape, dir = 1) {

        const N = shape.length;
        const M = shape[0].length;

        const res = Array.from(
            { length: M },
            () => Array(N).fill(0)
        );

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < M; c++) {

                if (dir === 1)
                    res[c][N - 1 - r] = shape[r][c];
                else
                    res[M - 1 - c][r] = shape[r][c];
            }
        }

        return res;
    }

    rotate(dir = 1) {

        const rotated =
            this._rotate(this.current.shape, dir);

        const kicks = [0, -1, 1, -2, 2];

        for (const k of kicks) {

            if (
                !this._collides(
                    this.current,
                    k,
                    0,
                    rotated
                )
            ) {
                this.current.shape = rotated;
                this.current.x += k;
                return true;
            }
        }

        return false;
    }
}

console.log("\n🧪 ROTATE BLOCK TESTS\n");

test("Rotate phải 90 độ", () => {

    const m = new GameModel();

    const result =
        m._rotate([
            [1, 0],
            [1, 1]
        ]);

    expect(result).toEqual([
        [1, 1],
        [1, 0]
    ]);
});

test("Rotate trái 90 độ", () => {

    const m = new GameModel();

    const result =
        m._rotate(
            [
                [1, 0],
                [1, 1]
            ],
            -1
        );

    expect(result).toEqual([
        [0, 1],
        [1, 1]
    ]);
});

test("rotate() thay đổi shape", () => {

    const m = new GameModel();

    m.rotate();

    expect(
        JSON.stringify(m.current.shape)
    ).toBe(
        JSON.stringify([
            [1, 1],
            [1, 0]
        ])
    );
});

test("Wall kick bên trái", () => {

    const m = new GameModel();

    m.current.x = 0;

    m.current.shape = [
        [1, 1, 1],
        [1, 0, 0]
    ];

    m.rotate();

    expect(m.current.x >= 0).toBe(true);
});

test("Wall kick bên phải", () => {

    const m = new GameModel();

    m.current.x = COLS - 1;

    m.rotate();

    expect(m.current.x < COLS).toBe(true);
});

test("Rotate bị chặn hoàn toàn", () => {

    const m = new GameModel();

    m.current.x = 0;

    const before =
        JSON.stringify(m.current.shape);

    // chặn mọi vị trí kick
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            m.board[r][c] = 'red';
        }
    }

    m.rotate();

    const after =
        JSON.stringify(m.current.shape);

    expect(after).toBe(before);
});

console.log(
    `\n📊 Kết quả: ${passed} passed, ${failed} failed\n`
);

if (failed > 0) {
    process.exit(1);
}