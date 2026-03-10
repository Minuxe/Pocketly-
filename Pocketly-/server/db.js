const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Đường dẫn tới file database.sqlite (nằm ở thư mục gốc dự án)
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// Tạo kết nối tới SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Lỗi kết nối SQLite:', err.message);
  } else {
    console.log('Đã kết nối SQLite tại:', DB_PATH);
  }
});

// Bật WAL mode để tăng hiệu suất
db.run('PRAGMA journal_mode=WAL');

// Bật foreign keys
db.run('PRAGMA foreign_keys = ON');

// Tạo bảng users
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Tạo bảng records (lưu trữ dữ liệu Folders / Monthly)
db.run(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('expense', 'note', 'task')),
    title TEXT NOT NULL,
    amount_or_content TEXT,
    date DATE DEFAULT (date('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Thêm dữ liệu mẫu (seed) – chỉ chạy nếu bảng users còn trống
db.get('SELECT COUNT(*) AS count FROM users', [], (err, row) => {
  if (err) return;
  if (row.count === 0) {
    // Tạo user mẫu
    const insertUser = db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    );
    insertUser.run('demo', 'demo123');
    insertUser.run('admin', 'admin123');
    insertUser.finalize();

    console.log('Đã tạo dữ liệu mẫu (seed) cho bảng users.');

    // Tạo records mẫu cho user demo (id = 1)
    const insertRecord = db.prepare(
      'INSERT INTO records (user_id, type, title, amount_or_content, date) VALUES (?, ?, ?, ?, ?)'
    );
    insertRecord.run(1, 'expense', 'Mua sách Toán', '45000', '2026-03-01');
    insertRecord.run(1, 'task', 'Làm bài tập Lý', 'Chương 5 - Sóng cơ', '2026-03-05');
    insertRecord.run(1, 'note', 'Ghi chú ôn thi', 'Ôn lại công thức Hóa hữu cơ', '2026-03-08');
    insertRecord.run(2, 'expense', 'Mua vở mới', '30000', '2026-03-02');
    insertRecord.finalize();

    console.log('Đã tạo dữ liệu mẫu (seed) cho bảng records.');
  }
});

module.exports = db;
