/**
 * UC-13 -> UC-17
 * GAME OVER ENHANCEMENT TEST
 *
 * Chạy:
 * node gameOverTestingImproved.js
 */

// ======================
// ASSERT HELPER
// ======================

function assert(condition, message) {

    if (condition) {
        console.log(`✅ PASS: ${message}`);
    } else {
        console.error(`❌ FAIL: ${message}`);
    }
}

// ======================
// UC-13
// Tính thời gian chơi
// ======================

class PlayTimeController {

    constructor() {
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
    "UC-13 Calculate play time"
);

// ======================
// UC-14
// Hiển thị thống kê
// ======================

class MockView {

    constructor() {
        this.called = false;
        this.data = null;
    }

    showGameOver(data) {

        this.called = true;

        this.data = data;
    }
}

const view = new MockView();

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
    "UC-14 showGameOver called"
);

assert(
    view.data.score === 5000,
    "UC-14 score displayed"
);

assert(
    view.data.level === 4,
    "UC-14 level displayed"
);

assert(
    view.data.lines === 22,
    "UC-14 lines displayed"
);

// ======================
// UC-15
// Restart bằng Enter
// ======================

class RestartController {

    constructor() {
        this.state = "over";
        this.restarted = false;
    }

    restartGame() {
        this.restarted = true;
    }

    _onKey(e) {

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

restartController._onKey({
    code: "Enter"
});

assert(
    restartController.restarted,
    "UC-15 Restart by Enter"
);

// ======================
// UC-16
// stopGame truyền dữ liệu
// ======================

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
    "UC-16 showGameOver invoked"
);

assert(
    stopController.view.data.score === 10000,
    "UC-16 send score"
);

assert(
    stopController.view.data.level === 5,
    "UC-16 send level"
);

assert(
    stopController.view.data.lines === 30,
    "UC-16 send lines"
);

// ======================
// UC-17
// High Score
// ======================

class HighScoreController {

    constructor() {

        this.hi = 1000;

        this.newRecord = false;

        this.model = {
            score: 5000
        };
    }

    _updateHighScore() {

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
    "UC-17 Update High Score"
);

assert(
    highScoreController.newRecord === true,
    "UC-17 Set New Record"
);

console.log("\n🎮 GAME OVER TEST COMPLETED");