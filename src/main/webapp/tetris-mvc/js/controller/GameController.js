import GameModel from "../model/GameModel.js";
import GameView from "../view/GameView.js";

export default class GameController {

    constructor() {

        this.model = new GameModel();
        this.view = new GameView();

        this.state = 'start'; // start | playing | paused | over

        this.hi = parseInt(localStorage.getItem('tetris_hi') || '0');

        this.newRecord = false;

        this._lastTick = 0;
        this._rafId = null;
        this._dropAcc = 0;

        // ===== GAME OVER IMPROVEMENT =====
        // Lưu thời điểm bắt đầu game để tính tổng thời gian chơi
        this.startTime = null;

        // FIX GAME OVER MULTIPLE CALL
        // Đảm bảo handleGameOver() chỉ được gọi 1 lần
        this.gameOverHandled = false;

        this._bindInputs();

        this.view.showStart();
        this.view.updateHUD(this.model, this.hi);

        this.contextPath = window.location.pathname
            .split("/tetris-mvc")[0];
    }

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

    // ==================================================
    // GAME FLOW
    // ==================================================

    startGame() {

        if (this.state === 'playing') return;

        this.model.reset();

        if (!this.model.current) {
            console.error("[UC-03] Spawn thất bại: không có current piece sau reset.");
            return;
        }

        this.state = 'playing';

        this.gameOverHandled = false;
        this.newRecord = false;

        this.view.hideAll();
        this._syncView();

        this._dropAcc = 0;
        this._lastTick = performance.now();

        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        this._loop(this._lastTick);

        // ===== GAME OVER IMPROVEMENT =====
        // Ghi nhận thời điểm bắt đầu game
        // Dùng để tính tổng thời gian chơi khi game kết thúc
        this.startTime = Date.now();
    }

    // ===== GAME OVER IMPROVEMENT =====
    // Trả về tổng thời gian chơi (đơn vị giây)
    getPlayTimeSeconds() {
        return Math.floor(
            (Date.now() - this.startTime) / 1000
        );
    }

    restartGame() {

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

        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        // Xóa piece cuối cùng khỏi màn hình
        this.model.current = null;
        this.view.render(this.model);

        this._updateHighScore();

        // ===== GAME OVER IMPROVEMENT =====
        // Hiển thị đầy đủ thống kê khi Game Over:
        // - Điểm số
        // - High Score
        // - Level cao nhất đạt được
        // - Số dòng đã clear
        // - Thời gian chơi
        // - Có phá kỷ lục hay không
        this.view.showGameOver({
            score: this.model.score,
            hi: this.hi,
            level: this.model.level,
            lines: this.model.lines,
            playTime: this.getPlayTimeSeconds(),
            newRecord: this.newRecord
        });
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

    // ==================================================
    // GAME OVER
    // ==================================================

    _checkGameOver() {

        if (this.gameOverHandled) return;

        if (this.model.gameOver) {

            this.gameOverHandled = true;

            this.handleGameOver();
        }
    }

    async handleGameOver() {

        console.log("GAME OVER FUNCTION RUNNING");

        try {

            // ===== GAME OVER IMPROVEMENT =====
            // Lưu thống kê trận chơi xuống database:
            // - score
            // - level đạt được
            // - số dòng clear
            // - thời gian chơi
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

                        // UC-07
                        // Tổng số dòng đã clear trong trận
                        linesCleared: this.model.lines,

                        // Thời gian chơi (giây)
                        playTimeSeconds: this.getPlayTimeSeconds()
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

        if (this.model.score > this.hi) {

            this.hi = this.model.score;

            localStorage.setItem('tetris_hi', this.hi);

            this.newRecord = true;
        }
    }

    // ==================================================
    // INPUT HANDLER
    // ==================================================

    _onKey(e) {

        // ===== GAME OVER IMPROVEMENT =====
        // Cho phép người chơi nhấn Enter để chơi lại
        // thay vì phải bấm nút Restart bằng chuột
        if (this.state === 'over') {

            if (e.code === 'Enter') {
                this.restartGame();
            }

            return;
        }

        if (this.state !== 'playing') {

            if (e.code === 'KeyP' && this.state === 'paused') {
                this.resume();
            }

            return;
        }

        const m = this.model;

        switch (e.code) {

            case 'ArrowLeft':
                m.moveLeft();
                break;

            case 'ArrowRight':
                m.moveRight();
                break;

            case 'ArrowDown':
                m.softDrop();
                this._dropAcc = 0;
                break;

            case 'ArrowUp':
            case 'KeyZ':
                m.rotate(1);
                break;

            case 'KeyX':
                m.rotate(-1);
                break;

            case 'Space':
                m.hardDrop();
                break;

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

    // ==================================================
    // GAME LOOP
    // ==================================================

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

            if (!this.model._collides(this.model.current, 0, 1)) {

                this.model.current.y++;

            } else {

                // ==================================================
                // UC-07 CLEAR LINE
                // ==================================================
                // Khi khối chạm đáy hoặc chạm khối khác:
                // 1. Khóa khối vào board
                // 2. Kiểm tra các hàng đầy
                // 3. Xóa hàng đầy
                // 4. Cộng điểm
                // 5. Cập nhật tổng số dòng đã clear
                // 6. Tăng level nếu đủ điều kiện
                //
                // Các xử lý này được thực hiện bên trong
                // GameModel._lockPiece()
                this.model._lockPiece();

                if (this.model.level !== prevLevel) {
                    leveledUp = true;
                }
            }

            this._checkGameOver();
        }

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

    // ==================================================
    // VIEW SYNC
    // ==================================================

    _syncView() {

        this.view.render(this.model);

        this.view.renderNext(this.model.next);

        this.view.updateHUD(this.model, this.hi);
    }
}