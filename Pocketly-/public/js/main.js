/* ═══════════════════════════════════════════════════════════
   POCKETLY - main.js
   Frontend Logic: Auth, Dashboard, Folders, Profile
   ═══════════════════════════════════════════════════════════ */

// ── API Base URL ────────────────────────────────────────────
const API = '';

// ── Auth Helpers (lưu user vào sessionStorage, an toàn hơn localStorage) ──
function getCurrentUser() {
  const data = sessionStorage.getItem('pocketly_user');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

function setCurrentUser(user) {
  sessionStorage.setItem('pocketly_user', JSON.stringify(user));
}

function logout() {
  sessionStorage.removeItem('pocketly_user');
  window.location.href = 'login.html';
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// ── Utility: Escape HTML để chống XSS ────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Utility: Format date ──────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

// ── Utility: Format VND ───────────────────────────────────────
function formatVND(num) {
  const n = Number(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('vi-VN');
}

// ═══════════════════════════════════════════════════════════
//  PAGE ROUTER – Xác định trang hiện tại & chạy logic tương ứng
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const page = detectPage();

  // Logout button (có trên tất cả trang trừ index & login)
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  switch (page) {
    case 'login':    initLoginPage();    break;
    case 'dashboard': initDashboard();   break;
    case 'folders':  initFoldersPage();  break;
    case 'folder-detail': initFolderDetail(); break;
    case 'profile':  initProfilePage();  break;
  }
});

function detectPage() {
  const path = window.location.pathname;
  if (path.includes('login'))          return 'login';
  if (path.includes('dashboard'))      return 'dashboard';
  if (path.includes('folder-detail'))  return 'folder-detail';
  if (path.includes('folders'))        return 'folders';
  if (path.includes('profile'))        return 'profile';
  return 'home';
}

// ═══════════════════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════════════════
function initLoginPage() {
  // Nếu đã đăng nhập, chuyển thẳng dashboard
  if (getCurrentUser()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');

  // Toggle login/register
  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
  });

  // Login submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('login-error');
    errBox.classList.remove('show');

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      errBox.textContent = 'Vui lòng nhập đầy đủ thông tin.';
      errBox.classList.add('show');
      return;
    }

    try {
      const res = await fetch(API + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errBox.textContent = data.error || 'Đăng nhập thất bại.';
        errBox.classList.add('show');
        return;
      }

      setCurrentUser(data.user);
      window.location.href = 'dashboard.html';
    } catch {
      errBox.textContent = 'Không thể kết nối server.';
      errBox.classList.add('show');
    }
  });

  // Register submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('register-error');
    const sucBox = document.getElementById('register-success');
    errBox.classList.remove('show');
    sucBox.classList.remove('show');

    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;

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

      sucBox.textContent = 'Đăng ký thành công! Đang chuyển hướng...';
      sucBox.classList.add('show');
      registerForm.reset();

      setCurrentUser({ id: data.id, username: data.username });
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch {
      errBox.textContent = 'Không thể kết nối server.';
      errBox.classList.add('show');
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════
function initDashboard() {
  const user = requireAuth();
  if (!user) return;

  // Set user badge
  document.getElementById('avatar-initial').textContent = user.username.charAt(0).toUpperCase();
  document.getElementById('username-display').textContent = user.username;

  let allRecords = [];
  let allFolders = [];

  // Load data
  loadDashboardData();

  async function loadDashboardData() {
    try {
      const [recordsRes, foldersRes] = await Promise.all([
        fetch(API + '/api/records/' + user.id),
        fetch(API + '/api/folders/' + user.id)
      ]);
      allRecords = await recordsRes.json();
      allFolders = await foldersRes.json();

      updateStats();
      renderRecords(allRecords);
      populateFolderSelect();
    } catch {
      document.getElementById('records-list').innerHTML =
        '<div class="empty-state"><div class="emoji">⚠️</div><p>Không thể tải dữ liệu.</p></div>';
    }
  }

  function updateStats() {
    const expenses = allRecords.filter(r => r.type === 'expense');
    const totalExpense = expenses.reduce((s, r) => s + (Number(r.amount_or_content) || 0), 0);
    document.getElementById('stat-expenses').textContent = formatVND(totalExpense);
    document.getElementById('stat-tasks').textContent = allRecords.filter(r => r.type === 'task').length;
    document.getElementById('stat-notes').textContent = allRecords.filter(r => r.type === 'note').length;
    document.getElementById('stat-total').textContent = allRecords.length;
  }

  function renderRecords(records) {
    const container = document.getElementById('records-list');

    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">📋</div><p>Chưa có record nào. Hãy thêm mới!</p></div>';
      return;
    }

    container.innerHTML = records.map(r => `
      <div class="record-item" data-id="${r.id}">
        <span class="record-type ${escapeHtml(r.type)}">${escapeHtml(r.type)}</span>
        <div class="record-info">
          <div class="record-title">${escapeHtml(r.title)}</div>
          <div class="record-sub">${escapeHtml(r.amount_or_content)}${r.folder_name ? ' · 📁 ' + escapeHtml(r.folder_name) : ''}</div>
        </div>
        <span class="record-date">${formatDate(r.date)}</span>
        <div class="record-actions">
          <button class="btn-icon edit" data-id="${r.id}" title="Sửa">✏️</button>
          <button class="btn-icon delete" data-id="${r.id}" title="Xóa">🗑️</button>
        </div>
      </div>
    `).join('');

    // Bind edit/delete
    container.querySelectorAll('.btn-icon.delete').forEach(btn => {
      btn.addEventListener('click', () => deleteRecord(Number(btn.dataset.id)));
    });
    container.querySelectorAll('.btn-icon.edit').forEach(btn => {
      btn.addEventListener('click', () => openEditRecord(Number(btn.dataset.id)));
    });
  }

  function populateFolderSelect() {
    const sel = document.getElementById('rec-folder');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Không chọn --</option>' +
      allFolders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
  }

  // Filter & search
  document.getElementById('filter-type').addEventListener('change', applyFilters);
  document.getElementById('search-records').addEventListener('input', applyFilters);

  function applyFilters() {
    const type = document.getElementById('filter-type').value;
    const query = document.getElementById('search-records').value.toLowerCase().trim();
    let filtered = allRecords;
    if (type) filtered = filtered.filter(r => r.type === type);
    if (query) filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(query) ||
      (r.amount_or_content && r.amount_or_content.toLowerCase().includes(query))
    );
    renderRecords(filtered);
  }

  // Add record modal
  const modal = document.getElementById('record-modal');
  const form = document.getElementById('record-form');

  document.getElementById('btn-add-record').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Thêm Record mới';
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
    const editId = document.getElementById('rec-edit-id').value;
    const body = {
      user_id: user.id,
      type: document.getElementById('rec-type').value,
      title: document.getElementById('rec-title').value.trim(),
      amount_or_content: document.getElementById('rec-content').value.trim(),
      date: document.getElementById('rec-date').value || null,
      folder_id: document.getElementById('rec-folder').value || null
    };

    try {
      if (editId) {
        await fetch(API + '/api/records/' + editId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        await fetch(API + '/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      modal.classList.remove('active');
      loadDashboardData();
    } catch { /* silent */ }
  });

  function openEditRecord(id) {
    const rec = allRecords.find(r => r.id === id);
    if (!rec) return;
    document.getElementById('modal-title').textContent = 'Sửa Record';
    document.getElementById('rec-edit-id').value = rec.id;
    document.getElementById('rec-type').value = rec.type;
    document.getElementById('rec-title').value = rec.title;
    document.getElementById('rec-content').value = rec.amount_or_content || '';
    document.getElementById('rec-date').value = rec.date || '';
    const folderSel = document.getElementById('rec-folder');
    if (folderSel) folderSel.value = rec.folder_id || '';
    modal.classList.add('active');
  }

  async function deleteRecord(id) {
    if (!confirm('Bạn có chắc muốn xóa record này?')) return;
    try {
      await fetch(API + '/api/records/' + id, { method: 'DELETE' });
      loadDashboardData();
    } catch { /* silent */ }
  }
}

// ═══════════════════════════════════════════════════════════
//  FOLDERS PAGE
// ═══════════════════════════════════════════════════════════
function initFoldersPage() {
  const user = requireAuth();
  if (!user) return;

  let allFolders = [];

  loadFolders();

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

  function renderFolders(folders) {
    const grid = document.getElementById('folder-grid');
    const html = folders.map(f => `
      <div class="folder-wrapper" style="--folder-color: ${escapeHtml(f.color_code)};" data-id="${f.id}" data-name="${escapeHtml(f.name)}">
        <div class="folder-tab"></div>
        <div class="folder-body">
          <span class="folder-label">${escapeHtml(f.name)}</span>
        </div>
      </div>
    `).join('');

    // Add "+" folder
    grid.innerHTML = html + `
      <div class="folder-wrapper add-new" id="add-folder-btn" style="--folder-color: transparent;">
        <div class="folder-tab"></div>
        <div class="folder-body">
          <span class="folder-label" style="font-size:2rem;color:#999;">+</span>
        </div>
      </div>
    `;

    // Click to open folder detail
    grid.querySelectorAll('.folder-wrapper:not(.add-new)').forEach(el => {
      el.addEventListener('click', () => {
        window.location.href = 'folder-detail.html?id=' + el.dataset.id;
      });
    });

    // Click add button
    document.getElementById('add-folder-btn').addEventListener('click', () => {
      document.getElementById('folder-modal').classList.add('active');
    });
  }

  // Search folders (real-time local filter)
  document.getElementById('folder-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = allFolders.filter(f => f.name.toLowerCase().includes(q));
    renderFolders(filtered);
  });

  // Modal
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
      loadFolders();
    } catch { /* silent */ }
  });
}

// ═══════════════════════════════════════════════════════════
//  FOLDER DETAIL PAGE
// ═══════════════════════════════════════════════════════════
function initFolderDetail() {
  const user = requireAuth();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const folderId = Number(params.get('id'));
  if (!folderId) {
    window.location.href = 'folders.html';
    return;
  }

  let allRecords = [];
  let folderInfo = null;

  loadFolderInfo();

  async function loadFolderInfo() {
    try {
      // Get folder info
      const foldersRes = await fetch(API + '/api/folders/' + user.id);
      const folders = await foldersRes.json();
      folderInfo = folders.find(f => f.id === folderId);

      if (folderInfo) {
        document.getElementById('folder-detail-name').textContent = folderInfo.name;
        document.getElementById('folder-detail-color').style.background = folderInfo.color_code;
      }

      // Get records for this folder
      const recRes = await fetch(API + '/api/records/' + user.id + '?folder_id=' + folderId);
      allRecords = await recRes.json();
      renderRecords(allRecords);
    } catch {
      document.getElementById('records-list').innerHTML =
        '<div class="empty-state"><div class="emoji">⚠️</div><p>Không thể tải dữ liệu.</p></div>';
    }
  }

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

    container.querySelectorAll('.btn-icon.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xóa record này?')) return;
        try {
          await fetch(API + '/api/records/' + btn.dataset.id, { method: 'DELETE' });
          loadFolderInfo();
        } catch { /* silent */ }
      });
    });
  }

  // Filter
  document.getElementById('filter-type').addEventListener('change', (e) => {
    const t = e.target.value;
    renderRecords(t ? allRecords.filter(r => r.type === t) : allRecords);
  });

  // Add record modal
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
      folder_id: folderId,
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
      loadFolderInfo();
    } catch { /* silent */ }
  });
}

// ═══════════════════════════════════════════════════════════
//  PROFILE PAGE (ID Card)
// ═══════════════════════════════════════════════════════════
function initProfilePage() {
  const user = requireAuth();
  if (!user) return;

  let profileData = null;

  loadProfile();

  async function loadProfile() {
    try {
      const res = await fetch(API + '/api/profile/' + user.id);
      profileData = await res.json();
      renderProfile();
    } catch {
      document.getElementById('profile-name').textContent = 'Lỗi tải profile';
    }
  }

  function renderProfile() {
    if (!profileData) return;

    document.getElementById('profile-name').textContent = profileData.full_name || user.username.toUpperCase();
    document.getElementById('profile-birthday').textContent = formatDate(profileData.birthday) || '—';
    document.getElementById('profile-gender').textContent = profileData.gender || '—';
    document.getElementById('profile-school').textContent = profileData.school || '—';
    document.getElementById('profile-city').textContent = profileData.city || '—';
    document.getElementById('profile-year').textContent = profileData.year_level || '—';
    document.getElementById('profile-quote').textContent = profileData.quote ? '"' + profileData.quote + '"' : '"Stay curious ✨"';

    // Avatar - dùng emoji placeholder nếu chưa có ảnh thật
    const avatarEmojis = { 'avatar_1.png': '🧑', 'avatar_2.png': '👩', 'avatar_3.png': '🧒', 'avatar_4.png': '👦', 'avatar_5.png': '👧' };
    const avatarFrame = document.getElementById('avatar-placeholder');
    if (avatarFrame) {
      avatarFrame.textContent = avatarEmojis[profileData.avatar_url] || '👤';
    }

    // Generate barcode using JsBarcode
    const barcodeId = profileData.barcode_id || 'PKT-00000001';
    try {
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode('#barcode', barcodeId, {
          format: 'CODE128',
          width: 1.5,
          height: 35,
          displayValue: true,
          fontSize: 10,
          margin: 0,
          background: 'transparent'
        });
      }
    } catch { /* JsBarcode not loaded */ }
  }

  // Edit profile modal
  const modal = document.getElementById('profile-modal');

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
      loadProfile();
    } catch { /* silent */ }
  });
}
