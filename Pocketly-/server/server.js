const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { hashPassword, verifyPassword } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Phục vụ file tĩnh từ thư mục public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ═══════════════════════════════════════════════════════════
//  AUTH APIs
// ═══════════════════════════════════════════════════════════

// ── Đăng ký (password được hash) ───────────────────────────
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập username và password.' });
  }
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Username phải từ 3-30 ký tự.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password phải ít nhất 6 ký tự.' });
  }
  // Chỉ cho phép alphanumeric + underscore cho username
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username chỉ được chứa chữ cái, số và dấu gạch dưới.' });
  }

  const { salt, hash } = hashPassword(password);

  const sql = 'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)';
  db.run(sql, [username, hash, salt], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Username đã tồn tại.' });
      }
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    const userId = this.lastID;

    // Tạo profile mặc định cho user mới
    const barcode = 'PKT-' + String(userId).padStart(8, '0');
    db.run(
      `INSERT INTO user_profiles (user_id, full_name, barcode_id) VALUES (?, ?, ?)`,
      [userId, username.toUpperCase(), barcode]
    );

    // Tạo folders mặc định cho user mới
    const defaultFolders = [
      [userId, 'Emergency Fund', '#FFB6C1'],
      [userId, 'Education', '#D8B4FE'],
      [userId, 'Investment', '#93C5FD'],
      [userId, 'Daily Needs', '#FDE68A'],
      [userId, 'Entertainment', '#86EFAC'],
      [userId, 'Savings', '#FCA5A5'],
    ];
    const insertFolder = db.prepare('INSERT INTO folders (user_id, name, color_code) VALUES (?, ?, ?)');
    defaultFolders.forEach(f => insertFolder.run(...f));
    insertFolder.finalize();

    res.status(201).json({ id: userId, username });
  });
});

// ── Đăng nhập (verify hash) ───────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập username và password.' });
  }

  const sql = 'SELECT id, username, password_hash, password_salt FROM users WHERE username = ?';
  db.get(sql, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Sai username hoặc password.' });
    }
    if (!verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Sai username hoặc password.' });
    }
    // Trả về thông tin user (không bao giờ trả hash/salt)
    res.json({ message: 'Đăng nhập thành công!', user: { id: user.id, username: user.username } });
  });
});

// ═══════════════════════════════════════════════════════════
//  PROFILE APIs
// ═══════════════════════════════════════════════════════════

// ── Lấy profile ────────────────────────────────────────────
app.get('/api/profile/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'userId không hợp lệ.' });
  }

  const sql = `SELECT u.id, u.username, u.created_at,
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

// ── Cập nhật profile ───────────────────────────────────────
app.put('/api/profile/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'userId không hợp lệ.' });
  }

  const { full_name, birthday, gender, city, school, year_level, avatar_url, quote } = req.body;

  const sql = `UPDATE user_profiles SET
    full_name = ?, birthday = ?, gender = ?, city = ?, school = ?,
    year_level = ?, avatar_url = ?, quote = ?
    WHERE user_id = ?`;
  db.run(sql, [
    full_name || '', birthday || '', gender || '', city || '', school || '',
    year_level || '', avatar_url || 'avatar_1.png', quote || '', userId
  ], function (err) {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Profile không tồn tại.' });
    res.json({ message: 'Cập nhật profile thành công.' });
  });
});

// ═══════════════════════════════════════════════════════════
//  FOLDERS APIs
// ═══════════════════════════════════════════════════════════

// ── Lấy danh sách folders ──────────────────────────────────
app.get('/api/folders/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'userId không hợp lệ.' });
  }

  db.all('SELECT * FROM folders WHERE user_id = ? ORDER BY id ASC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    res.json(rows);
  });
});

// ── Tạo folder mới ────────────────────────────────────────
app.post('/api/folders', (req, res) => {
  const { user_id, name, color_code } = req.body;
  if (!user_id || !name) {
    return res.status(400).json({ error: 'Thiếu thông tin (user_id, name).' });
  }

  // Validate color_code (chỉ cho phép hex color để tránh CSS injection)
  const safeColor = /^#[0-9A-Fa-f]{3,6}$/.test(color_code) ? color_code : '#FFB6C1';

  db.run('INSERT INTO folders (user_id, name, color_code) VALUES (?, ?, ?)',
    [user_id, name, safeColor], function (err) {
      if (err) return res.status(500).json({ error: 'Lỗi server.' });
      res.status(201).json({ id: this.lastID, user_id, name, color_code: safeColor });
    });
});

// ── Xóa folder ────────────────────────────────────────────
app.delete('/api/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id không hợp lệ.' });
  }

  db.run('DELETE FROM folders WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy folder.' });
    res.json({ message: 'Đã xóa folder.' });
  });
});

// ═══════════════════════════════════════════════════════════
//  RECORDS APIs
// ═══════════════════════════════════════════════════════════

// ── Lấy records của 1 user (có thể filter theo folder) ────
app.get('/api/records/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'userId không hợp lệ.' });
  }

  const folderId = req.query.folder_id ? Number(req.query.folder_id) : null;

  let sql = 'SELECT r.*, f.name AS folder_name FROM records r LEFT JOIN folders f ON r.folder_id = f.id WHERE r.user_id = ?';
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

// ── Tạo record mới ────────────────────────────────────────
app.post('/api/records', (req, res) => {
  const { user_id, folder_id, type, title, amount_or_content, date } = req.body;

  if (!user_id || !type || !title) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (user_id, type, title).' });
  }

  const allowedTypes = ['expense', 'note', 'task'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'type phải là: expense, note, hoặc task.' });
  }

  const sql = `INSERT INTO records (user_id, folder_id, type, title, amount_or_content, date)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [user_id, folder_id || null, type, title, amount_or_content || '', date || null], function (err) {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    res.status(201).json({ id: this.lastID, user_id, folder_id, type, title, amount_or_content, date });
  });
});

// ── Xóa record ────────────────────────────────────────────
app.delete('/api/records/:id', (req, res) => {
  const recordId = Number(req.params.id);
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return res.status(400).json({ error: 'id không hợp lệ.' });
  }

  db.run('DELETE FROM records WHERE id = ?', [recordId], function (err) {
    if (err) return res.status(500).json({ error: 'Lỗi server.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy record.' });
    res.json({ message: 'Đã xóa record thành công.' });
  });
});

// ── Cập nhật record ────────────────────────────────────────
app.put('/api/records/:id', (req, res) => {
  const recordId = Number(req.params.id);
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return res.status(400).json({ error: 'id không hợp lệ.' });
  }

  const { type, title, amount_or_content, date, folder_id } = req.body;
  if (!type || !title) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (type, title).' });
  }
  const allowedTypes = ['expense', 'note', 'task'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'type phải là: expense, note, hoặc task.' });
  }

  db.run(`UPDATE records SET type=?, title=?, amount_or_content=?, date=?, folder_id=? WHERE id=?`,
    [type, title, amount_or_content || '', date || null, folder_id || null, recordId], function (err) {
      if (err) return res.status(500).json({ error: 'Lỗi server.' });
      if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy record.' });
      res.json({ message: 'Đã cập nhật record thành công.' });
    });
});

// ── Fallback: Trả về index.html cho SPA routes ────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Khởi động server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server Pocketly đang chạy tại: http://localhost:${PORT}`);
});
