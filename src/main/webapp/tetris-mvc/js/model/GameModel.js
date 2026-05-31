import GameModel from "../model/GameModel.js";
import GameView from "../view/GameView.js";

export default class GameController {

    constructor() {

        // Khởi tạo model chứa toàn bộ dữ liệu và logic game
        this.model = new GameModel();

        // Khởi tạo view chịu trách nhiệm hiển thị giao diện
        this.view = new GameView();

        // Trạng thái game:
        // start   : màn hình bắt đầu
        // playing : đang chơi
        // paused  : tạm dừng
        // over    : game over
        this.state = 'start';

        // Lấy điểm cao nhất từ localStorage
        this.hi = parseInt(localStorage.getItem('tetris_hi') || '0');

        // Cờ đánh dấu có phá kỷ lục hay không
        this.newRecord = false;

        // Biến hỗ trợ game loop
        this._lastTick = 0;
        this._rafId = null;
        this._dropAcc = 0;

        // Tránh gọi game over nhiều lần
        this.gameOverHandled = false;

        // Đăng ký các sự kiện bàn phím và nút bấm
        this._bindInputs();

        // Hiển thị màn hình bắt đầu
        this.view.showStart();

        // Cập nhật HUD
        this.view.updateHUD(this.model, this.hi);

        this.contextPath = window.location.pathname
            .split("/tetris-mvc")[0];
    }

    // ─────────────────────────────
    // INPUT
    // ─────────────────────────────

    _bindInputs() {

        // Lắng nghe bàn phím
        document.addEventListener('keydown', e => this._onKey(e));

        const startBtn = document.getElementById('start-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const restartBtn = document.getElementById('restart-btn');
        const homeBtn = document.getElementById('home-btn');

        if (startBtn) {
            startBtn.onclick = () => this.startGame();
        }

        if (resumeBtn) {
            startBtn.onclick = () => this.resume();
        }

        if (restartBtn) {
            restartBtn.onclick = () => this.restartGame();
        }

        if (homeBtn) {
            homeBtn.onclick = () => this._returnToMenu();
        }
    }

    // ─────────────────────────────
    // GAME FLOW
    // ─────────────────────────────

    startGame() {

        // Nếu đang chơi thì không cho start lại
        if (this.state === 'playing') return;

        // Reset toàn bộ dữ liệu game
        this.model.reset();

        // Reset cờ game over
        this.gameOverHandled = false;

        this.state = 'playing';

        this.newRecord = false;

        // Ẩn các popup
        this.view.hideAll();

        // Render giao diện ban đầu
        this._syncView();

        // Reset bộ đếm thời gian rơi
        this._dropAcc = 0;

        this._lastTick = performance.now();

        // Hủy loop cũ nếu tồn tại
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        // Khởi động game loop
        this._loop(this._lastTick);
    }

    restartGame() {

        // Chỉ cho restart khi game over
        if (this.state !== 'over') return;

        this.startGame();
    }

    _returnToMenu() {

        this.stopGame();

        this.view.showStart();
    }

    stopGame() {

        if (this.state === 'over') return;

        this.state = 'over';

        // Dừng game loop
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        // Xóa piece hiện tại khỏi màn hình
        this.model.current = null;

        this.view.render(this.model);

        // Cập nhật điểm cao
        this._updateHighScore();

        // Hiển thị popup game over
        this.view.showGameOver(
            this.model.score,
            this.hi,
            this.newRecord
        );
    }

    pause() {

        if (this.state !== 'playing') return;

        this.state = 'paused';

        cancelAnimationFrame(this._rafId);

        this.view.showPause();
    }

    resume() {

        if (this.state !== 'paused') return;

        this.state = 'playing';

        this.view.hideAll();

        this._lastTick = performance.now();

        this._loop(this._lastTick);
    }

    // ─────────────────────────────
    // GAME OVER
    // ─────────────────────────────

    _checkGameOver() {

        // Đã xử lý game over thì bỏ qua
        if (this.gameOverHandled) return;

        if (this.model.gameOver) {

            // Đánh dấu đã xử lý để tránh gọi nhiều lần
            this.gameOverHandled = true;

            this.handleGameOver();
        }
    }

    async handleGameOver() {

        console.log("GAME OVER FUNCTION RUNNING");

        try {

            // Gửi điểm lên server
            const response = await fetch(
                `${window.CONTEXT_PATH}/save-score`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        score: this.model.score,

                        level: this.model.level,

                        linesCleared: this.model.lines,

                        playTimeSeconds: 120
                    })
                }
            );

            console.log("STATUS:", response.status);

            const text = await response.text();

            console.log("RESPONSE:", text);

        } catch (e) {

            console.error("SAVE SCORE ERROR:", e);
        }

        this.stopGame();
    }

    _updateHighScore() {

        // Nếu điểm hiện tại lớn hơn điểm cao nhất
        if (this.model.score > this.hi) {

            this.hi = this.model.score;

            localStorage.setItem('tetris_hi', this.hi);

            this.newRecord = true;
        }
    }

    // ─────────────────────────────
    // INPUT HANDLER
    // ─────────────────────────────

    _onKey(e) {

        if (this.state !== 'playing') {

            if (e.code === 'KeyP' && this.state === 'paused') {
                this.resume();
            }

            return;
        }

        const m = this.model;

        switch (e.code) {

            // Di chuyển sang trái
            case 'ArrowLeft':
                m.moveLeft();
                break;

            // Di chuyển sang phải
            case 'ArrowRight':
                m.moveRight();
                break;

            // Soft Drop
            // Tăng tốc độ rơi của khối hiện tại
            case 'ArrowDown':
                m.softDrop();
                this._dropAcc = 0;
                break;

            // Xoay theo chiều kim đồng hồ
            case 'ArrowUp':
            case 'KeyZ':
                m.rotate(1);
                break;

            // Xoay ngược chiều kim đồng hồ
            case 'KeyX':
                m.rotate(-1);
                break;

            // Hard Drop
            // Thả khối xuống đáy ngay lập tức
            // Sau đó GameModel sẽ:
            // - Khóa khối vào board
            // - Kiểm tra hàng đầy
            // - Xóa hàng (Clear Line)
            // - Cộng điểm
            // - Sinh khối mới
            case 'Space':
                m.hardDrop();
                break;

            // Tạm dừng game
            case 'KeyP':
                this.pause();
                break;

            default:
                return;
        }

        e.preventDefault();

        this._checkGameOver();

        this._syncView();
    }

    // ─────────────────────────────
    // GAME LOOP
    // ─────────────────────────────

    _loop(timestamp) {

        if (this.state !== 'playing') return;

        const dt = timestamp - this._lastTick;

        this._lastTick = timestamp;

        // Tích lũy thời gian rơi
        this._dropAcc += dt;

        // Lấy tốc độ rơi theo level hiện tại
        const speed = this.model.getDropSpeed();

        let leveledUp = false;

        // Đã đến thời điểm khối phải rơi
        if (this._dropAcc >= speed) {

            this._dropAcc -= speed;

            const prevLevel = this.model.level;

            // Nếu bên dưới còn trống thì tiếp tục rơi
            if (!this.model._collides(this.model.current, 0, 1)) {

                this.model.current.y++;

            } else {

                /*
                 * Khối đã chạm đáy hoặc chạm khối khác
                 *
                 * _lockPiece() trong GameModel sẽ:
                 *
                 * 1. Gắn khối hiện tại vào board
                 * 2. Kiểm tra các hàng đã đầy
                 * 3. Xóa hàng đầy (Clear Line)
                 * 4. Dồn các hàng phía trên xuống
                 * 5. Cập nhật điểm
                 * 6. Tăng số line đã xóa
                 * 7. Kiểm tra tăng level
                 * 8. Sinh piece mới
                 * 9. Kiểm tra game over
                 */
                this.model._lockPiece();

                // Nếu clear line làm tăng level
                if (this.model.level !== prevLevel) {
                    leveledUp = true;
                }
            }

            this._checkGameOver();
        }

        // Hiệu ứng Level Up sau khi clear đủ line
        if (leveledUp) {
            this.view.flashLevelUp();
        }

        // Đồng bộ dữ liệu lên giao diện
        this._syncView();

        // Tiếp tục game loop
        if (this.state === 'playing') {

            this._rafId = requestAnimationFrame(
                ts => this._loop(ts)
            );
        }
    }

    // ─────────────────────────────
    // VIEW SYNC
    // ─────────────────────────────

    _syncView() {

        // Render board
        this.view.render(this.model);

        // Render khối tiếp theo
        this.view.renderNext(this.model.next);

        // Cập nhật điểm, level, line, high score
        this.view.updateHUD(this.model, this.hi);
    }
}