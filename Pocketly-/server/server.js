/*
 * ═══════════════════════════════════════════════════════════
 *  FILE: server.js
 *  MÔ TẢ: Server chính của Pocketly (Backend)
 * ═══════════════════════════════════════════════════════════
 *
 *  File này làm các việc sau:
 *    1. Khởi tạo Express server (web framework cho Node.js)
 *    2. Phục vụ (serve) các file HTML/CSS/JS từ thư mục public/
 *    3. Cung cấp các API endpoints để frontend gọi tới
 *
 *  CÁC API ENDPOINTS:
 *    POST /api/register          → Đăng ký tài khoản mới
 *    POST /api/login             → Đăng nhập
 *    GET  /api/profile/:userId   → Lấy thông tin profile
 *    PUT  /api/profile/:userId   → Cập nhật profile
 *    GET  /api/folders/:userId   → Lấy danh sách folders
 *    POST /api/folders           → Tạo folder mới
 *    DELETE /api/folders/:id     → Xóa folder
 *    GET  /api/records/:userId   → Lấy danh sách records
 *    POST /api/records           → Tạo record mới
 *    DELETE /api/records/:id     → Xóa record
 *
 *  CÁCH HOẠT ĐỘNG:
 *    Frontend (main.js) gửi request → Server nhận → Xử lý → Trả kết quả JSON
 *    Ví dụ: fetch('/api/login', { method: 'POST', body: {...} })
 *           → Server kiểm tra username/password → Trả { user: {...} }
 */

// ── Import thư viện ─────────────────────────────────────────
const express = require('express');   // Framework web cho Node.js
const cors = require('cors');         // Cho phép frontend gọi API (Cross-Origin)
const path = require('path');         // Xử lý đường dẫn file

// Import database và hàm hash password từ db.js
const db = require('./db');
const { hashPassword, verifyPassword } = require('./db');

// ── Khởi tạo Express app ────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000; // Mặc định chạy trên port 3000

// ═══════════════════════════════════════════════════════════
//  MIDDLEWARE (Các hàm chạy trước mỗi request)
// ═══════════════════════════════════════════════════════════
//  Middleware giống như "bộ lọc" — mỗi request đi qua đây trước
//  khi tới API endpoint tương ứng

app.use(cors());                       // Cho phép gọi API từ domain khác
app.use(express.json());               // Cho phép đọc JSON từ body request

// Phục vụ file tĩnh (HTML, CSS, JS, hình ảnh) từ thư mục public/
// Khi truy cập http://localhost:3000/login.html → trả file public/login.html
app.use(express.static(path.join(__dirname, '..', 'public')));

// ═══════════════════════════════════════════════════════════
//  AUTH APIs (Đăng ký & Đăng nhập)
// ═══════════════════════════════════════════════════════════

/*
 * POST /api/register - Đăng ký tài khoản mới
 *
 * Frontend gửi: { username: "abc", password: "123456" }
 * Server làm:
 *   1. Kiểm tra username/password hợp lệ
 *   2. Hash (mã hóa) password
 *   3. Lưu vào database
 *   4. Tạo profile mặc định + 6 folder mặc định cho user mới
 *   5. Trả về { id, username }
 */
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập username và password.' });
  }
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Username phải từ 3-30 ký tự.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password phải ít nhất 6 ký tự.' });
  }
  // Chỉ cho phép chữ cái, số và dấu gạch dưới
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username chỉ được chứa chữ cái, số và dấu gạch dưới.' });
  }

  // Hash password trước khi lưu (KHÔNG BAO GIỜ lưu password gốc!)
  const { salt, hash } = hashPassword(password);

  // Lưu user vào database (dùng ? để chống SQL injection)
  db.run(
    'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)',
    [username, hash, salt],
    function (err) {
      // Nếu username đã tồn tại → báo lỗi
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Username đã tồn tại.' });
        }
        return res.status(500).json({ error: 'Lỗi server.' });
      }

      const userId = this.lastID; // ID tự tăng của user vừa tạo

      // Tạo profile mặc định cho user mới
      const barcode = 'PKT-' + String(userId).padStart(8, '0');
      db.run(
        'INSERT INTO user_profiles (user_id, full_name, barcode_id) VALUES (?, ?, ?)',
        [userId, username.toUpperCase(), barcode]
      );

      // Tạo 6 folders mặc định cho user mới
      const defaultFolders = [
        [userId, 'Emergency Fund', '#FFB6C1'],
        [userId, 'Education',      '#D8B4FE'],
        [userId, 'Investment',     '#93C5FD'],
        [userId, 'Daily Needs',    '#FDE68A'],
        [userId, 'Entertainment',  '#86EFAC'],
        [userId, 'Savings',        '#FCA5A5'],
      ];
      const stmt = db.prepare('INSERT INTO folders (user_id, name, color_code) VALUES (?, ?, ?)');
      defaultFolders.forEach(f => stmt.run(...f));
      stmt.finalize();

      // Trả về thông tin user (KHÔNG trả password hash!)
      res.status(201).json({ id: userId, username });
    }
  );
});

/*
 * POST /api/login - Đăng nhập
 *
 * Frontend gửi: { username: "abc", password: "123456" }
 * Server làm:
 *   1. Tìm user trong database theo username
 *   2. Lấy salt + hash đã lưu
 *   3. Hash password user nhập vào → so sánh với hash trong database
 *   4. Nếu đúng → trả { user: { id, username } }
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập username và password.' });
  }

  // Tìm user theo username (dùng ? để chống SQL injection)
  db.get(
    'SELECT id, username, password_hash, password_salt FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Lỗi server.' });

      // Không tìm thấy user HOẶC password sai → trả cùng 1 lỗi (bảo mật)
      if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
        return res.status(401).json({ error: 'Sai username hoặc password.' });
      }

      // Đăng nhập thành công → trả thông tin user (KHÔNG trả hash/salt)
      res.json({
        message: 'Đăng nhập thành công!',
        user: { id: user.id, username: user.username }
      });
    }
  );
});

// ═══════════════════════════════════════════════════════════
//  PROFILE APIs (Xem & Chỉnh sửa thông tin cá nhân)
// ═══════════════════════════════════════════════════════════

/*
 * GET /api/profile/:userId - Lấy thông tin profile của user
 *
 * :userId là tham số trên URL (ví dụ: /api/profile/1)
 * Server JOIN bảng users với user_profiles → trả tất cả thông tin
 */
app.get('/api/profile/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  const sql = `
    SELECT u.id, u.username, u.created_at,
           p.full_name, p.birthday, p.gender, p.city, p.school,
           p.year_level, p.avatar_url, p.barcode_id, p.quote
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    WHERE u.id = ?`;

  db.get(sql, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    if (!row) return res.status(404).json({ error: 'Không tìm thấy user.' });
    res.json(row);
  });
});

/*
 * PUT /api/profile/:userId - Cập nhật profile
 *
 * Frontend gửi: { full_name, birthday, gender, city, school, ... }
 * Server cập nhật vào bảng user_profiles
 */
app.put('/api/profile/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  const { full_name, birthday, gender, city, school, year_level, avatar_url, quote } = req.body;

  db.run(
    `UPDATE user_profiles SET
      full_name=?, birthday=?, gender=?, city=?, school=?,
      year_level=?, avatar_url=?, quote=?
    WHERE user_id=?`,
    [full_name || '', birthday || '', gender || '', city || '', school || '',
     year_level || '', avatar_url || 'avatar_1.png', quote || '', userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Lỗi server.' });
      if (this.changes === 0) return res.status(404).json({ error: 'Profile không tồn tại.' });
      res.json({ message: 'Cập nhật profile thành công.' });
    }
  );
});

// ═══════════════════════════════════════════════════════════
//  FOLDERS APIs (Xem, Tạo, Xóa folder)
// ═══════════════════════════════════════════════════════════

/*
 * GET /api/folders/:userId - Lấy tất cả folders của user
 * Trả về mảng: [{ id, user_id, name, color_code }, ...]
 */
app.get('/api/folders/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  db.all(
    'SELECT * FROM folders WHERE user_id = ? ORDER BY id ASC',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Lỗi server.' });
      res.json(rows);
    }
  );
});

/*
 * POST /api/folders - Tạo folder mới
 * Frontend gửi: { user_id, name, color_code }
 */
app.post('/api/folders', (req, res) => {
  const { user_id, name, color_code } = req.body;

  if (!user_id || !name) {
    return res.status(400).json({ error: 'Thiếu thông tin (user_id, name).' });
  }

  // Kiểm tra color_code an toàn (chỉ cho phép mã màu hex)
  const safeColor = /^#[0-9A-Fa-f]{3,6}$/.test(color_code) ? color_code : '#FFB6C1';

  db.run(
    'INSERT INTO folders (user_id, name, color_code) VALUES (?, ?, ?)',
    [user_id, name, safeColor],
    function (err) {
      if (err) return res.status(500).json({ error: 'Lỗi server.' });
      res.status(201).json({ id: this.lastID, user_id, name, color_code: safeColor });
    }
  );
});

/*
 * DELETE /api/folders/:id - Xóa 1 folder theo id
 */
app.delete('/api/folders/:id', (req, res) => {
  const id = Number(req.params.id);

  db.run('DELETE FROM folders WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy folder.' });
    res.json({ message: 'Đã xóa folder.' });
  });
});

// ═══════════════════════════════════════════════════════════
//  RECORDS APIs (Xem, Tạo, Xóa records)
// ═══════════════════════════════════════════════════════════

/*
 * GET /api/records/:userId - Lấy tất cả records của user
 *
 * Có thể thêm ?folder_id=X để lọc theo folder
 * Ví dụ: /api/records/1?folder_id=2 → chỉ lấy records trong folder 2
 *
 * JOIN với bảng folders để lấy thêm folder_name hiển thị
 */
app.get('/api/records/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  const folderId = req.query.folder_id ? Number(req.query.folder_id) : null;

  // Xây dựng câu SQL động (thêm điều kiện folder_id nếu có)
  let sql = `SELECT r.*, f.name AS folder_name
             FROM records r
             LEFT JOIN folders f ON r.folder_id = f.id
             WHERE r.user_id = ?`;
  const params = [userId];

  if (folderId) {
    sql += ' AND r.folder_id = ?';
    params.push(folderId);
  }

  sql += ' ORDER BY r.date DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    res.json(rows);
  });
});

/*
 * POST /api/records - Tạo record mới
 * Frontend gửi: { user_id, folder_id, type, title, amount_or_content, date }
 * type phải là: 'expense', 'note', hoặc 'task'
 */
app.post('/api/records', (req, res) => {
  const { user_id, folder_id, type, title, amount_or_content, date } = req.body;

  if (!user_id || !type || !title) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (user_id, type, title).' });
  }

  // Chỉ cho phép 3 loại record
  if (!['expense', 'note', 'task'].includes(type)) {
    return res.status(400).json({ error: 'type phải là: expense, note, hoặc task.' });
  }

  db.run(
    `INSERT INTO records (user_id, folder_id, type, title, amount_or_content, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, folder_id || null, type, title, amount_or_content || '', date || null],
    function (err) {
      if (err) return res.status(500).json({ error: 'Lỗi server.' });
      res.status(201).json({ id: this.lastID, user_id, folder_id, type, title, amount_or_content, date });
    }
  );
});

/*
 * DELETE /api/records/:id - Xóa 1 record theo id
 */
app.delete('/api/records/:id', (req, res) => {
  const recordId = Number(req.params.id);

  db.run('DELETE FROM records WHERE id = ?', [recordId], function (err) {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy record.' });
    res.json({ message: 'Đã xóa record thành công.' });
  });
});

// ═══════════════════════════════════════════════════════════
//  SPA FALLBACK & KHỞI ĐỘNG SERVER
// ═══════════════════════════════════════════════════════════

/*
 * GET /api/monthly-stats/:userId - Thống kê hàng tháng cho biểu đồ tròn
 *
 * Dùng SQL: SUM(amount_or_content) GROUP BY folder_id
 * → Tính tổng tiền (expense) trong từng folder
 * → Trả về dữ liệu sẵn sàng cho Chart.js
 *
 * Response: {
 *   labels: ["Shopping", "Food", ...],       ← Tên folder
 *   data: [550000, 150000, ...],              ← Tổng tiền mỗi folder
 *   colors: ["#93C5FD", "#FDE68A", ...],     ← Màu mỗi folder (lấy từ DB)
 *   total: 1000000                            ← Tổng cộng tất cả
 * }
 */
app.get('/api/monthly-stats/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  const sql = `
    SELECT f.name, f.color_code,
           COALESCE(SUM(CAST(r.amount_or_content AS REAL)), 0) AS total
    FROM folders f
    LEFT JOIN records r ON r.folder_id = f.id
                       AND r.user_id = ?
                       AND r.type = 'expense'
    WHERE f.user_id = ?
    GROUP BY f.id
    ORDER BY total DESC`;

  db.all(sql, [userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });

    const labels = rows.map(r => r.name);
    const data = rows.map(r => r.total);
    const colors = rows.map(r => r.color_code);
    const total = data.reduce((s, v) => s + v, 0);

    res.json({ labels, data, colors, total });
  });
});

// Fallback: Nếu URL không khớp API nào → trả về index.html
// Điều này giúp các route frontend (login.html, dashboard.html, ...) hoạt động
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Khởi động server và lắng nghe trên PORT
app.listen(PORT, () => {
  console.log(`🚀 Server Pocketly đang chạy tại: http://localhost:${PORT}`);
});
