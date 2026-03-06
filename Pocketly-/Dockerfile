# ---- Stage 1: Build (nếu sau này bạn thêm bundler như Vite/Webpack) ----
# Hiện tại dự án là HTML tĩnh nên chỉ cần 1 stage

# Dùng Nginx bản Alpine (nhẹ ~5MB) để serve file tĩnh
FROM nginx:alpine

# Copy toàn bộ source vào thư mục serve của Nginx
COPY . /usr/share/nginx/html

# (Tùy chọn) Copy file cấu hình Nginx tùy chỉnh nếu có
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Mở port 80
EXPOSE 80

# Nginx tự khởi động, không cần CMD thêm
