/* eslint-disable no-unused-vars */
// ======================================================
// UC-12: Stop Game Loop Testing
// Mô phỏng Controller tối giản để kiểm thử việc
// dừng vòng lặp game khi Game Over.
// ======================================================

class SimpleModel {

    constructor() {
        this.reset();
    }

    reset() {

        // Tạo board 20x10
        this.board = Array.from(
            { length: 20 },
            () => Array(10).fill(null)
        );

        // Trạng thái game
        this.gameOver = false;

        // Điểm số
        this.score = 0;
    }

    // Trả về trạng thái Game Over
    isGameOver() {
        return !!this.gameOver;
    }
}

class MockView {

    constructor() {
        this._reset();
    }

    _reset() {

        // Số lần render được gọi
        this.rendered = 0;

        // Cờ hiển thị Game Over
        this.gameOverShown = false;
    }

    // Giả lập render màn hình game
    render() {
        this.rendered++;
    }

    hideAll() {
        // Mock function
    }

    // Giả lập hiển thị màn hình Game Over
    showGameOver() {
        this.gameOverShown = true;
    }
}

function makeController() {

    const model = new SimpleModel();
    const view = new MockView();

    return {

        model,
        view,

        // start | playing | over
        state: 'start',

        // ID của requestAnimationFrame
        _rafId: null,

        // ==================================================
        // Bắt đầu Game Loop
        // ==================================================
        startLoop() {

            // Không cho chạy nhiều loop cùng lúc
            if (this.state === 'playing') return;

            this.state = 'playing';

            view.hideAll();

            const tick = () => {

                // Nếu không còn ở trạng thái playing
                // thì dừng render
                if (this.state !== 'playing') {
                    return;
                }

                // Render frame mới
                view.render();

                // Tiếp tục vòng lặp game
                this._rafId =
                    requestAnimationFrame(tick);
            };

            // Khởi động game loop
            this._rafId =
                requestAnimationFrame(tick);
        },

        // ==================================================
        // UC-12: Stop Game Loop
        // ==================================================
        // Chức năng:
        // 1. Chuyển trạng thái sang over
        // 2. Hủy requestAnimationFrame
        // 3. Giải phóng _rafId
        // 4. Hiển thị màn hình Game Over
        //
        // Kết quả mong đợi:
        // - Không còn render frame mới
        // - Game loop dừng hoàn toàn
        // ==================================================
        stopGameLoop() {

            if (this.state === 'over') {
                return;
            }

            // Chuyển sang trạng thái Game Over
            this.state = 'over';

            // Hủy vòng lặp animation
            if (this._rafId != null) {
                cancelAnimationFrame(this._rafId);
            }

            // Xóa ID animation
            this._rafId = null;

            // Hiển thị Game Over
            view.showGameOver();
        }
    };
}

module.exports = makeController;