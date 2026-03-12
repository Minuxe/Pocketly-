/*
 * ═══════════════════════════════════════════════════════════
 *  FILE: db.js
 *  MÔ TẢ: Khởi tạo cơ sở dữ liệu (Database) cho Pocketly
 * ═══════════════════════════════════════════════════════════
 *
 *  File này làm 4 việc chính:
 *    1. Kết nối tới database SQLite (file database.sqlite)
 *    2. Tạo các bảng (tables) nếu chưa có
 *    3. Cung cấp hàm hash/verify password (bảo mật)
 *    4. Tạo dữ liệu mẫu (seed data) để test
 *
 *  BẢNG DỮ LIỆU:
 *    - users          : Lưu tài khoản (username, password đã mã hóa)
 *    - user_profiles  : Lưu thông tin cá nhân (tên, trường, ...)
 *    - folders        : Lưu danh sách folder của từng user
 *    - records        : Lưu các bản ghi (chi tiêu, ghi chú, công việc)
 */

// ── Import thư viện ─────────────────────────────────────────
// sqlite3  : Thư viện để làm việc với database SQLite
// crypto   : Thư viện có sẵn của Node.js, dùng để mã hóa password
// path     : Thư viện có sẵn của Node.js, dùng để xử lý đường dẫn file
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

// Đường dẫn tới file database (nằm ở thư mục gốc dự án)
// __dirname = thư mục chứa file db.js (tức là /server)
// '..' = lùi lại 1 cấp về thư mục gốc
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// ═══════════════════════════════════════════════════════════
//  HÀM MÃ HÓA PASSWORD (Password Hashing)
// ═══════════════════════════════════════════════════════════
//
//  Tại sao cần mã hóa password?
//    → Nếu lưu password trực tiếp vào database, ai có quyền truy cập
//      database sẽ thấy password của tất cả người dùng → KHÔNG AN TOÀN!
//
//  Cách hoạt động:
//    1. Tạo 1 chuỗi ngẫu nhiên gọi là "salt" (muối)
//    2. Nối salt + password lại, rồi mã hóa bằng thuật toán SHA-256
//    3. Kết quả là 1 chuỗi dài (hash) không thể đảo ngược
//    4. Lưu cả salt và hash vào database
//
//  Khi đăng nhập:
//    → Lấy salt đã lưu, hash lại password user nhập vào
//    → So sánh với hash trong database → nếu giống nhau = đúng password

/**
 * hashPassword - Mã hóa password thành chuỗi hash
 * @param {string} password - Password gốc cần mã hóa
 * @param {string} salt     - Chuỗi muối (nếu không truyền sẽ tạo mới)
 * @returns {object} { salt, hash } - Trả về salt và hash
 */
function hashPassword(password, salt) {
  // Nếu chưa có salt → tạo 16 bytes ngẫu nhiên, chuyển sang dạng hex
  if (!salt) salt = crypto.randomBytes(16).toString('hex');

  // Mã hóa: nối salt + password → hash bằng SHA-256 → chuyển sang hex
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');

  return { salt, hash };
}

/**
 * verifyPassword - Kiểm tra password có đúng không
 * @param {string} password   - Password người dùng nhập vào
 * @param {string} salt       - Salt đã lưu trong database
 * @param {string} storedHash - Hash đã lưu trong database
 * @returns {boolean} true nếu password đúng, false nếu sai
 */
function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

// ═══════════════════════════════════════════════════════════
//  KẾT NỐI DATABASE
// ═══════════════════════════════════════════════════════════
//  SQLite là database dạng file (không cần cài server riêng)
//  Khi chạy lần đầu, file database.sqlite sẽ tự động được tạo

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối SQLite:', err.message);
  } else {
    console.log('✅ Đã kết nối SQLite tại:', DB_PATH);
  }
});

// Bật FOREIGN KEYS để database kiểm tra ràng buộc giữa các bảng
db.run('PRAGMA foreign_keys = ON');

// ═══════════════════════════════════════════════════════════
//  TẠO CÁC BẢNG (CREATE TABLES)
// ═══════════════════════════════════════════════════════════
//  "CREATE TABLE IF NOT EXISTS" = chỉ tạo nếu bảng chưa tồn tại
//  → An toàn khi chạy lại nhiều lần, không bị lỗi trùng

// BẢNG 1: users - Lưu thông tin đăng nhập
// Mỗi user có: id (tự tăng), username (duy nhất), password (đã hash), ngày tạo
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// BẢNG 2: user_profiles - Lưu thông tin cá nhân cho trang Profile / ID Card
// Liên kết với bảng users qua user_id (FOREIGN KEY)
db.run(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER UNIQUE NOT NULL,
    full_name  TEXT DEFAULT '',
    birthday   DATE DEFAULT '',
    gender     TEXT DEFAULT '',
    city       TEXT DEFAULT '',
    school     TEXT DEFAULT '',
    year_level TEXT DEFAULT '',
    avatar_url TEXT DEFAULT 'avatar_1.png',
    barcode_id TEXT DEFAULT '',
    quote      TEXT DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// BẢNG 3: folders - Lưu các folder của user (mỗi folder có tên + màu)
db.run(`
  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    name       TEXT NOT NULL,
    color_code TEXT DEFAULT '#FFB6C1',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// BẢNG 4: records - Lưu các bản ghi (chi tiêu, ghi chú, công việc)
// Mỗi record thuộc 1 user, có thể thuộc 1 folder (hoặc không)
// type chỉ được là: 'expense', 'note', hoặc 'task'
db.run(`
  CREATE TABLE IF NOT EXISTS records (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL,
    folder_id         INTEGER,
    type              TEXT NOT NULL CHECK(type IN ('expense', 'note', 'task')),
    title             TEXT NOT NULL,
    amount_or_content TEXT,
    date              DATE DEFAULT (date('now')),
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id)  ON DELETE SET NULL
  )
`);

// ═══════════════════════════════════════════════════════════
//  DỮ LIỆU MẪU (Seed Data)
// ═══════════════════════════════════════════════════════════
//  Tạo sẵn 1 tài khoản demo để test ứng dụng
//  Chỉ tạo khi database trống (chưa có user nào)

db.get('SELECT COUNT(*) AS count FROM users', [], (err, row) => {
  if (err) return;
  if (row.count > 0) return; // Đã có dữ liệu → không tạo lại

  console.log('📦 Đang tạo dữ liệu mẫu...');

  // --- Tạo user demo (password: demo123) ---
  const demo = hashPassword('demo123');
  db.run(
    'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)',
    ['demo', demo.hash, demo.salt]
  );

  // --- Tạo profile cho user demo ---
  db.run(
    `INSERT INTO user_profiles
       (user_id, full_name, birthday, gender, city, school, year_level, avatar_url, barcode_id, quote)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, 'LUCIE NGUYEN', '2008-04-03', 'Female', 'HCMC', 'THPT Nguyễn Du', '12',
     'avatar_1.png', 'PKT-00000001', 'Stay curious, stay kind ✨']
  );

  // --- Tạo 6 folders mặc định cho user demo ---
  const folders = [
    [1, 'Emergency Fund', '#FFB6C1'],  // Hồng
    [1, 'Education',      '#D8B4FE'],  // Tím
    [1, 'Investment',     '#93C5FD'],  // Xanh dương
    [1, 'Daily Needs',    '#FDE68A'],  // Vàng
    [1, 'Entertainment',  '#86EFAC'],  // Xanh lá
    [1, 'Savings',        '#FCA5A5'],  // Đỏ nhạt
  ];
  const insertFolder = db.prepare('INSERT INTO folders (user_id, name, color_code) VALUES (?, ?, ?)');
  folders.forEach(f => insertFolder.run(...f));
  insertFolder.finalize();

  // --- Tạo vài records mẫu ---
  const records = [
    [1, 2, 'expense', 'Mua sách Toán',      '45000',                       '2026-03-01'],
    [1, 2, 'task',    'Làm bài tập Lý',      'Chương 5 - Sóng cơ',         '2026-03-05'],
    [1, 2, 'note',    'Ghi chú ôn thi',      'Ôn lại công thức Hóa hữu cơ','2026-03-08'],
    [1, 1, 'expense', 'Tiết kiệm tháng 3',   '200000',                     '2026-03-01'],
    [1, 4, 'expense', 'Ăn trưa',             '35000',                       '2026-03-10'],
  ];
  const insertRecord = db.prepare(
    'INSERT INTO records (user_id, folder_id, type, title, amount_or_content, date) VALUES (?, ?, ?, ?, ?, ?)'
  );
  records.forEach(r => insertRecord.run(...r));
  insertRecord.finalize();

  console.log('✅ Dữ liệu mẫu đã được tạo thành công!');
});

// ═══════════════════════════════════════════════════════════
//  EXPORT (Xuất ra để các file khác sử dụng)
// ═══════════════════════════════════════════════════════════
//  Các file khác (server.js) sẽ dùng:
//    const db = require('./db')           → để truy vấn database
//    const { hashPassword } = require('./db')  → để hash password
//    const { verifyPassword } = require('./db') → để kiểm tra password

module.exports = db;
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
