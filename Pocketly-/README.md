# Pocketly - Academic & Personal Planner ★

> Ứng dụng hỗ trợ học tập và quản lý cá nhân  
> **Nhóm 3 - Lớp 12B** | Môn ICT - Website

---

## Thành viên

| Vai trò | Thành viên |
|---------|-----------|
| Leader / Backend & DB | Đại Minh |
| Frontend / UI-UX | Quế Phương |
| Frontend / Content & QA | Thư Kỳ |

---

## Mô tả dự án

**Pocketly** là website quản lý cá nhân dành cho học sinh, giúp:
- **Theo dõi chi tiêu** hàng tháng (expenses)
- **Quản lý công việc** (tasks) và **ghi chú** (notes)
- **Phân loại** bằng folder với màu tùy chỉnh
- **Thẻ Student ID Card** 3D flip với mã vạch

### Tính năng chính
1. Đăng ký / Đăng nhập (có mã hóa password bằng SHA-256)
2. Dashboard thống kê hàng tháng (chi tiêu, tasks, notes)
3. Thêm / Xóa records (3 loại: expense, task, note)
4. Tạo folders với màu sắc tùy chỉnh
5. Tìm kiếm + lọc records theo loại
6. Profile thẻ Student ID Card 3D (lật khi hover)
7. Mã vạch tự động (JsBarcode)

---

## Tech Stack (Công nghệ sử dụng)

| Thành phần | Công nghệ | Mục đích |
|-----------|----------|---------|
| Frontend | HTML5 + CSS3 + JavaScript | Giao diện người dùng |
| UI Framework | Bootstrap 5 (CDN) | Layout responsive |
| Fonts | Google Fonts (Pacifico, Fredoka One, Nunito) | Typography Y2K |
| Barcode | JsBarcode (CDN) | Tạo mã vạch trên thẻ ID |
| Backend | Node.js + Express.js | API server |
| Database | SQLite3 | Cơ sở dữ liệu file-based |

---

## Hướng dẫn chạy

```bash
# Bước 1: Cài Node.js (tải từ https://nodejs.org/) nếu chưa có

# Bước 2: Mở terminal, cd vào thư mục dự án
cd Pocketly-

# Bước 3: Cài thư viện (chỉ cần chạy 1 lần)
npm install

# Bước 4: Khởi động server
npm start

# Bước 5: Mở trình duyệt tại
# http://localhost:3000
```

---

## Tài khoản mẫu (có sẵn khi chạy lần đầu)

| Username | Password | Ghi chú |
|----------|----------|---------|
| demo | demo123 | Tài khoản thử nghiệm |
| admin | admin123 | Tài khoản quản trị |

---

## API Endpoints (Các đường dẫn API)

Tất cả API đều trả về JSON. Frontend gọi API bằng `fetch()`.

| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/register` | Đăng ký tài khoản mới |
| POST | `/api/login` | Đăng nhập |
| GET | `/api/profile/:userId` | Lấy thông tin profile |
| PUT | `/api/profile/:userId` | Cập nhật profile |
| GET | `/api/folders/:userId` | Lấy danh sách folders |
| POST | `/api/folders` | Tạo folder mới |
| DELETE | `/api/folders/:id` | Xóa folder |
| GET | `/api/records/:userId` | Lấy danh sách records |
| POST | `/api/records` | Tạo record mới |
| DELETE | `/api/records/:id` | Xóa record |

---

## Cấu trúc thư mục

```
Pocketly-/
├── public/                    ← Frontend (HTML/CSS/JS tĩnh)
│   ├── css/
│   │   └── style.css          ← Theme hồng Y2K (~800 dòng, có comments)
│   ├── js/
│   │   └── main.js            ← Toàn bộ logic frontend (~550 dòng)
│   ├── index.html             ← Trang chủ (landing page)
│   ├── login.html             ← Đăng nhập / đăng ký
│   ├── dashboard.html         ← Tổng quan hàng tháng
│   ├── folders.html           ← Quản lý folders
│   ├── folder-detail.html     ← Chi tiết 1 folder
│   └── profile.html           ← Thẻ Student ID Card 3D
│
├── server/                    ← Backend (Node.js)
│   ├── db.js                  ← Khởi tạo SQLite + tables + seed data
│   └── server.js              ← Express API server (~200 dòng)
│
├── database.sqlite            ← File DB (tự tạo khi chạy lần đầu)
├── package.json               ← Dependencies: express, sqlite3, cors
├── Dockerfile                 ← Docker config (optional)
├── .gitignore                 ← Bỏ qua node_modules, database.sqlite
└── README.md                  ← File này
```

---

## Giải thích luồng hoạt động

### 1. User mở website → Trang chủ (index.html)
Hiển thị folder card chào mừng → Click "Start" → chuyển tới login.

### 2. Đăng nhập (login.html → main.js → server.js → db.js)
```
[User nhập username/password]
  → main.js gửi POST /api/login
  → server.js nhận request, gọi db.js kiểm tra password
  → db.js dùng SHA-256 + salt để verify password
  → Nếu đúng → trả { user: { id, username } }
  → main.js lưu vào sessionStorage → chuyển tới dashboard
```

### 3. Dashboard (dashboard.html → main.js → server.js)
```
[Trang load]
  → main.js gọi 2 API cùng lúc (Promise.all):
    GET /api/records/:userId   → lấy tất cả records
    GET /api/folders/:userId   → lấy danh sách folders
  → Tính toán thống kê (tổng chi tiêu, số tasks, notes)
  → Render lên 4 ô stat + danh sách records
```

### 4. Folders (folders.html → main.js → server.js)
```
[Trang load]
  → main.js gọi GET /api/folders/:userId
  → Render lưới folder (CSS tạo hình folder thật)
  → Click folder → folder-detail.html?id=X
  → Click "+" → modal tạo folder mới → POST /api/folders
```

### 5. Profile (profile.html → main.js → server.js)
```
[Trang load]
  → main.js gọi GET /api/profile/:userId
  → Render thông tin lên thẻ ID Card
  → JsBarcode tạo mã vạch từ barcode_id
  → Click "Edit" → modal chỉnh sửa → PUT /api/profile/:userId
```

---

## Database Schema (Cấu trúc DB)

### Bảng `users` - Lưu tài khoản
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INTEGER (PK) | ID tự tăng |
| username | TEXT (UNIQUE) | Tên đăng nhập |
| password_hash | TEXT | Mật khẩu đã mã hóa SHA-256 |
| salt | TEXT | Muối ngẫu nhiên cho mã hóa |
| created_at | DATETIME | Ngày tạo |

### Bảng `user_profiles` - Thông tin cá nhân
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| user_id | INTEGER (FK) | Liên kết tới users.id |
| full_name | TEXT | Họ tên đầy đủ |
| birthday, gender, school, city, year_level | TEXT | Thông tin cá nhân |
| avatar_url | TEXT | Tên file avatar |
| quote | TEXT | Câu trích dẫn yêu thích |
| barcode_id | TEXT | Mã vạch trên thẻ ID |

### Bảng `folders` - Folder phân loại
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INTEGER (PK) | ID tự tăng |
| user_id | INTEGER (FK) | Liên kết tới users.id |
| name | TEXT | Tên folder |
| color_code | TEXT | Mã màu hex (#FFB6C1) |

### Bảng `records` - Bản ghi (expense/task/note)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INTEGER (PK) | ID tự tăng |
| user_id | INTEGER (FK) | Liên kết tới users.id |
| folder_id | INTEGER (FK) | Liên kết tới folders.id (có thể null) |
| type | TEXT | Loại: expense / task / note |
| title | TEXT | Tiêu đề |
| amount_or_content | TEXT | Số tiền hoặc nội dung |
| date | TEXT | Ngày (yyyy-mm-dd) |
