const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

// Đường dẫn tới file database.sqlite (nằm ở thư mục gốc dự án)
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// ── Hàm hash password bằng SHA-256 + salt ─────────────────
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

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
db.run('PRAGMA foreign_keys = ON');

// ── Tạo bảng users (có salt để hash password) ─────────────
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Tạo bảng user_profiles ────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    full_name TEXT DEFAULT '',
    birthday DATE DEFAULT '',
    gender TEXT DEFAULT '',
    city TEXT DEFAULT '',
    school TEXT DEFAULT '',
    year_level TEXT DEFAULT '',
    avatar_url TEXT DEFAULT 'avatar_1.png',
    barcode_id TEXT DEFAULT '',
    quote TEXT DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// ── Tạo bảng folders ──────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color_code TEXT DEFAULT '#FFB6C1',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// ── Tạo bảng records ──────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    folder_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('expense', 'note', 'task')),
    title TEXT NOT NULL,
    amount_or_content TEXT,
    date DATE DEFAULT (date('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  )
`);

// ── Seed data ──────────────────────────────────────────────
db.get('SELECT COUNT(*) AS count FROM users', [], (err, row) => {
  if (err) return;
  if (row.count === 0) {
    // Tạo user mẫu (password được hash)
    const demo = hashPassword('demo123');
    const admin = hashPassword('admin123');

    const insertUser = db.prepare(
      'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)'
    );
    insertUser.run('demo', demo.hash, demo.salt);
    insertUser.run('admin', admin.hash, admin.salt);
    insertUser.finalize();

    // Tạo profiles mẫu
    const insertProfile = db.prepare(
      `INSERT INTO user_profiles (user_id, full_name, birthday, gender, city, school, year_level, avatar_url, barcode_id, quote)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertProfile.run(1, 'LUCIE NGUYEN', '2008-04-03', 'Female', 'HCMC', 'THPT Nguyễn Du', '12', 'avatar_1.png', 'PKT-20260001', 'Stay curious, stay kind ✨');
    insertProfile.run(2, 'ADMIN', '2000-01-01', 'N/A', 'HCMC', 'N/A', 'N/A', 'avatar_2.png', 'PKT-20260000', 'Admin account');
    insertProfile.finalize();

    // Tạo folders mẫu cho user demo
    const insertFolder = db.prepare(
      'INSERT INTO folders (user_id, name, color_code) VALUES (?, ?, ?)'
    );
    insertFolder.run(1, 'Emergency Fund', '#FFB6C1');
    insertFolder.run(1, 'Education', '#D8B4FE');
    insertFolder.run(1, 'Investment', '#93C5FD');
    insertFolder.run(1, 'Daily Needs', '#FDE68A');
    insertFolder.run(1, 'Entertainment', '#86EFAC');
    insertFolder.run(1, 'Savings', '#FCA5A5');
    insertFolder.finalize();

    // Tạo records mẫu
    const insertRecord = db.prepare(
      'INSERT INTO records (user_id, folder_id, type, title, amount_or_content, date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertRecord.run(1, 2, 'expense', 'Mua sách Toán', '45000', '2026-03-01');
    insertRecord.run(1, 2, 'task', 'Làm bài tập Lý', 'Chương 5 - Sóng cơ', '2026-03-05');
    insertRecord.run(1, 2, 'note', 'Ghi chú ôn thi', 'Ôn lại công thức Hóa hữu cơ', '2026-03-08');
    insertRecord.run(1, 1, 'expense', 'Tiết kiệm tháng 3', '200000', '2026-03-01');
    insertRecord.run(1, 4, 'expense', 'Ăn trưa', '35000', '2026-03-10');
    insertRecord.finalize();

    console.log('Seed data đã được tạo thành công.');
  }
});

module.exports = db;
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
