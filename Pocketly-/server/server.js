const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Phục vụ file tĩnh từ thư mục public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API: Đăng ký ──────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập username và password.' });
  }

  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.run(sql, [username, password], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Username đã tồn tại.' });
      }
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    res.status(201).json({ id: this.lastID, username });
  });
});

// ── API: Đăng nhập ────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập username và password.' });
  }

  const sql = 'SELECT id, username FROM users WHERE username = ? AND password = ?';
  db.get(sql, [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Sai username hoặc password.' });
    }
    res.json({ message: 'Đăng nhập thành công!', user });
  });
});

// ── API: Lấy danh sách records của 1 user ─────────────────
app.get('/api/records/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'userId không hợp lệ.' });
  }

  const sql = 'SELECT * FROM records WHERE user_id = ? ORDER BY date DESC';
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    res.json(rows);
  });
});

// ── API: Tạo record mới ───────────────────────────────────
app.post('/api/records', (req, res) => {
  const { user_id, type, title, amount_or_content, date } = req.body;

  if (!user_id || !type || !title) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (user_id, type, title).' });
  }

  const allowedTypes = ['expense', 'note', 'task'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'type phải là: expense, note, hoặc task.' });
  }

  const sql = `INSERT INTO records (user_id, type, title, amount_or_content, date)
               VALUES (?, ?, ?, ?, ?)`;
  const params = [user_id, type, title, amount_or_content || '', date || null];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    res.status(201).json({
      id: this.lastID,
      user_id, type, title, amount_or_content, date
    });
  });
});

// ── API: Xóa record ───────────────────────────────────────
app.delete('/api/records/:id', (req, res) => {
  const recordId = Number(req.params.id);
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return res.status(400).json({ error: 'id không hợp lệ.' });
  }

  const sql = 'DELETE FROM records WHERE id = ?';
  db.run(sql, [recordId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Không tìm thấy record.' });
    }
    res.json({ message: 'Đã xóa record thành công.' });
  });
});

// ── API: Cập nhật record ──────────────────────────────────
app.put('/api/records/:id', (req, res) => {
  const recordId = Number(req.params.id);
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return res.status(400).json({ error: 'id không hợp lệ.' });
  }

  const { type, title, amount_or_content, date } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (type, title).' });
  }

  const allowedTypes = ['expense', 'note', 'task'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'type phải là: expense, note, hoặc task.' });
  }

  const sql = `UPDATE records SET type = ?, title = ?, amount_or_content = ?, date = ?
               WHERE id = ?`;
  db.run(sql, [type, title, amount_or_content || '', date || null, recordId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi server.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Không tìm thấy record.' });
    }
    res.json({ message: 'Đã cập nhật record thành công.' });
  });
});

// ── Khởi động server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server Pocketly đang chạy tại: http://localhost:${PORT}`);
});
