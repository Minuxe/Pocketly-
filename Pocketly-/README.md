# Pocketly - Academic & Personal Planner

> Ứng dụng hỗ trợ học tập và quản lý cá nhân  
> **Nhóm 3 - Lớp 12B** | Môn ICT - Website

## Thành viên

| Vai trò | Thành viên |
|---------|-----------|
| Leader / Backend & DB | Đại Minh |
| Frontend / UI-UX | Quế Phương |
| Frontend / Content & QA | Thư Kỳ |

## Tech Stack

- **Frontend:** HTML5, CSS3, Bootstrap 5, Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** SQLite3

## Hướng dẫn chạy

```bash
# 1. Cài Node.js (https://nodejs.org/) nếu chưa có

# 2. Cài thư viện
npm install

# 3. Chạy server
npm start

# 4. Mở trình duyệt tại
# http://localhost:3000
```

## Tài khoản mẫu

| Username | Password |
|----------|----------|
| demo | demo123 |
| admin | admin123 |

## API Endpoints

| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/register` | Đăng ký tài khoản |
| POST | `/api/login` | Đăng nhập |
| GET | `/api/records/:userId` | Lấy danh sách records |
| POST | `/api/records` | Tạo record mới |
| PUT | `/api/records/:id` | Cập nhật record |
| DELETE | `/api/records/:id` | Xóa record |

## Cấu trúc thư mục

```
pocketly/
├── public/              # Frontend tĩnh
│   ├── css/style.css
│   ├── js/main.js
│   ├── assets/
│   ├── index.html
│   ├── login.html
│   └── dashboard.html
├── server/              # Backend
│   ├── db.js            # Khởi tạo SQLite
│   └── server.js        # Express API
├── database.sqlite      # Tự động tạo khi chạy
├── package.json
└── README.md
```
