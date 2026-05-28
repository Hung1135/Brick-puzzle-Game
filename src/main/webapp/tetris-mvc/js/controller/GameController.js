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



}