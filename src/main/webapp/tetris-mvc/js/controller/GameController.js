import GameModel from "../model/GameModel.js";
import GameView from "../view/GameView.js";
import { DAS, ARR, LOCK_DELAY } from "../constants.js";

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

        // DAS / ARR
        this._heldDir = null;
        this._dasTimer = 0;
        this._arrTimer = 0;

        // LOCK DELAY
        this._lockTimer = 0;
        this._lockResets = 0;
        this._isLocking = false;

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

    // ==================================================
    // GAME FLOW
    // ==================================================

    // startGame() {
    //
    //     if (this.state === 'playing') return;
    //
    //     // UC-03 Step 1.1: Người chơi nhấn nút Start → hệ thống nhận yêu cầu bắt đầu trò chơi
    //     // (trigger đến từ button onclick hoặc restartGame() - đã xử lý ở _bindInputs)
    //
    //     // UC-03 Step 1.2: Khởi tạo bảng game với lưới ô trống
    //     // UC-03 Step 1.3: Sinh block đầu tiên và đặt tại vị trí spawn
    //     // (model.reset() thực hiện cả hai: reset board + _spawnPiece)
    //     this.model.reset();
    //
    //     // Kiểm tra sau reset: board phải hợp lệ và current piece phải tồn tại
    //     if (!this.model.current) {
    //         console.error("[UC-03] Spawn thất bại: không có current piece sau reset.");
    //         return;
    //     }
    //
    //     // UC-03 Step 1.4: Chuyển trạng thái game sang running
    //     this.state = 'playing';
    //
    //     this.gameOverHandled = false;
    //     this.newRecord = false;
    //
    //     // Reset lock delay state
    //     this._lockTimer = 0;
    //     this._lockResets = 0;
    //     this._isLocking = false;
    //
    //     // UC-03 Step 1.5: Hiển thị bảng game và block đầu tiên
    //     this.view.hideAll();
    //     this._syncView();
    //
    //     // UC-03 Step 1.6: Bắt đầu vòng lặp game, block tự động rơi theo tốc độ mặc định
    //     this._dropAcc = 0;
    //     this._lastTick = performance.now();
    //
    //     if (this._rafId) {
    //         cancelAnimationFrame(this._rafId);
    //     }
    //
    //     this._loop(this._lastTick);
    //
    //     // ===== GAME OVER IMPROVEMENT =====
    //     // Ghi nhận thời điểm bắt đầu game
    //     // Dùng để tính tổng thời gian chơi khi game kết thúc
    //     this.startTime = Date.now();
    // }
    // =========================================================================
    // MAIN FLOW: START GAME LOOP & STATE TRANSITION
    // IMPLEMENTS UC-03 - START GAME (Nâng cấp toàn diện theo đặc tả hệ thống)
    // =========================================================================
    startGame() {
        // ── [RÀNG BUỘC BẢO VỆ]: Không cho phép khởi chạy đè khi ván chơi đang diễn ra ──
        if (this.state === 'playing') {
            console.warn("[UC-03] Trò chơi đang trong trạng thái running. Bỏ qua yêu cầu Start.");
            return;
        }

        console.log("[UC-03] Step 1.1: Hệ thống tiếp nhận yêu cầu bắt đầu trò chơi.");

        // ── [ĐẢM BẢO AN TOÀN VÒNG LẶP]: Triệt tiêu triệt để hiện tượng trùng lặp luồng Animation Frame ──
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        // ── [XỬ LÝ DỮ LIỆU - UC-03 Step 1.2 & 1.3]: Khởi tạo ma trận trống & Sinh block đầu tiên ──
        try {
            // Khởi tạo lại Board (ROWS x COLS), reset điểm, lines, cấp độ và chuỗi Combo = 0
            this.model.reset();
        } catch (error) {
            console.error("[UC-03] Lỗi nghiêm trọng khi khởi tạo dữ liệu trong GameModel:", error);
            return;
        }

        // Kiểm tra tính toàn vẹn của dữ liệu sau khi reset
        if (!this.model.current || !this.model.next) {
            console.error("[UC-03] Lỗi nghiệp vụ: Không tìm thấy mảnh gạch (current/next piece) sau khi reset Model.");
            return;
        }

        console.log("[UC-03] Step 1.2 & 1.3: Đã khởi tạo bảng lưới ô trống và chuẩn bị sẵn khối gạch ngẫu nhiên.");

        // ── [QUẢN LÝ TRẠNG THÁI - UC-03 Step 1.4]: Chuyển đổi trạng thái hệ thống ──
        this.state = 'playing';
        this.gameOverHandled = false;
        this.newRecord = false;

        // Reset toàn bộ trạng thái Lock Delay & Mảng điều hướng (DAS/ARR) cho lượt chơi mới
        this._isLocking = false;
        this._lockTimer = 0;
        this._lockResets = 0;
        this._heldDir = null;
        this._dasTimer = 0;
        this._arrTimer = 0;

        console.log("[UC-03] Step 1.4: Hệ thống chuyển trạng thái game sang running thành công.");

        // ── [ĐỒNG BỘ GIAO DIỆN - UC-03 Step 1.5]: Ẩn màn hình chờ, kết xuất đồ họa khối gạch đầu tiên ──
        this.view.hideAll();
        this._syncView(); // Đồng bộ bàn cờ canvas, mảnh tiếp theo, cập nhật điểm và reset Combo hiển thị trên HUD

        console.log("[UC-03] Step 1.5: Ẩn các màn hình che, hiển thị bảng chơi và khối gạch đầu tiên.");

        // ── [KÍCH HOẠT VÒNG LẶP - UC-03 Step 1.6]: Bật tiến trình rơi tự động dựa trên đồng hồ hệ thống ──
        this._dropAcc = 0;
        this._lastTick = performance.now(); // Đồng bộ thời gian thực cho cơ chế tính khoảng delta-time (dt)

        // Ghi nhận mốc thời gian Unix chính xác để tính tổng playTimeSeconds khi kết thúc trận
        this.startTime = Date.now();

        // Kích hoạt chu trình lặp chính (Game Loop) thông qua RequestAnimationFrame an toàn
        this._rafId = requestAnimationFrame(timestamp => this._loop(timestamp));

        console.log("[UC-03] Step 1.6: Vòng lặp game bắt đầu — khối gạch tự động rơi theo tốc độ mặc định của Level 1.");
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
    // GAME OVER (ALTERNATIVE FLOW - 7.1.2 / 7.5.2)
    // ─────────────────────────────

    _checkGameOver() {

        if (this.gameOverHandled) return;

        if (this.model.gameOver) {

            this.gameOverHandled = true;
            // 🔴 [ALTERNATIVE FLOW - 7.1.2 / 7.5.2]: Chuyển quyền xử lý sang Use Case Game Over
            console.log("[AF-7.1.2 / 7.5.2] Ngăn mọi thao tác điều khiển, chuyển sang xử lý Game Over.");
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
                    headers: { "Content-Type": "application/json" },
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

    _resetLockDelay() {
        if (this._isLocking && this._lockResets < 15) {
            this._lockTimer = 0;
            this._lockResets++;
        }
    }

    // ─────────────────────────────
    // ==================================================
    // INPUT HANDLER
    // ==================================================

    _onKey(e) {

        // ===== GAME OVER IMPROVEMENT =====
        // Cho phép người chơi nhấn Enter để chơi lại
        // thay vì phải bấm nút Restart bằng chuột
        if (this.state === 'over') {
            if (e.code === 'Enter') this.restartGame();
            return;
        }

        if (this.state !== 'playing') {
            if (e.code === 'KeyP' && this.state === 'paused') this.resume();
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
                    this._resetLockDelay();
                }
                break;

            case 'ArrowRight':
            case 'KeyD':
                if (this._heldDir !== 'right') {
                    this._heldDir = 'right';
                    this._dasTimer = 0;
                    this._arrTimer = 0;
                    m.moveRight();
                    this._resetLockDelay();
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
                this._resetLockDelay();
                break;

            case 'KeyX':
                m.rotate(-1);
                this._resetLockDelay();
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

        // DAS / ARR Logic
        if (this._heldDir) {
            this._dasTimer += dt;
            if (this._dasTimer >= DAS) {
                this._arrTimer += dt;
                if (this._arrTimer >= ARR) {

                    this._arrTimer = 0;

                    if (this._heldDir === 'left')  { this.model.moveLeft();  this._resetLockDelay(); }
                    if (this._heldDir === 'right') { this.model.moveRight(); this._resetLockDelay(); }

                    this._checkGameOver();
                    this._syncView();
                }
            }
        }

        this._dropAcc += dt;
        const speed = this.model.getDropSpeed();

        let leveledUp = false;

        // DROP + LOCK DELAY
        if (this._dropAcc >= speed) {

            this._dropAcc -= speed;

            // 🔴 [MAIN FLOW - 7.0]: Kiểm tra khối gạch hiện hành va chạm với đáy hoặc khối cố định bên dưới (Điểm kích hoạt)
            if (!this.model._collides(this.model.current, 0, 1)) {

                // Block còn rơi được → rơi bình thường, tắt lock delay
                this.model.current.y++;
                this._isLocking = false;
                this._lockTimer = 0;
                this._lockResets = 0;

            } else {
                console.log("[MAIN FLOW - 7.0] Điểm kích hoạt: Khối gạch chạm đáy/va chạm vật cản bên dưới.");
                this._isLocking = true;
            }

            this._checkGameOver();
        }

        // Đếm lock delay timer và xử lý cố định mảnh gạch
        if (this._isLocking) {

            this._lockTimer += dt;

            if (this._lockTimer >= LOCK_DELAY) {
                const prevLevel = this.model.level;

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

                this._isLocking = false;
                this._lockTimer = 0;
                this._lockResets = 0;

                if (this.model.level !== prevLevel) {
                    leveledUp = true;
                }
            }

                // Kiểm tra trạng thái trò chơi kết thúc sau khi khóa hoặc sinh mảnh mới
                this._checkGameOver();


        }

        if (leveledUp) {
            this.view.flashLevelUp();
        }

        // 🔴 [MAIN FLOW - 7.6]: Hệ thống đồng bộ mọi thay đổi lên giao diện (bao gồm điểm, combo, cấp độ,...)
        this._syncView();

        // 🔴 [MAIN FLOW - 7.7]: Use Case kết thúc một chu kỳ lặp an toàn nếu trạng thái vẫn đang chơi
        if (this.state === 'playing') {
            this._rafId = requestAnimationFrame(ts => this._loop(ts));
        } else {
            console.log("[MAIN FLOW - 7.7] Use Case kết thúc vòng lặp (Trạng thái game đổi hoặc Kết thúc game).");
        }
    }

    // ─────────────────────────────
    // VIEW SYNC (MAIN FLOW - 7.6)
    // ─────────────────────────────

    _syncView() {

        this.view.render(this.model);

        this.view.renderNext(this.model.next);

        // UI HUD cập nhật sẽ nhận cả thông tin Combo mới từ model
        this.view.updateHUD(this.model, this.hi);
    }
}