# Dùng Node.js bản Alpine (nhẹ) để chạy server Express + SQLite
FROM node:20-alpine

WORKDIR /app

# Copy package files và cài dependencies
COPY package.json ./
RUN npm install --production

# Copy toàn bộ source code
COPY . .

# Mở port 3000
EXPOSE 3000

# Khởi động server
CMD ["node", "server/server.js"]
