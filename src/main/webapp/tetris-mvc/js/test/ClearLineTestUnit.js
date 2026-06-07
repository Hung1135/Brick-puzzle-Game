/**
 * 🧪 UC-07: UNIT TEST CHO HÀM CLEAR LINE & CẬP NHẬT THÀNH TÍCH
 * * Đối tượng kiểm thử chính: Lớp GameModel (GameModel.js)
 * Tiêu chuẩn: Cô lập đơn vị (Isolated Unit Testing), Mocking State, Kiểm tra dữ liệu biên.
 * * Chạy test: node gameModel.test.js
 */

import GameModel from "./GameModel.js";

// ==================================================
// MINI UNIT TEST FRAMEWORK (Giữ độc lập, không cần cài npm)
// ==================================================
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ [PASSED]: ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ [FAILED]: ${name}`);
        console.log(`     → Lỗi thực tế: ${e.message}`);
        failed++;
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Mong đợi [${expected}], nhưng thực tế nhận [${actual}]`);
            }
        },
        toEqual(expected) {
            const a = JSON.stringify(actual);
            const b = JSON.stringify(expected);
            if (a !== b) {
                throw new Error(`Mong đợi ma trận \n${b}\nnhưng thực tế nhận \n${a}`);
            }
        }
    };
}

// Các hằng số bổ trợ cho việc giả lập (Mocking) dữ liệu lưới
const COLS = 10;
const ROWS = 20;

function helperFillRow(model, rowIndex) {
    model.board[rowIndex] = Array(COLS).fill("red");
}

function helperFillPartial(model, rowIndex, filledCols = 5) {
    for (let c = 0; c < filledCols; c++) {
        model.board[rowIndex][c] = "blue";
    }
}

// ==================================================
// BẮT ĐẦU CHẠY CÁC TẬP UNIT TEST CHUYÊN BIỆT
// ==================================================

console.log("\n=======================================================");
console.log("🚀 CHƯƠNG TRÌNH UNIT TEST CHỨC NĂNG UC-07 (TETRIS MVC)");
console.log("=======================================================");

// ──────────────────────────────────────────────────
// TẬP UNIT TEST 1: KIỂM THỬ PHƯƠNG THỨC _clearLines()
// ──────────────────────────────────────────────────
console.log("\n1️⃣ UNIT TEST: Phương thức xử lý mảng _clearLines()");

test("Xóa chính xác 1 dòng đầy ở đáy và tịnh tiến hàng rỗng lên đỉnh", () => {
    const model = new GameModel(); // Khởi tạo instance từ production code

    // Khởi lập điều kiện biên: duy nhất hàng đáy đầy
    helperFillRow(model, ROWS - 1);

    // Thực thi hàm cần test
    const rowsCleared = model._clearLines();

    // Kiểm tra đầu ra (Output)
    expect(rowsCleared).toBe(1);
    // Kiểm tra hàng đỉnh (board[0]) phải được chèn mảng rỗng null
    expect(model.board[0].every(cell => cell === null)).toBe(true);
});

test("Xóa đồng thời liên tiếp 4 dòng (Kịch bản Tetris)", () => {
    const model = new GameModel();

    // Làm đầy 4 hàng cuối cùng từ hàng 16 đến 19
    helperFillRow(model, ROWS - 1);
    helperFillRow(model, ROWS - 2);
    helperFillRow(model, ROWS - 3);
    helperFillRow(model, ROWS - 4);

    const rowsCleared = model._clearLines();

    expect(rowsCleared).toBe(4);
    // 4 hàng đầu tiên sau dịch chuyển (0, 1, 2, 3) bắt buộc phải trống hoàn toàn
    for (let r = 0; r < 4; r++) {
        expect(model.board[r].every(cell => cell === null)).toBe(true);
    }
});

test("Không thực hiện xóa nếu hàng chưa được lấp đầy hoàn toàn", () => {
    const model = new GameModel();

    // Chỉ lấp đầy 9/10 ô của hàng đáy
    helperFillPartial(model, ROWS - 1, 9);

    const rowsCleared = model._clearLines();

    expect(rowsCleared).toBe(0); // Không có dòng nào bị xóa
});


// ──────────────────────────────────────────────────
// TẬP UNIT TEST 2: KIỂM THỬ PHƯƠNG THỨC _updatePerformanceAndScore()
// ──────────────────────────────────────────────────
console.log("\n2️⃣ UNIT TEST: Công thức tính toán điểm số & Combo (_updatePerformanceAndScore)");

test("Tích lũy điểm cơ bản khi xóa dòng đơn tại Level 1", () => {
    const model = new GameModel();
    model.score = 0;
    model.level = 1;
    model.combo = 0;

    // Giả lập đưa gạch vào để tránh Perfect Clear kích hoạt sai lệch điểm
    helperFillPartial(model, 5, 2);

    // Thực thi giả lập hệ thống nhận diện xóa được 1 dòng
    model._updatePerformanceAndScore(1);

    expect(model.score).toBe(100); // 1 dòng = 100 điểm * level 1
    expect(model.combo).toBe(1);   // Chuỗi combo tăng lên 1
});

test("Cộng điểm thưởng Combo từ lượt xóa liên tiếp thứ hai trở đi", () => {
    const model = new GameModel();
    model.score = 100;
    model.level = 1;
    model.combo = 1; // Giả lập lượt trước đã xóa dòng thành công
    helperFillPartial(model, 5, 2);

    model._updatePerformanceAndScore(1);

    expect(model.combo).toBe(2);
    // Điểm mới = 100 (cũ) + [100 (gốc) * 1 (level)] + [(2 - 1) * 50 * 1 (level)] = 250
    expect(model.score).toBe(250);
});

test("AF 7.2.3: Đứt chuỗi Combo thiết lập lại bằng 0 nếu tham số dòng xóa bằng 0", () => {
    const model = new GameModel();
    model.score = 500;
    model.combo = 4; // Người chơi đang giữ chuỗi combo lớn

    model._updatePerformanceAndScore(0); // Lượt này không ăn được dòng nào

    expect(model.combo).toBe(0);         // Chuỗi combo lập tức gãy về 0
    expect(model.score).toBe(500);       // Điểm cũ giữ nguyên không đổi
});

test("Tính toán hệ số điểm nhân theo Level của người chơi", () => {
    const model = new GameModel();
    model.score = 0;
    model.level = 3; // Giả lập người chơi đang ở Cấp độ 3
    model.combo = 1;
    helperFillPartial(model, 5, 2);

    model._updatePerformanceAndScore(1);

    // Điểm tăng thêm = Cơ bản (100 * cấp 3) + Thưởng Combo [(2 - 1) * 50 * cấp 3] = 300 + 150 = 450
    expect(model.score).toBe(450);
});


// ──────────────────────────────────────────────────
// TẬP UNIT TEST 3: KIỂM THỬ ĐIỀU KIỆN BIÊN ĐẶC BIỆT
// ──────────────────────────────────────────────────
console.log("\n3️⃣ UNIT TEST: Các điều kiện biên đặc biệt (Perfect Clear & Game Over)");

test("Kích hoạt thành công điểm thưởng Perfect Clear khi board trống hoàn toàn", () => {
    const model = new GameModel();
    model.score = 0;
    model.level = 1;
    model.combo = 0;

    // Đảm bảo board trống hoàn toàn để _isPerfectClear() trả về true
    model.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    model._updatePerformanceAndScore(4); // Xóa sạch bảng chơi bằng cú Tetris

    // Tổng điểm = Cơ bản (800) + Thưởng Perfect Clear (2000) = 2800
    expect(model.score).toBe(2800);
});

test("AF 7.1.0: Kích hoạt Game Over khi cố định khối gạch vượt biên trên màn hình (ny < 0)", () => {
    const model = new GameModel();
    model.gameOver = false;

    // Giả lập khối gạch bị đẩy nhô cao vượt đỉnh của lưới chơi (Tọa độ y âm)
    model.current = {
        shape: [[1, 1], [1, 1]],
        x: 4,
        y: -1, // Tọa độ y đỉnh âm
        color: "yellow"
    };

    // Thực thi hàm lock gạch của Production code
    model._lockPiece();

    expect(model.gameOver).toBe(true); // Hệ thống bắt buộc phải chuyển sang Game Over
});

// ==================================================
// TỔNG HỢP KẾT QUẢ BÁO CÁO
// ==================================================
console.log("\n=======================================================");
console.log(`📊 KẾT QUẢ SƠ KẾT UNIT TEST: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
    process.exit(1);
}