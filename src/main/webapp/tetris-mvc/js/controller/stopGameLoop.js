/* eslint-disable no-unused-vars */
// Module cung cấp makeController() cho UC-12 stopGameLoop

class SimpleModel {
    constructor() { this.reset(); }
    reset() { this.board = Array.from({ length: 20 }, () => Array(10).fill(null)); this.gameOver = false; this.score = 0; }
    // accessor to reference gameOver within this module (silence unused-definition warning)
    isGameOver() { return !!this.gameOver; }
}

class MockView {
    constructor() { this._reset(); }
    _reset() { this.rendered = 0; this.gameOverShown = false; }
    render() { this.rendered++; }
    hideAll() { /* intentionally minimal */ }
    showGameOver() { this.gameOverShown = true; }
}

function makeController() {
    const model = new SimpleModel();
    const view = new MockView();
    return {
        model,
        view,
        state: 'start',
        _rafId: null,

        startLoop() {
            if (this.state === 'playing') return;
            this.state = 'playing';
            view.hideAll();
            const tick = () => {
                if (this.state !== 'playing') return;
                view.render();
                this._rafId = requestAnimationFrame(tick);
            };
            this._rafId = requestAnimationFrame(tick);
        },

        stopGameLoop() {
            if (this.state === 'over') return;
            this.state = 'over';
            if (this._rafId != null) cancelAnimationFrame(this._rafId);
            this._rafId = null;
            view.showGameOver();
        }
    };
}

module.exports = makeController;
