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

        // Bổ sung thuộc tính quản lý Combo (Khởi tạo chuỗi = 0)
        this.combo = 0;

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
    // LOCK + CLEAR (MAIN FLOW LOGIC)
    // ─────────────────────────────

    // 🔴 [MAIN FLOW - 7.1]: Hệ thống cố định khối gạch hiện tại vào bàn chơi
    _lockPiece() {
        const { shape, x, y, color } = this.current;

        // Ghi dữ liệu khối hiện tại xuống board
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {

                if (!shape[r][c]) continue;

                const ny = y + r;
                // 🔴 [ALTERNATIVE FLOW - 7.1.1 & 7.1.2]: Phát hiện khối gạch nằm ngoài vùng hiển thị hợp lệ
                if (ny < 0) {
                    this.gameOver = true;
                    return;
                }

                this.board[ny][x + c] = color;
            }
        }

        // 🔴 [MAIN FLOW - 7.2]: Hệ thống kiểm tra lần lượt các hàng từ dưới lên trên
        // Tìm và xóa các dòng đầy
        const cleared = this._clearLines();

        // 🔴 [MAIN FLOW - 7.4]: Hệ thống thực hiện cập nhật điểm số, combo, perfect clear và cấp độ mới
        this._updatePerformanceAndScore(cleared);

        // 🔴 [MAIN FLOW - 7.5]: Hệ thống tạo và đưa khối gạch tiếp theo vào vị trí bắt đầu
        this._spawnPiece();
    }

    // 🔴 [MAIN FLOW - 7.3]: Loại bỏ hàng lấp đầy, bổ sung hàng trống phía trên và dịch chuyển khối xuống
    _clearLines() {
        let count = 0;

        for (let r = ROWS - 1; r >= 0; r--) {

            // Kiểm tra tất cả ô trong hàng đều có dữ liệu
            if (this.board[r].every(cell => cell !== null)) {

                // Xóa hàng đầy
                this.board.splice(r, 1);

                // Thêm hàng trống ở phía trên
                this.board.unshift(Array(COLS).fill(null));

                count++;

                // Kiểm tra lại vị trí hiện tại để xử lý trường hợp clear nhiều dòng liên tiếp
                r++;
            }
        }

        // Trả về số dòng đã clear
        return count;
    }

    // 🔴 [MAIN FLOW - 7.4]: Hàm tổng hợp cập nhật thành tích chi tiết theo tài liệu thiết kế
    _updatePerformanceAndScore(linesCleared) {

        // 🔴 [ALTERNATIVE FLOW - 7.2.1 -> 7.2.3]: Tại bước 7.2 không phát hiện hàng nào được lấp đầy
        if (linesCleared === 0) {
            console.log("[AF-7.2.1 & 7.2.2] Không có hàng nào bị xóa. Không cập nhật điểm hàng.");
            // 🔴 [ALTERNATIVE FLOW - 7.2.3]: Đặt lại chuỗi Combo hiện tại do lượt chơi không tạo được hàng bị xóa
            this.combo = 0;
            return;
        }

        console.log(`[MAIN FLOW - 7.2] Phát hiện xóa thành công: ${linesCleared} hàng.`);

        // 🔴 7.4.1. Cập nhật số lượng dòng đã xóa và tính điểm cơ bản dựa trên số dòng được loại bỏ
        this.lines += linesCleared;
        let baseScore = (SCORE_TABLE[linesCleared] || 800) * this.level;
        this.score += baseScore;
        console.log(`[7.4.1] Điểm cơ bản nhận được từ hàng xóa: +${baseScore}`);

        // 🔴 7.4.2. Tăng giá trị Combo và cộng điểm thưởng Combo tương ứng
        this.combo++;
        if (this.combo > 1) {
            let comboBonus = (this.combo - 1) * 50 * this.level;
            this.score += comboBonus;
            console.log(`[7.4.2] Chuỗi Combo tăng lên: ${this.combo}. Thưởng Combo: +${comboBonus}`);
        } else {
            console.log(`[7.4.2] Bắt đầu chuỗi Combo (Lượt xóa đầu tiên), combo hiện tại: ${this.combo}`);
        }

        // 🔴 7.4.3. Kiểm tra trạng thái Perfect Clear
        if (this._isPerfectClear()) {
            let perfectClearBonus = 2000 * this.level;
            this.score += perfectClearBonus;
            console.log(`[7.4.3] Tuyệt vời! PERFECT CLEAR hoàn toàn bàn chơi. Thưởng: +${perfectClearBonus}`);
        } else {
            // 🔴 [ALTERNATIVE FLOW - 7.4.3.1 -> 7.4.3.3] Không thỏa điều kiện Perfect Clear
            console.log("[AF-7.4.3.1] Bàn chơi vẫn còn khối tồn tại. Không cộng điểm Perfect Clear.");
        }

        // 🔴 7.4.4. Tính toán và cập nhật cấp độ mới nếu đạt điều kiện tăng cấp (Mỗi 10 dòng lên 1 cấp)
        this.level = Math.floor(this.lines / 10) + 1;
        console.log(`[7.4.4] Trạng thái sau xử lý: Level: ${this.level} | Tổng điểm: ${this.score}`);
    }

    // Hàm phụ kiểm tra xem toàn bộ ma trận board có trống sạch hay không
    _isPerfectClear() {
        return this.board.every(row => row.every(cell => cell === null));
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