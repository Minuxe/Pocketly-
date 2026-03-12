/*
 * ═══════════════════════════════════════════════════════════
 *  FILE: main.js
 *  MÔ TẢ: Toàn bộ logic Frontend cho website Pocketly
 * ═══════════════════════════════════════════════════════════
 *
 *  File này xử lý tất cả tương tác người dùng trên website:
 *
 *  1. AUTH (Xác thực):
 *     - Lưu/đọc thông tin user từ sessionStorage
 *     - Kiểm tra đã đăng nhập chưa (requireAuth)
 *     - Đăng xuất (logout)
 *
 *  2. PAGE ROUTER (Điều hướng trang):
 *     - Dựa vào URL → gọi hàm init tương ứng cho từng trang
 *
 *  3. CÁC TRANG:
 *     - Login page:    Đăng nhập / Đăng ký
 *     - Dashboard:     Thống kê hàng tháng + danh sách records
 *     - Folders:       Lưới folder + tìm kiếm + tạo mới
 *     - Folder Detail: Records trong 1 folder cụ thể
 *     - Profile:       Thẻ ID Card 3D + chỉnh sửa thông tin
 *
 *  CÁCH FRONTEND GIAO TIẾP VỚI BACKEND:
 *     Frontend dùng fetch() để gọi API tới server
 *     Ví dụ: fetch('/api/login', { method: 'POST', body: JSON.stringify({...}) })
 *     Server trả về JSON → Frontend hiển thị dữ liệu lên HTML
 */

// ═══════════════════════════════════════════════════════════
//  CÀI ĐẶT CHUNG
// ═══════════════════════════════════════════════════════════

// API Base URL - để trống vì frontend và backend cùng server (localhost:3000)
const API = '';

// ═══════════════════════════════════════════════════════════
//  AUTH HELPERS (Hàm hỗ trợ xác thực người dùng)
// ═══════════════════════════════════════════════════════════
//
//  sessionStorage: Bộ nhớ tạm của trình duyệt
//    - Dữ liệu bị xóa khi đóng tab/trình duyệt
//    - An toàn hơn localStorage (không bị lưu vĩnh viễn)
//
//  Khi đăng nhập thành công → lưu { id, username } vào sessionStorage
//  Mỗi trang (trừ Home/Login) sẽ gọi requireAuth() để kiểm tra

/**
 * getCurrentUser - Lấy thông tin user đang đăng nhập từ sessionStorage
 * @returns {object|null} { id, username } hoặc null nếu chưa đăng nhập
 */
function getCurrentUser() {
  const data = sessionStorage.getItem('pocketly_user');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

/**
 * setCurrentUser - Lưu thông tin user vào sessionStorage sau khi đăng nhập
 * @param {object} user - { id, username }
 */
function setCurrentUser(user) {
  sessionStorage.setItem('pocketly_user', JSON.stringify(user));
}

/**
 * logout - Đăng xuất: xóa dữ liệu user rồi chuyển về trang login
 */
function logout() {
  sessionStorage.removeItem('pocketly_user');
  window.location.href = 'login.html';
}

/**
 * requireAuth - Kiểm tra đã đăng nhập chưa
 * Nếu chưa → tự động chuyển về login.html
 * @returns {object|null} user object hoặc null
 */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// ═══════════════════════════════════════════════════════════
//  HÀM TIỆN ÍCH (Utility Functions)
// ═══════════════════════════════════════════════════════════

/**
 * escapeHtml - Chống tấn công XSS (Cross-Site Scripting)
 *
 * XSS là gì? Kẻ xấu nhập mã HTML/JS vào ô input, ví dụ:
 *   <script>alert('hack')</script>
 * Nếu hiển thị trực tiếp → trình duyệt sẽ chạy mã đó!
 *
 * Cách phòng: Chuyển ký tự đặc biệt thành dạng an toàn
 *   < → &lt;   > → &gt;   " → &quot;  v.v.
 *
 * @param {string} str - Chuỗi cần escape
 * @returns {string} Chuỗi an toàn để hiển thị trong HTML
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * formatDate - Chuyển ngày sang định dạng Việt Nam (dd/mm/yyyy)
 * @param {string} dateStr - Chuỗi ngày (ví dụ: "2026-03-01")
 * @returns {string} Ngày đã format hoặc "—"
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

/**
 * formatVND - Format số tiền theo kiểu Việt Nam (thêm dấu chấm phân cách)
 * Ví dụ: 45000 → "45.000"
 */
function formatVND(num) {
  const n = Number(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('vi-VN');
}

// ═══════════════════════════════════════════════════════════
//  PAGE ROUTER (Bộ điều hướng trang)
// ═══════════════════════════════════════════════════════════
//
//  Khi trang load xong (DOMContentLoaded):
//    1. Xác định đang ở trang nào (dựa vào URL)
//    2. Gắn sự kiện Logout cho nút logout
//    3. Gọi hàm init tương ứng cho trang đó

document.addEventListener('DOMContentLoaded', () => {
  // Xác định trang hiện tại
  const page = detectPage();

  // Gắn sự kiện cho nút Logout (có trên tất cả trang trừ index & login)
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Gọi hàm init phù hợp với trang hiện tại
  switch (page) {
    case 'login':         initLoginPage();    break;
    case 'dashboard':     initDashboard();    break;
    case 'folders':       initFoldersPage();  break;
    case 'folder-detail': initFolderDetail(); break;
    case 'profile':       initProfilePage();  break;
  }
});

/**
 * detectPage - Xác định trang hiện tại dựa vào URL
 * Ví dụ: URL = "http://localhost:3000/login.html" → return 'login'
 */
function detectPage() {
  const path = window.location.pathname;
  if (path.includes('login'))         return 'login';
  if (path.includes('dashboard'))     return 'dashboard';
  if (path.includes('folder-detail')) return 'folder-detail';
  if (path.includes('folders'))       return 'folders';
  if (path.includes('profile'))       return 'profile';
  return 'home';
}

// ═══════════════════════════════════════════════════════════
//  TRANG LOGIN / REGISTER
// ═══════════════════════════════════════════════════════════
//
//  Gồm 2 form: Login (mặc định) và Register (ẩn)
//  Người dùng click link để chuyển đổi giữa 2 form
//
//  Luồng đăng nhập:
//    1. User nhập username + password → click "Đăng nhập"
//    2. Frontend gửi POST /api/login với { username, password }
//    3. Server kiểm tra → trả { user: { id, username } }
//    4. Frontend lưu user vào sessionStorage → chuyển tới dashboard
//
//  Luồng đăng ký:
//    1. User nhập username + password + xác nhận → click "Đăng ký"
//    2. Frontend kiểm tra password khớp, đủ dài
//    3. Gửi POST /api/register → Server tạo user + folders mặc định
//    4. Frontend lưu user → chuyển tới dashboard

function initLoginPage() {
  // Nếu đã đăng nhập → chuyển thẳng dashboard
  if (getCurrentUser()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Lấy tham chiếu tới các phần tử HTML
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');

  // --- Toggle: Chuyển giữa Login ↔ Register ---
  showRegister.addEventListener('click', (e) => {
    e.preventDefault();                      // Ngăn link reload trang
    loginSection.style.display = 'none';     // Ẩn form login
    registerSection.style.display = 'block'; // Hiện form register
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
  });

  // --- Xử lý khi submit form Login ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Ngăn form gửi request mặc định (reload trang)
    const errBox = document.getElementById('login-error');
    errBox.classList.remove('show');

    // Lấy giá trị từ input
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      errBox.textContent = 'Vui lòng nhập đầy đủ thông tin.';
      errBox.classList.add('show');
      return;
    }

    try {
      // Gửi request POST tới server
      const res = await fetch(API + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      // Nếu server trả lỗi (status 4xx/5xx)
      if (!res.ok) {
        errBox.textContent = data.error || 'Đăng nhập thất bại.';
        errBox.classList.add('show');
        return;
      }

      // Đăng nhập thành công → lưu user + chuyển trang
      setCurrentUser(data.user);
      window.location.href = 'dashboard.html';
    } catch {
      errBox.textContent = 'Không thể kết nối server.';
      errBox.classList.add('show');
    }
  });

  // --- Xử lý khi submit form Register ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('register-error');
    const sucBox = document.getElementById('register-success');
    errBox.classList.remove('show');
    sucBox.classList.remove('show');

    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;

    // Kiểm tra dữ liệu phía frontend (client-side validation)
    if (!username || !password || !password2) {
      errBox.textContent = 'Vui lòng nhập đầy đủ thông tin.';
      errBox.classList.add('show');
      return;
    }
    if (password !== password2) {
      errBox.textContent = 'Password xác nhận không khớp.';
      errBox.classList.add('show');
      return;
    }
    if (password.length < 6) {
      errBox.textContent = 'Password phải ít nhất 6 ký tự.';
      errBox.classList.add('show');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errBox.textContent = 'Username chỉ được chứa chữ cái, số và dấu gạch dưới.';
      errBox.classList.add('show');
      return;
    }

    try {
      const res = await fetch(API + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errBox.textContent = data.error || 'Đăng ký thất bại.';
        errBox.classList.add('show');
        return;
      }

      // Đăng ký thành công
      sucBox.textContent = 'Đăng ký thành công! Đang chuyển hướng...';
      sucBox.classList.add('show');
      registerForm.reset();

      // Tự động đăng nhập + chuyển trang sau 1 giây
      setCurrentUser({ id: data.id, username: data.username });
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch {
      errBox.textContent = 'Không thể kết nối server.';
      errBox.classList.add('show');
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  TRANG DASHBOARD / MONTHLY (Biểu đồ chi tiêu)
// ═══════════════════════════════════════════════════════════
//
//  Hiển thị biểu đồ tròn (pie chart) thống kê chi tiêu
//  theo từng folder. Dùng thư viện Chart.js (CDN).
//
//  Luồng: Gọi API /api/monthly-stats/:userId → nhận { labels, data, colors, total }
//         → Vẽ pie chart bằng Chart.js + hiển thị legend + tổng tiền

function initDashboard() {
  const user = requireAuth();
  if (!user) return;

  loadMonthlyStats();

  /**
   * loadMonthlyStats - Tải dữ liệu thống kê từ server và vẽ biểu đồ
   */
  async function loadMonthlyStats() {
    try {
      const res = await fetch(API + '/api/monthly-stats/' + user.id);
      const stats = await res.json();

      renderPieChart(stats);
      renderLegend(stats);
      renderTotal(stats.total);
    } catch {
      document.getElementById('chart-legend').innerHTML =
        '<p style="text-align:center;color:#999;">Không thể tải dữ liệu.</p>';
    }
  }

  /**
   * renderPieChart - Vẽ biểu đồ tròn bằng Chart.js
   * @param {object} stats - { labels, data, colors }
   */
  function renderPieChart(stats) {
    const ctx = document.getElementById('expense-chart').getContext('2d');

    // Nếu không có dữ liệu chi tiêu → hiển thị chart trống
    if (stats.total === 0) {
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Chưa có chi tiêu'],
          datasets: [{
            data: [1],
            backgroundColor: ['#e0e0e0'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
      return;
    }

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: stats.labels,
        datasets: [{
          data: stats.data,
          backgroundColor: stats.colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const pct = ((value / stats.total) * 100).toFixed(1);
                return context.label + ': ' + formatVND(value) + ' VNĐ (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  /**
   * renderLegend - Hiển thị chú thích bên dưới biểu đồ
   */
  function renderLegend(stats) {
    const container = document.getElementById('chart-legend');

    if (stats.total === 0) {
      container.innerHTML = '<p class="legend-empty">Chưa có chi tiêu nào. Thêm record trong Folders!</p>';
      return;
    }

    container.innerHTML = stats.labels.map((label, i) => {
      const pct = ((stats.data[i] / stats.total) * 100).toFixed(1);
      return `
        <div class="legend-item">
          <span class="legend-color" style="background:${escapeHtml(stats.colors[i])};"></span>
          <span class="legend-label">${escapeHtml(label)}</span>
          <span class="legend-pct">${pct}%</span>
          <span class="legend-value">${formatVND(stats.data[i])} VNĐ</span>
        </div>
      `;
    }).join('');
  }

  /**
   * renderTotal - Hiển thị tổng chi tiêu
   */
  function renderTotal(total) {
    document.getElementById('chart-total').innerHTML =
      'Tổng chi tiêu: <strong>' + formatVND(total) + ' VNĐ</strong>';
  }
}

// ═══════════════════════════════════════════════════════════
//  TRANG FOLDERS (Quản lý Folders)
// ═══════════════════════════════════════════════════════════
//
//  Hiển thị lưới 3x2 folder (giống icon folder thật)
//  + Ô cuối cùng là nút "+" để tạo folder mới
//  + Search bar để tìm folder theo tên (filter ở client)

function initFoldersPage() {
  const user = requireAuth();
  if (!user) return;

  let allFolders = [];

  loadFolders();

  /**
   * loadFolders - Tải danh sách folders từ server
   */
  async function loadFolders() {
    try {
      const res = await fetch(API + '/api/folders/' + user.id);
      allFolders = await res.json();
      renderFolders(allFolders);
    } catch {
      document.getElementById('folder-grid').innerHTML =
        '<p style="text-align:center;color:#999;grid-column:1/-1;">Không thể tải folders.</p>';
    }
  }

  /**
   * renderFolders - Vẽ lưới folder lên HTML
   *
   * Mỗi folder có CSS variable --folder-color để đổi màu
   * (đặt trong style attribute → CSS dùng var(--folder-color))
   */
  function renderFolders(folders) {
    const grid = document.getElementById('folder-grid');

    // Tạo HTML cho tất cả folders (không có nút "+" trong grid nữa)
    grid.innerHTML = folders.map(f => `
      <div class="folder-wrapper" style="--folder-color: ${escapeHtml(f.color_code)};" data-id="${f.id}">
        <div class="folder-tab"></div>
        <div class="folder-body">
          <span class="folder-label">${escapeHtml(f.name)}</span>
        </div>
      </div>
    `).join('');

    // Click vào folder → mở trang folder-detail
    grid.querySelectorAll('.folder-wrapper').forEach(el => {
      el.addEventListener('click', () => {
        window.location.href = 'folder-detail.html?id=' + el.dataset.id;
      });
    });
  }

  // FAB (Floating Action Button): Click "+" → mở modal tạo folder
  document.getElementById('add-folder-fab').addEventListener('click', () => {
    document.getElementById('folder-modal').classList.add('active');
  });

  // --- Search: Lọc folder theo tên (real-time) ---
  document.getElementById('folder-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allFolders.filter(f => f.name.toLowerCase().includes(q));
    renderFolders(filtered);
  });

  // --- Modal: Tạo folder mới ---
  const modal = document.getElementById('folder-modal');

  document.getElementById('btn-cancel-folder').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  document.getElementById('folder-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('folder-name').value.trim();
    const color_code = document.getElementById('folder-color').value;
    if (!name) return;

    try {
      await fetch(API + '/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, name, color_code })
      });
      modal.classList.remove('active');
      document.getElementById('folder-form').reset();
      loadFolders(); // Tải lại danh sách
    } catch { /* Bỏ qua lỗi */ }
  });
}

// ═══════════════════════════════════════════════════════════
//  TRANG FOLDER DETAIL (Chi tiết 1 folder)
// ═══════════════════════════════════════════════════════════
//
//  URL: folder-detail.html?id=2 (id của folder)
//  Hiển thị: tên folder + danh sách records trong folder đó
//  Chức năng: filter theo type + thêm record mới + xóa record

function initFolderDetail() {
  const user = requireAuth();
  if (!user) return;

  // Lấy folder ID từ URL (query parameter)
  const params = new URLSearchParams(window.location.search);
  const folderId = Number(params.get('id'));

  // Nếu không có id → quay về trang folders
  if (!folderId) {
    window.location.href = 'folders.html';
    return;
  }

  let allRecords = [];
  let folderInfo = null;

  loadFolderInfo();

  /**
   * loadFolderInfo - Tải thông tin folder + records trong folder đó
   */
  async function loadFolderInfo() {
    try {
      // Lấy thông tin folder
      const foldersRes = await fetch(API + '/api/folders/' + user.id);
      const folders = await foldersRes.json();
      folderInfo = folders.find(f => f.id === folderId);

      if (folderInfo) {
        document.getElementById('folder-detail-name').textContent = folderInfo.name;
        document.getElementById('folder-detail-color').style.background = folderInfo.color_code;
      }

      // Lấy records thuộc folder này (dùng ?folder_id= để lọc)
      const recRes = await fetch(API + '/api/records/' + user.id + '?folder_id=' + folderId);
      allRecords = await recRes.json();
      renderRecords(allRecords);
    } catch {
      document.getElementById('records-list').innerHTML =
        '<div class="empty-state"><div class="emoji">⚠️</div><p>Không thể tải dữ liệu.</p></div>';
    }
  }

  /**
   * renderRecords - Hiển thị records trong folder
   */
  function renderRecords(records) {
    const container = document.getElementById('records-list');

    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">📂</div><p>Folder trống. Hãy thêm record mới!</p></div>';
      return;
    }

    container.innerHTML = records.map(r => `
      <div class="record-item">
        <span class="record-type ${escapeHtml(r.type)}">${escapeHtml(r.type)}</span>
        <div class="record-info">
          <div class="record-title">${escapeHtml(r.title)}</div>
          <div class="record-sub">${escapeHtml(r.amount_or_content)}</div>
        </div>
        <span class="record-date">${formatDate(r.date)}</span>
        <div class="record-actions">
          <button class="btn-icon delete" data-id="${r.id}" title="Xóa">🗑️</button>
        </div>
      </div>
    `).join('');

    // Gắn sự kiện xóa cho từng nút
    container.querySelectorAll('.btn-icon.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xóa record này?')) return;
        try {
          await fetch(API + '/api/records/' + btn.dataset.id, { method: 'DELETE' });
          loadFolderInfo(); // Tải lại
        } catch { /* Bỏ qua lỗi */ }
      });
    });
  }

  // --- Filter theo loại record ---
  document.getElementById('filter-type').addEventListener('change', (e) => {
    const t = e.target.value;
    renderRecords(t ? allRecords.filter(r => r.type === t) : allRecords);
  });

  // --- Modal: Thêm record vào folder ---
  const modal = document.getElementById('record-modal');
  const form = document.getElementById('record-form');

  document.getElementById('btn-add-record').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Thêm Record vào Folder';
    form.reset();
    document.getElementById('rec-edit-id').value = '';
    document.getElementById('rec-date').value = new Date().toISOString().split('T')[0];
    modal.classList.add('active');
  });

  document.getElementById('btn-cancel-record').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = {
      user_id: user.id,
      folder_id: folderId, // Tự động gán folder hiện tại
      type: document.getElementById('rec-type').value,
      title: document.getElementById('rec-title').value.trim(),
      amount_or_content: document.getElementById('rec-content').value.trim(),
      date: document.getElementById('rec-date').value || null,
    };

    try {
      await fetch(API + '/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      modal.classList.remove('active');
      loadFolderInfo(); // Tải lại
    } catch { /* Bỏ qua lỗi */ }
  });
}

// ═══════════════════════════════════════════════════════════
//  TRANG PROFILE (2 Thẻ ID Card cạnh nhau)
// ═══════════════════════════════════════════════════════════
//
//  Hiển thị 2 thẻ Student ID Card cạnh nhau (Flexbox):
//    Thẻ 1: Thông tin cơ bản (Name, Birthday, Gender, City)
//    Thẻ 2: Thông tin học sinh (Name, Birthday, School, Year Level)
//  Cả 2 thẻ đều có mã vạch (barcode) ở cuối
//
//  Dùng thư viện JsBarcode để tạo mã vạch từ barcode_id

function initProfilePage() {
  const user = requireAuth();
  if (!user) return;

  let profileData = null;

  loadProfile();

  /**
   * loadProfile - Tải thông tin profile từ server
   */
  async function loadProfile() {
    try {
      const res = await fetch(API + '/api/profile/' + user.id);
      profileData = await res.json();
      renderProfile();
    } catch {
      document.getElementById('profile-name').textContent = 'Lỗi tải profile';
    }
  }

  /**
   * renderProfile - Hiển thị thông tin profile lên 2 thẻ ID Card
   */
  function renderProfile() {
    if (!profileData) return;

    const displayName = profileData.full_name || user.username.toUpperCase();
    const displayBirthday = formatDate(profileData.birthday) || '—';

    // Avatar emoji
    const avatarEmojis = {
      'avatar_1.png': '🧑', 'avatar_2.png': '👩',
      'avatar_3.png': '🧒', 'avatar_4.png': '👦', 'avatar_5.png': '👧'
    };
    const emoji = avatarEmojis[profileData.avatar_url] || '👤';

    // ── Thẻ 1: Thông tin cơ bản ──
    document.getElementById('profile-name').textContent = displayName;
    document.getElementById('profile-birthday').textContent = displayBirthday;
    document.getElementById('profile-gender').textContent = profileData.gender || '—';
    document.getElementById('profile-city').textContent = profileData.city || '—';
    document.getElementById('avatar-placeholder-1').textContent = emoji;

    // ── Thẻ 2: Thông tin học sinh ──
    document.getElementById('profile-name-2').textContent = displayName;
    document.getElementById('profile-birthday-2').textContent = displayBirthday;
    document.getElementById('profile-school').textContent = profileData.school || '—';
    document.getElementById('profile-year').textContent = profileData.year_level || '—';
    document.getElementById('avatar-placeholder-2').textContent = emoji;

    // Tạo barcode cho cả 2 thẻ
    const barcodeId = profileData.barcode_id || 'PKT-00000001';
    try {
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode('#barcode1', barcodeId, {
          format: 'CODE128', width: 1.5, height: 35,
          displayValue: true, fontSize: 10, margin: 0, background: 'transparent'
        });
        JsBarcode('#barcode2', barcodeId, {
          format: 'CODE128', width: 1.5, height: 35,
          displayValue: true, fontSize: 10, margin: 0, background: 'transparent'
        });
      }
    } catch { /* JsBarcode chưa load */ }
  }

  // --- Modal: Chỉnh sửa Profile ---
  const modal = document.getElementById('profile-modal');

  // Mở modal + điền dữ liệu hiện tại vào form
  document.getElementById('btn-edit-profile').addEventListener('click', () => {
    if (profileData) {
      document.getElementById('edit-fullname').value = profileData.full_name || '';
      document.getElementById('edit-birthday').value = profileData.birthday || '';
      document.getElementById('edit-gender').value = profileData.gender || '';
      document.getElementById('edit-school').value = profileData.school || '';
      document.getElementById('edit-city').value = profileData.city || '';
      document.getElementById('edit-year').value = profileData.year_level || '';
      document.getElementById('edit-avatar').value = profileData.avatar_url || 'avatar_1.png';
      document.getElementById('edit-quote').value = profileData.quote || '';
    }
    modal.classList.add('active');
  });

  document.getElementById('btn-cancel-profile').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Submit form → cập nhật profile
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const body = {
      full_name: document.getElementById('edit-fullname').value.trim(),
      birthday: document.getElementById('edit-birthday').value,
      gender: document.getElementById('edit-gender').value,
      school: document.getElementById('edit-school').value.trim(),
      city: document.getElementById('edit-city').value.trim(),
      year_level: document.getElementById('edit-year').value.trim(),
      avatar_url: document.getElementById('edit-avatar').value,
      quote: document.getElementById('edit-quote').value.trim(),
    };

    try {
      await fetch(API + '/api/profile/' + user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      modal.classList.remove('active');
      loadProfile(); // Tải lại profile
    } catch { /* Bỏ qua lỗi */ }
  });
}
