import GameModel from "../model/GameModel.js";
import GameView from "../view/GameView.js";

export default class GameController {

    constructor() {

        this.model = new GameModel();
        this.view = new GameView();

        this.state = 'start';

        this.hi = parseInt(localStorage.getItem('tetris_hi') || '0');

        this.newRecord = false;

        this._lastTick = 0;
        this._rafId = null;
        this._dropAcc = 0;

        this.gameOverHandled = false;

        this._bindInputs();

        this.view.showStart();
        this.view.updateHUD(this.model, this.hi);

        this.contextPath = window.location.pathname
            .split("/tetris-mvc")[0];
    }

    // ─────────────────────────────
    // INPUT
    // ─────────────────────────────
    _bindInputs() {

        document.addEventListener('keydown', e => this._onKey(e));

        const startBtn = document.getElementById('start-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const restartBtn = document.getElementById('restart-btn');
        const homeBtn = document.getElementById('home-btn');

        if (startBtn) {
            startBtn.onclick = () => this.startGame();
        }

        if (resumeBtn) {
            resumeBtn.onclick = () => this.resume();
        }

        if (restartBtn) {
            restartBtn.onclick = () => this.restartGame();
        }

        if (homeBtn) {
            homeBtn.onclick = () => this._returnToMenu();
        }
    }

    // ─────────────────────────────
    // START GAME
    // ─────────────────────────────
    startGame() {

        // UC_01 - START GAME

        // 1.1 Người chơi nhấn Start
        if (this.state === 'playing') return;

        // 1.2 Khởi tạo lại game
        this.model.reset();

        // 1.3 Reset các trạng thái
        this.gameOverHandled = false;
        this.newRecord = false;

        // 1.4 Chuyển sang trạng thái playing
        this.state = 'playing';

        // 1.5 Hiển thị game board
        this.view.hideAll();
        this._syncView();

        // 1.6 Khởi động game loop
        this._dropAcc = 0;
        this._lastTick = performance.now();

        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        this._loop(this._lastTick);
    }

    // ─────────────────────────────
    // INPUT HANDLER
    // ─────────────────────────────
    _onKey(e) {

        if (this.state !== 'playing') return;

        const m = this.model;

        switch (e.code) {

            case 'ArrowDown':

                /*
                 * Soft Drop
                 * Người chơi đẩy khối xuống nhanh hơn.
                 * Nếu chạm đáy thì _lockPiece()
                 * sẽ được kích hoạt trong GameModel.
                 */
                m.softDrop();
                this._dropAcc = 0;
                break;

            case 'Space':

                /*
                 * Hard Drop
                 * Thả khối xuống đáy ngay lập tức.
                 * Sau đó:
                 * - Khóa khối
                 * - Kiểm tra hàng đầy
                 * - Clear Line
                 * - Cộng điểm
                 */
                m.hardDrop();
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

        this._dropAcc += dt;

        const speed = this.model.getDropSpeed();

        let leveledUp = false;

        if (this._dropAcc >= speed) {

            this._dropAcc -= speed;

            const prevLevel = this.model.level;

            // Nếu còn khoảng trống phía dưới
            if (!this.model._collides(this.model.current, 0, 1)) {

                this.model.current.y++;

            } else {

                /*
                 * KHỐI CHẠM ĐẤT
                 *
                 * _lockPiece() sẽ:
                 *
                 * 1. Gắn khối hiện tại vào board
                 * 2. Kiểm tra các hàng đầy
                 * 3. Xóa hàng đầy (Clear Line)
                 * 4. Dồn các hàng phía trên xuống
                 * 5. Cập nhật score
                 * 6. Cập nhật lines
                 * 7. Kiểm tra tăng level
                 * 8. Sinh khối mới
                 * 9. Kiểm tra game over
                 */
                this.model._lockPiece();

                // Nếu sau khi clear line level thay đổi
                if (this.model.level !== prevLevel) {
                    leveledUp = true;
                }
            }

            this._checkGameOver();
        }

        // Hiệu ứng lên cấp sau khi xóa đủ line
        if (leveledUp) {
            this.view.flashLevelUp();
        }

        this._syncView();

        if (this.state === 'playing') {
            this._rafId = requestAnimationFrame(
                ts => this._loop(ts)
            );
        }
    }

    // ─────────────────────────────
    // GAME OVER
    // ─────────────────────────────
    _checkGameOver() {

        // UC_11

        if (this.gameOverHandled) return;

        // 11.1 Kiểm tra cờ gameOver từ model
        if (this.model.gameOver) {

            // 11.2 Đánh dấu đã xử lý
            this.gameOverHandled = true;

            // 11.3 Chuyển sang xử lý Game Over
            this.handleGameOver();
        }
    }

    handleGameOver() {

        // UC_11.3
        // Chuyển tiếp sang stopGame()

        this.stopGame();
    }

    stopGame() {

        // UC_12

        if (this.state === 'over') return;

        // 12.2 Chuyển trạng thái game sang over
        this.state = 'over';

        // 12.3 Dừng game loop
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        // UC_13
        this._updateHighScore();

        // UC_14
        this.view.showGameOver(
            this.model.score,
            this.hi,
            this.newRecord
        );
    }

    // ─────────────────────────────
    // HIGH SCORE
    // ─────────────────────────────
    _updateHighScore() {

        // 13.0 Lấy điểm hiện tại

        // 13.1 So sánh với điểm cao nhất
        if (this.model.score > this.hi) {

            // 13.2 Cập nhật kỷ lục mới
            this.hi = this.model.score;

            localStorage.setItem(
                'tetris_hi',
                this.hi
            );

            this.newRecord = true;
        }

        // 13.3 Nếu không cao hơn thì giữ nguyên
    }

    // ─────────────────────────────
    // VIEW SYNC
    // ─────────────────────────────
    _syncView() {

        /*
         * Sau khi Clear Line:
         * - Board thay đổi
         * - Score thay đổi
         * - Lines thay đổi
         * - Level có thể thay đổi
         *
         * Toàn bộ dữ liệu sẽ được cập nhật lên giao diện.
         */

        this.view.render(this.model);

        this.view.updateHUD(
            this.model,
            this.hi
        );
    }

    
}