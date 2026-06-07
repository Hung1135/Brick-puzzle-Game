import GameModel from "../model/GameModel.js";
import GameView from "../view/GameView.js";
import { DAS, ARR } from "../constants.js";
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
        this.startTime = null;

        // FIX GAME OVER MULTIPLE CALL
        this.gameOverHandled = false;
        this._heldDir = null;   // 'left' | 'right' | null
        this._dasTimer = 0;
        this._arrTimer = 0;

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

        document.addEventListener('keyup', e => {
            if (
                e.code === 'ArrowLeft' || e.code === 'KeyA' ||
                e.code === 'ArrowRight' || e.code === 'KeyD'
            ) {
                this._heldDir = null;
                this._dasTimer = 0;
                this._arrTimer = 0;
            }
        });

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
    // GAME FLOW
    // ─────────────────────────────

    // Main Flow: Start Game Loop & Transition to Playing
    // Implements UC-03 - START GAME
    startGame() {

        // Guard: không cho phép start khi đang chơi
        if (this.state === 'playing') return;

        // UC-03 Step 1.1: Người chơi nhấn nút Start → hệ thống nhận yêu cầu bắt đầu trò chơi
        // (trigger đến từ button onclick hoặc restartGame() - đã xử lý ở _bindInputs)

        // UC-03 Step 1.2: Khởi tạo bảng game với lưới ô trống
        // UC-03 Step 1.3: Sinh block đầu tiên và đặt tại vị trí spawn
        // (model.reset() thực hiện cả hai: reset board + _spawnPiece)
        this.model.reset();

        // Kiểm tra sau reset: board phải hợp lệ và current piece phải tồn tại
        if (!this.model.current) {
            console.error("[UC-03] Spawn thất bại: không có current piece sau reset.");
            return;
        }

        // UC-03 Step 1.4: Chuyển trạng thái game sang running
        this.state = 'playing';

        // Reset các flag liên quan
        this.gameOverHandled = false;
        this.newRecord = false;

        // UC-03 Step 1.5: Hiển thị bảng game và block đầu tiên
        this.view.hideAll();
        this._syncView();

        // UC-03 Step 1.6: Bắt đầu vòng lặp game, block tự động rơi theo tốc độ mặc định
        this._dropAcc = 0;
        this._lastTick = performance.now();

        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }

        this._loop(this._lastTick);
        this.startTime = Date.now();
    }
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

        // Xóa current piece để render lại board sạch (không còn gạch cuối)
        this.model.current = null;
        this.view.render(this.model);

        this._updateHighScore();
        //Vân Trường
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

    // ─────────────────────────────
    // GAME OVER
    // ─────────────────────────────

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

    // ─────────────────────────────
    // INPUT HANDLER
    // ─────────────────────────────

    _onKey(e) {
        //Vân Trường
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
            case 'KeyA':
                if (this._heldDir !== 'left') {
                    this._heldDir = 'left';
                    this._dasTimer = 0;
                    this._arrTimer = 0;
                    m.moveLeft();
                }
                break;

            case 'ArrowRight':
            case 'KeyD':
                if (this._heldDir !== 'right') {
                    this._heldDir = 'right';
                    this._dasTimer = 0;
                    this._arrTimer = 0;
                    m.moveRight();
                }
                break;

            case 'ArrowDown':
            case 'KeyS':
                m.softDrop();
                this._dropAcc = 0;
                break;

            case 'ArrowUp':
            case 'KeyZ':
            case 'KeyW':
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

    // ─────────────────────────────
    // GAME LOOP
    // ─────────────────────────────

    _loop(timestamp) {

        if (this.state !== 'playing') return;

        const dt = timestamp - this._lastTick;

        this._lastTick = timestamp;

        // ── DAS / ARR ──────────────────────────────────────────
        if (this._heldDir) {

            this._dasTimer += dt;

            if (this._dasTimer >= DAS) {

                this._arrTimer += dt;

                if (this._arrTimer >= ARR) {

                    this._arrTimer = 0;

                    if (this._heldDir === 'left')  this.model.moveLeft();
                    if (this._heldDir === 'right') this.model.moveRight();

                    this._checkGameOver();
                    this._syncView();
                }
            }
        }
        // ───────────────────────────────────────────────────────

        this._dropAcc += dt;

        const speed = this.model.getDropSpeed();

        let leveledUp = false;

        if (this._dropAcc >= speed) {

            this._dropAcc -= speed;

            const prevLevel = this.model.level;

            if (!this.model._collides(this.model.current, 0, 1)) {

                this.model.current.y++;

            } else {

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

    // ─────────────────────────────
    // VIEW SYNC
    // ─────────────────────────────

    _syncView() {

        this.view.render(this.model);

        this.view.renderNext(this.model.next);

        this.view.updateHUD(this.model, this.hi);
    }
}