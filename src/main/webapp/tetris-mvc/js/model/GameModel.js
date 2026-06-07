import { COLS, ROWS, TETROMINOES, SCORE_TABLE, SPEEDS } from "../constants.js";

export default class GameModel {
    constructor() {
        this.reset();
    }

    // ─────────────────────────────
    // INIT
    // ─────────────────────────────
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

    // ─────────────────────────────
    // BAG SYSTEM
    // ─────────────────────────────
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

    // ─────────────────────────────
    // COLLISION
    // ─────────────────────────────
    _collides(piece, dx, dy, shape) {
        const s = shape || piece.shape;

        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;

                const nx = piece.x + c + dx;
                const ny = piece.y + r + dy;

                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && this.board[ny][nx]) return true;
            }
        }
        return false;
    }

    // ─────────────────────────────
    // ROTATE
    // ─────────────────────────────
    _rotate(shape, dir = 1) {
        const N = shape.length;
        const M = shape[0].length;
        const res = Array.from({ length: M }, () => Array(N).fill(0));

        for (let r = 0; r < N; r++)
            for (let c = 0; c < M; c++)
                if (dir === 1)
                    res[c][N - 1 - r] = shape[r][c];
                else
                    res[M - 1 - c][r] = shape[r][c];

        return res;
    }

    rotate(dir = 1) {
        const rotated = this._rotate(this.current.shape, dir);
        const kicks = [0, -1, 1, -2, 2];

        for (const k of kicks) {
            if (!this._collides(this.current, k, 0, rotated)) {
                this.current.shape = rotated;
                this.current.x += k;
                return;
            }
        }
    }

    // ─────────────────────────────
    // MOVE
    // ─────────────────────────────
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

    // ─────────────────────────────
// LOCK + CLEAR
// ─────────────────────────────

    _lockPiece() {

        // ==================================================
        // UC-07: CLEAR LINE
        // ==================================================
        // Sau khi khối không thể di chuyển xuống nữa:
        // 1. Gắn khối hiện tại vào board
        // 2. Kiểm tra các hàng đầy
        // 3. Xóa các hàng đầy
        // 4. Cập nhật điểm số
        // 5. Cập nhật tổng số dòng đã clear
        // 6. Tăng level nếu đủ điều kiện
        // 7. Sinh khối mới
        // ==================================================

        const { shape, x, y, color } = this.current;

        // Ghi dữ liệu khối hiện tại xuống board
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {

                if (!shape[r][c]) continue;

                const ny = y + r;

                // Nếu khối bị khóa ở phía trên board
                // => Game Over
                if (ny < 0) {
                    this.gameOver = true;
                    return;
                }

                this.board[ny][x + c] = color;
            }
        }

        // UC-07:
        // Tìm và xóa các dòng đầy
        const cleared = this._clearLines();

        // UC-07:
        // Cập nhật điểm, số dòng và level
        this._addScore(cleared);

        // Sinh khối tiếp theo
        this._spawnPiece();
    }

    _clearLines() {

        // ==================================================
        // UC-07: CLEAR LINE
        // ==================================================
        // Chức năng:
        // - Duyệt từ dưới lên trên
        // - Kiểm tra hàng nào đã đầy
        // - Xóa hàng đầy
        // - Đẩy toàn bộ hàng phía trên xuống
        // - Thêm hàng trống mới phía trên
        // ==================================================

        let count = 0;

        for (let r = ROWS - 1; r >= 0; r--) {

            // Kiểm tra tất cả ô trong hàng đều có dữ liệu
            if (this.board[r].every(cell => cell !== null)) {

                // Xóa hàng đầy
                this.board.splice(r, 1);

                // Thêm hàng trống ở phía trên
                this.board.unshift(
                    Array(COLS).fill(null)
                );

                count++;

                // Kiểm tra lại vị trí hiện tại
                // để xử lý trường hợp clear nhiều dòng liên tiếp
                r++;
            }
        }

        // Trả về số dòng đã clear
        return count;
    }

    _addScore(lines) {

        // ==================================================
        // UC-07: SCORE CALCULATION
        // ==================================================
        // Sau khi clear line:
        // - Cộng điểm theo số dòng xóa được
        // - Cập nhật tổng số dòng đã clear
        // - Tính level mới
        // ==================================================

        if (lines === 0) return;

        // Tính điểm theo bảng SCORE_TABLE
        this.score +=
            (SCORE_TABLE[lines] || 800)
            * this.level;

        // Tổng số dòng đã clear
        this.lines += lines;

        // Cứ mỗi 10 dòng tăng 1 level
        this.level =
            Math.floor(this.lines / 10) + 1;
    }

    // ─────────────────────────────
    // UTIL
    // ─────────────────────────────
    getGhostY() {
        let dist = 0;
        while (!this._collides(this.current, 0, dist + 1)) {
            dist++;
        }
        return this.current.y + dist;
    }

    getDropSpeed() {
        return SPEEDS[Math.min(this.level - 1, SPEEDS.length - 1)];
    }
}