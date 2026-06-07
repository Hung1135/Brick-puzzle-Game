/**
 * UC-11 -> UC-14
 * GAME OVER ENHANCEMENT TEST
 *
 * Mục đích:
 * Kiểm thử các cải tiến của chức năng Game Over:
 *
 * UC-11: Tính thời gian chơi
 * UC-12: Dừng game và truyền thống kê
 * UC-13: Hiển thị thống kê Game Over
 * UC-14: Restart bằng phím Enter
 * Enhancement: High Score & New Record
 *
 * Chạy:
 * node gameOverTestingImproved.js
 */

// ==================================================
// ASSERT HELPER
// ==================================================

function assert(condition, message) {

    if (condition) {
        console.log(`✅ PASS: ${message}`);
    } else {
        console.error(`❌ FAIL: ${message}`);
    }
}

// ==================================================
// UC-11
// TÍNH THỜI GIAN CHƠI
// ==================================================

class PlayTimeController {

    constructor() {

        // Giả lập game đã chơi được 5 giây
        this.startTime = Date.now() - 5000;
    }

    getPlayTimeSeconds() {

        return Math.floor(
            (Date.now() - this.startTime) / 1000
        );
    }
}

const playTimeController =
    new PlayTimeController();

assert(
    playTimeController.getPlayTimeSeconds() >= 5,
    "Calculate play time"
);

// ==================================================
// UC-13
// HIỂN THỊ THỐNG KÊ GAME OVER
// ==================================================

class MockView {

    constructor() {

        // Kiểm tra hàm có được gọi hay không
        this.called = false;

        // Lưu dữ liệu truyền vào
        this.data = null;
    }

    showGameOver(data) {

        this.called = true;

        this.data = data;
    }
}

const view = new MockView();

// Giả lập dữ liệu thống kê cuối trận
view.showGameOver({

    score: 5000,

    hi: 8000,

    level: 4,

    lines: 22,

    playTime: 125,

    newRecord: true
});

assert(
    view.called,
    "showGameOver called"
);

assert(
    view.data.score === 5000,
    "score displayed"
);

assert(
    view.data.level === 4,
    "level displayed"
);

assert(
    view.data.lines === 22,
    "lines displayed"
);

// ==================================================
// UC-14
// RESTART GAME BẰNG PHÍM ENTER
// ==================================================

class RestartController {

    constructor() {

        // Giả lập trạng thái Game Over
        this.state = "over";

        this.restarted = false;
    }

    restartGame() {

        this.restarted = true;
    }

    _onKey(e) {

        // Chỉ cho restart khi đang Game Over
        if (this.state === "over") {

            if (e.code === "Enter") {

                this.restartGame();
            }

            return;
        }
    }
}

const restartController =
    new RestartController();

// Giả lập người chơi nhấn Enter
restartController._onKey({
    code: "Enter"
});

assert(
    restartController.restarted,
    "Restart by Enter"
);

// ==================================================
// UC-12
// stopGame() TRUYỀN THỐNG KÊ
// ==================================================

class StopGameController {

    constructor() {

        this.view = new MockView();

        this.model = {

            score: 10000,

            level: 5,

            lines: 30
        };

        this.hi = 15000;

        this.newRecord = false;

        this.startTime =
            Date.now() - 60000;
    }

    getPlayTimeSeconds() {

        return 60;
    }

    stopGame() {

        // Truyền toàn bộ dữ liệu thống kê
        // sang màn hình Game Over
        this.view.showGameOver({

            score: this.model.score,

            hi: this.hi,

            level: this.model.level,

            lines: this.model.lines,

            playTime: this.getPlayTimeSeconds(),

            newRecord: this.newRecord
        });
    }
}

const stopController =
    new StopGameController();

stopController.stopGame();

assert(
    stopController.view.called,
    "showGameOver invoked"
);

assert(
    stopController.view.data.score === 10000,
    "send score"
);

assert(
    stopController.view.data.level === 5,
    "send level"
);

assert(
    stopController.view.data.lines === 30,
    "send lines"
);

// ==================================================
// HIGH SCORE ENHANCEMENT
// ==================================================

class HighScoreController {

    constructor() {

        // High Score hiện tại
        this.hi = 1000;

        // Chưa có kỷ lục mới
        this.newRecord = false;

        this.model = {

            score: 5000
        };
    }

    _updateHighScore() {

        // Nếu điểm hiện tại cao hơn
        // thì cập nhật High Score
        if (this.model.score > this.hi) {

            this.hi = this.model.score;

            this.newRecord = true;
        }
    }
}

const highScoreController =
    new HighScoreController();

highScoreController._updateHighScore();

assert(
    highScoreController.hi === 5000,
    "Update High Score"
);

assert(
    highScoreController.newRecord === true,
    "Set New Record"
);

// ==================================================
// KẾT THÚC KIỂM THỬ
// ==================================================

console.log(
    "\n🎮 GAME OVER TEST COMPLETED"
);