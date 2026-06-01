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

    startGame() {
        // Main Flow: Start Game Loop & Transition to Playing
        // Implements UC_01 - START GAME

        // 1.1. Người chơi nhấn nút Start → hệ thống nhận yêu cầu bắt đầu trò chơi.
        if (this.state === 'playing') return;

        // 1.2. Khởi tạo bảng game với lưới ô trống.
        this.initGame();
        // 1.3. Sinh block đầu tiên và đặt tại vị trí spawn.
        this.model.generateFirstBlock();

        // 1.4. Chuyển trạng thái game sang running.
        this.setGameState('playing');
        // 1.5. Hiển thị bảng game và block đầu tiên.
        this.view.renderBoard(this.model);


    }

    initGame() {
        this.model.reset();
        this.view.hideAll();
        this._syncView();
    }


    setGameState(state) {
        this.state = state;
        this.gameOverHandled = false;
        this.newRecord = false;
    }



    stopGame() {
        // Main Flow: Stop Game Loop & Transition to Game Over
        if (this.state === 'over') return;
        // 12.2. Hệ thống chuyển trạng thái trò chơi sang kết thúc.
        this.state = 'over';

        // 12.3. Hệ thống hủy vòng lặp cập nhật khung hình hiện tại.
        if (this._rafId) cancelAnimationFrame(this._rafId);

        // 12.4. Hệ thống ngăn trò chơi tiếp tục cập nhật dữ liệu và render.
        // (Được thực hiện bởi hai hành động trên: state==='over' và cancelAnimationFrame)

        // 13.x: Xử lý bản ghi cao nhất (chi tiết ở _updateHighScore)
        // The detailed steps are implemented in _updateHighScore():
        //  - 13.0: lấy điểm hiện tại từ model
        //  - 13.1: so sánh với this.hi
        //  - 13.2: nếu lớn hơn -> cập nhật this.hi, localStorage, this.newRecord
        //  - 13.3: nếu không -> giữ nguyên (no write)
        this._updateHighScore();

        // 14.1. Hệ thống hiển thị màn Game Over với số điểm cuối cùng, điểm cao nhất và cờ kỷ lục mới.
        this.view.showGameOver(this.model.score, this.hi, this.newRecord);
    }
    _checkGameOver() {
        // 11.0. Trigger: Được gọi sau khi model thay đổi (lock/spawn hoặc sau input).
        // 11.1. Hệ thống kiểm tra cờ `model.gameOver`.

        if (this.model.gameOver) {
            // 11.2. Nếu true -> chuyển sang handler xử lý Game Over.
            this.handleGameOver();
        }
    }
    handleGameOver() {
        // Main Flow: Handle Game Over (delegates to stop)
        // Implements UC_11.3: Handler chuyển tiếp các bước dừng game và hiển thị.
        // 11.3. Handler: ủy quyền cho stopGame() để thực hiện các bước dừng game,
        //        cập nhật điểm cao và hiển thị giao diện Game Over.
        this.stopGame();
    }
    _updateHighScore() {
        // Main Flow: Update High Score when Game Over
        // 13.0. Hệ thống lấy điểm hiện tại của người chơi từ model: this.model.score
        // 13.1. Hệ thống so sánh điểm hiện tại với điểm cao nhất đã lưu (this.hi).
        if (this.model.score > this.hi) {
            // 13.2. Nếu điểm hiện tại lớn hơn điểm cao nhất đã lưu:
            //       - Cập nhật biến hi trong controller
            //       - Lưu điểm cao nhất mới vào localStorage
            //       - Đánh dấu newRecord = true để view có thể hiển thị badge
            this.hi = this.model.score;
            localStorage.setItem('tetris_hi', this.hi); // 13.2.2 Persist to storage
            this.newRecord = true; // 13.2.3 Mark new record
        }
        // 13.3. Nếu không có kỷ lục mới, không ghi vào localStorage và newRecord giữ false.
    }

    _onKey(e) {

        // Preconditions:
        // - Trò chơi phải đang ở trạng thái Playing.
        // - Người chơi thực hiện thao tác từ bàn phím.

        if (this.state !== 'playing') {

            // UC: Tiếp tục trò chơi
            // Nếu game đang Pause và người chơi nhấn P,
            // hệ thống chuyển trạng thái về Playing.
            if (e.code === 'KeyP' && this.state === 'paused') {
                this.resume();
            }

            return;
        }

        const m = this.model;

        switch (e.code) {

            // =====================================================
            // DI CHUYỂN BLOCK SANG TRÁI
            // =====================================================
            case 'ArrowLeft':

                // 1. Người chơi nhấn phím ←.
                // 2. Hệ thống xác định hướng di chuyển sang trái.
                // 3. Hệ thống kiểm tra va chạm với tường hoặc block khác.
                // 4. Nếu hợp lệ, cập nhật vị trí block sang trái 1 ô.
                // A1. Nếu có va chạm, giữ nguyên vị trí hiện tại.
                m.moveLeft();
                break;

            // =====================================================
            // DI CHUYỂN BLOCK SANG PHẢI
            // =====================================================
            case 'ArrowRight':

                // 1. Người chơi nhấn phím →.
                // 2. Hệ thống xác định hướng di chuyển sang phải.
                // 3. Hệ thống kiểm tra va chạm với tường hoặc block khác.
                // 4. Nếu hợp lệ, cập nhật vị trí block sang phải 1 ô.
                // A1. Nếu có va chạm, giữ nguyên vị trí hiện tại.
                m.moveRight();
                break;

            // =====================================================
            // SOFT DROP
            // =====================================================
            case 'ArrowDown':

                // 1. Người chơi nhấn phím ↓.
                // 2. Hệ thống tăng tốc độ rơi của block hiện tại.
                // 3. Hệ thống kiểm tra vị trí phía dưới.
                // 4. Nếu hợp lệ, block rơi xuống thêm 1 ô.
                // 5. Reset bộ đếm thời gian rơi tự động.
                m.softDrop();
                this._dropAcc = 0;
                break;

            // =====================================================
            // XOAY BLOCK THEO CHIỀU KIM ĐỒNG HỒ
            // =====================================================
            case 'ArrowUp':
            case 'KeyZ':

                // 1. Người chơi nhấn phím xoay.
                // 2. Hệ thống tính toán trạng thái xoay mới.
                // 3. Hệ thống kiểm tra va chạm sau khi xoay.
                // 4. Nếu hợp lệ, cập nhật hình dạng block.
                // A1. Nếu không hợp lệ, giữ nguyên trạng thái cũ.
                m.rotate(1);
                break;

            // =====================================================
            // XOAY BLOCK NGƯỢC CHIỀU KIM ĐỒNG HỒ
            // =====================================================
            case 'KeyX':

                // 1. Người chơi nhấn phím X.
                // 2. Hệ thống tính toán trạng thái xoay ngược.
                // 3. Hệ thống kiểm tra va chạm.
                // 4. Nếu hợp lệ, cập nhật hình dạng block.
                // A1. Nếu không hợp lệ, giữ nguyên trạng thái hiện tại.
                m.rotate(-1);
                break;

            // =====================================================
            // HARD DROP
            // =====================================================
            case 'Space':

                // 1. Người chơi nhấn phím Space.
                // 2. Hệ thống xác định vị trí thấp nhất có thể đặt block.
                // 3. Di chuyển block xuống vị trí đó ngay lập tức.
                // 4. Khóa block vào bảng chơi.
                // 5. Kiểm tra các hàng đầy.
                // 6. Xóa hàng (nếu có).
                // 7. Cập nhật điểm số.
                // 8. Sinh block mới.
                // A1. Nếu block mới không thể xuất hiện,
                //     hệ thống kích hoạt Game Over.
                m.hardDrop();
                break;

            // =====================================================
            // TẠM DỪNG TRÒ CHƠI
            // =====================================================
            case 'KeyP':

                // 1. Người chơi nhấn phím P.
                // 2. Hệ thống chuyển trạng thái game sang Paused.
                // 3. Tạm dừng cập nhật trò chơi.
                this.pause();
                break;

            default:
                return;
        }

        e.preventDefault();

        // Kiểm tra điều kiện Game Over sau khi thao tác.
        this._checkGameOver();

        // Postconditions:
        // - Trạng thái game được cập nhật theo thao tác.
        // - Màn hình được render lại phản ánh dữ liệu mới.
        this._syncView();
    }

}