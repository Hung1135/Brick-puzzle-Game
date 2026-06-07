import { COLS, ROWS, CELL, NEXT_CELL } from "../constants.js";

export default class GameView {
    constructor() {
        this.boardCanvas = document.getElementById('board-canvas');
        this.ctx = this.boardCanvas.getContext('2d');

        this.nextCanvas = document.getElementById('next-canvas');
        this.nctx = this.nextCanvas.getContext('2d');

        this.scoreEl = document.getElementById('score-display');
        this.linesEl = document.getElementById('lines-display');
        this.levelEl = document.getElementById('level-badge');
        this.hiEl = document.getElementById('hi-display');
        this.finalEl = document.getElementById('final-score-text');

        // Bổ sung phần tử DOM để hiển thị Combo ngoài giao diện (nếu có trong thiết kế HUD mới)
        this.comboEl = document.getElementById('combo-display');

        this.startScreen = document.getElementById('start-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
    }

    // ─────────────────────────────
    // RENDER BOARD
    // ─────────────────────────────
    render(model) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);

        // Grid
        ctx.strokeStyle = '#ffffff08';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
            }
        }

        // Board
        // 🔴 [MAIN FLOW - 7.6]: Hệ thống đồng bộ mọi thay đổi lên giao diện - Vẽ lại trạng thái bàn chơi sau khi cập nhật dữ liệu (Xóa dòng đầy hoặc dịch chuyển khối xuống)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (model.board[r][c]) {
                    this._drawCell(ctx, c, r, model.board[r][c], CELL);
                }
            }
        }

        if (model.current) {
            // Ghost
            const gy = model.getGhostY();
            this._drawPiece(ctx, model.current, gy, CELL, 0.2);

            // Current
            this._drawPiece(ctx, model.current, model.current.y, CELL, 1);
        }
    }

    _drawPiece(ctx, piece, yOverride, size, alpha = 1) {
        const { shape, x, color } = piece;
        ctx.globalAlpha = alpha;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    this._drawCell(ctx, x + c, yOverride + r, color, size);
                }
            }
        }

        ctx.globalAlpha = 1;
    }

    _drawCell(ctx, x, y, color, size) {
        const pad = 1.5;
        const s = size - pad * 2;

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(x * size + pad, y * size + pad, s, s);

        ctx.shadowBlur = 0;
    }

    // ─────────────────────────────
    // NEXT PIECE
    // ─────────────────────────────
    renderNext(piece) {
        const ctx = this.nctx;
        const W = this.nextCanvas.width;
        const H = this.nextCanvas.height;

        ctx.clearRect(0, 0, W, H);

        const cols = piece.shape[0].length;
        const rows = piece.shape.length;

        const offX = Math.floor((W / NEXT_CELL - cols) / 2);
        const offY = Math.floor((H / NEXT_CELL - rows) / 2);

        // 🔴 [MAIN FLOW - 7.6]: Hệ thống đồng bộ mọi thay đổi lên giao diện - Cập nhật và hiển thị khối gạch tiếp theo (Next Piece)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (piece.shape[r][c]) {
                    this._drawCell(ctx, offX + c, offY + r, piece.color, NEXT_CELL);
                }
            }
        }
    }

    // ==================================================
    // CẬP NHẬT HUD
    // ==================================================
    // Hiển thị dữ liệu trong khi chơi:
    // - Score hiện tại
    // - Tổng số dòng đã clear
    // - Level hiện tại
    // - High Score
    // ==================================================

    updateHUD(model, hi) {
        // 🔴 [MAIN FLOW - 7.6]: Hệ thống đồng bộ mọi thay đổi lên giao diện - Cập nhật các thông số trạng thái (Score, Lines, Level, Combo,...) sau khi thực hiện xóa hàng thành công

        this.scoreEl.textContent =
            model.score.toLocaleString();

        this.linesEl.textContent =
            model.lines;

        this.levelEl.textContent =
            model.level;

        this.hiEl.textContent =
            hi.toLocaleString();

        // Đồng bộ thêm giá trị chuỗi Combo hiển thị lên giao diện người dùng nếu có phần tử hiển thị
        if (this.comboEl) {
            this.comboEl.textContent = model.combo;

            // Ẩn/Hiện thẻ Combo dựa trên trạng thái chuỗi (Ẩn nếu combo bằng 0 hoặc 1, Hiện nếu combo >= 2)
            if (model.combo > 1) {
                this.comboEl.classList.remove('hidden');
            } else {
                this.comboEl.classList.add('hidden');
            }
        }
    }

    // ==================================================
    // LEVEL UP EFFECT
    // ==================================================
    // Hiệu ứng khi người chơi lên level mới
    // ==================================================

    flashLevelUp() {
        // 🔴 [MAIN FLOW - 7.6]: Hệ thống đồng bộ mọi thay đổi lên giao diện - Kích hoạt hiệu ứng nhấp nháy (Flash Effect) khi đạt điều kiện tăng cấp độ mới (bước 7.4.4)

        this.levelEl.classList
            .add('level-up');

        setTimeout(() => {

            this.levelEl.classList
                .remove('level-up');

        }, 300);
    }

    showStart() {
        this._showOnly('start-screen');
    }

    showPause() {
        this._showOnly('pause-screen');
    }

    // ==================================================
    // UC-13
    // HIỂN THỊ MÀN HÌNH GAME OVER
    // ==================================================
    // Chức năng:
    // - Hiển thị điểm cuối trận
    // - Hiển thị level cao nhất đạt được
    // - Hiển thị tổng số dòng đã clear
    // - Hiển thị thời gian chơi
    // - Hiển thị thông báo New Record
    // - Hiển thị High Score
    // ==================================================

    showGameOver({
                     score,
                     hi,
                     level,
                     lines,
                     playTime,
                     newRecord
                 }) {

        // Chuyển đổi thời gian từ giây
        // sang định dạng phút:giây
        const minutes =
            Math.floor(playTime / 60);

        const seconds =
            playTime % 60;

        // Hiển thị thống kê cuối trận
        // 🔴 [MAIN FLOW - 7.6]: Hệ thống kiểm tra trạng thái kết thúc trò chơi và đồng bộ mọi thay đổi lên giao diện màn hình kết thúc trận đấu nếu bị Game Over
        if (this.finalEl) {

            this.finalEl.innerHTML = `

        <div>
            Score:
            ${score.toLocaleString()}
        </div>

        <div>
            Level:
            ${level}
        </div>

        <div>
            Lines:
            ${lines}
        </div>

        <div>
            Time:
            ${minutes}:${seconds
                .toString()
                .padStart(2,'0')}
        </div>

        ${
                newRecord
                    ? `
                    <div class="new-record">
                        🏆 NEW RECORD!
                    </div>
                  `
                    : ''
            }
    `;
        }

        // Cập nhật High Score
        if (this.hiEl) {

            this.hiEl.textContent =
                hi.toLocaleString();
        }

        // Hiển thị màn hình Game Over
        this._showOnly(
            'gameover-screen'
        );
    }

    hideAll() {
        ['start-screen', 'pause-screen', 'gameover-screen']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
    }

    _showOnly(id) {
        ['start-screen', 'pause-screen', 'gameover-screen']
            .forEach(sid => {
                const el = document.getElementById(sid);
                if (!el) return;
                el.classList[sid === id ? 'remove' : 'add']('hidden');
            });
    }
}