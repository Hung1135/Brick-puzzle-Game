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

        // 11.0. Hệ thống xử lý thao tác điều khiển từ người chơi.


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

        // 14.4. Hệ thống hiển thị các nút thao tác tiếp theo như Restart hoặc Home

        // (Lắng nghe sự kiện)

        if (restartBtn) {
            restartBtn.onclick = () => this.restartGame();

        }

        // 14.4. Hệ thống hiển thị các nút thao tác tiếp theo như Restart hoặc Home

        // (Lắng nghe sự kiện)

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
        // 11.0. Hệ thống đang thực hiện vòng lặp trò chơi


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

        // 12.1. Hệ thống kiểm tra trạng thái hiện tại của trò chơi.

        if (this.state === 'over') return;

        // 11.5. Hệ thống chuyển trò chơi sang trạng thái kết thúc.

        // 12.2. Hệ thống chuyển trạng thái trò chơi sang kết thúc.

        this.state = 'over';

        // 11.6. Hệ thống dừng vòng lặp cập nhật trò chơi.

        // 12.3. Hệ thống hủy vòng lặp cập nhật cấu hình hiện tại.

        // 12.4. Hệ thống ngăn trò chơi tiếp tục cập nhật dữ liệu và render (hủy loop).

        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        // Xóa piece hiện tại khỏi màn hình
        this.model.current = null;
        this.view.render(this.model);

        // 11.7. Hệ thống kiểm tra và cập nhật điểm cao nhất nếu người chơi đạt kỷ lục mới.

        this._updateHighScore();

        // 11.9. Hệ thống hiển thị màn hình Game Over bao gồm: điểm hiện tại, điểm cao nhất, trạng thái kỷ lục mới...


        // 14.0. Hệ thống nhận yêu cầu hiển thị màn hình Game Over.

        // 14.1. Hệ thống hiển thị điểm số hiện tại của người chơi.

        // 14.2. Hệ thống hiển thị điểm cao nhất.

        // 14.3. Hệ thống hiển thị trạng thái kỷ lục mới nếu có.

        // 14.4. Hệ thống hiển thị các nút thao tác tiếp theo như Restart hoặc Home.

        this.view.showGameOver(
            this.model.score,
            this.hi,
            this.newRecord
        );


        // 12.5. Use case UC-12 kết thúc.


        // 14.5. Use case UC-14 kết thúc.


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

        // Tránh xử lý trùng lặp khi Game Over đã được kích hoạt

        if (this.gameOverHandled) return;

        // 11.4. Trigger / Hệ thống nhận diện khu vực spawn block đã bị chiếm chỗ và không thể tạo block mới (Thông qua model.gameOver).

        if (this.model.gameOver) {

            // Đánh dấu đã xử lý để tránh gọi nhiều lần
            this.gameOverHandled = true;

            // Tiến hành kích hoạt chuỗi xử lý kết thúc game
            this.handleGameOver();

        }

        // 11A.1 — Alternative Flow: Nếu khu vực spawn vẫn còn hợp lệ -> Trò chơi tiếp tục hoạt động bình thường.

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
  // ─────────────────────────────
  // COLLISION
  // ─────────────────────────────
  _collides(piece, dx, dy, shape) {
    const s = shape || piece.shape;

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
}