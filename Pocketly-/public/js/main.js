/*
 * =====================================================
 *  FILE: main.js - Pocketly Frontend Logic
 * =====================================================
 *
 *  CHE DO: GitHub Pages (khong can Node.js server)
 *  Du lieu luu trong localStorage cua trinh duyet.
 *  Password hash bang SHA-256 (Web Crypto API).
 *
 *  CAC PHAN:
 *    1. LOCAL DATABASE: CRUD du lieu trong localStorage
 *    2. PASSWORD HASHING: SHA-256 bang Web Crypto API
 *    3. SEED DATA: Tao du lieu mau khi lan dau truy cap
 *    4. AUTH HELPERS: Dang nhap / dang xuat
 *    5. UTILITY: escapeHtml, formatDate, formatVND
 *    6. PAGE ROUTER: Dieu huong trang
 *    7. CAC TRANG: Login, Monthly, Folders, Folder Detail, Profile
 */

// =====================================================
//  1. LOCAL DATABASE (localStorage thay the server + SQLite)
// =====================================================

function dbGetUsers() {
  return JSON.parse(localStorage.getItem('pocketly_users') || '[]');
}
function dbSaveUsers(users) {
  localStorage.setItem('pocketly_users', JSON.stringify(users));
}

function dbGetProfile(userId) {
  return JSON.parse(localStorage.getItem('pocketly_profile_' + userId) || 'null');
}
function dbSaveProfile(userId, profile) {
  localStorage.setItem('pocketly_profile_' + userId, JSON.stringify(profile));
}

function dbGetFolders(userId) {
  return JSON.parse(localStorage.getItem('pocketly_folders_' + userId) || '[]');
}
function dbSaveFolders(userId, folders) {
  localStorage.setItem('pocketly_folders_' + userId, JSON.stringify(folders));
}

function dbGetRecords(userId) {
  return JSON.parse(localStorage.getItem('pocketly_records_' + userId) || '[]');
}
function dbSaveRecords(userId, records) {
  localStorage.setItem('pocketly_records_' + userId, JSON.stringify(records));
}

function dbNextId(type) {
  var counter = JSON.parse(localStorage.getItem('pocketly_counter') || '{"user":0,"folder":0,"record":0}');
  counter[type] = (counter[type] || 0) + 1;
  localStorage.setItem('pocketly_counter', JSON.stringify(counter));
  return counter[type];
}

// =====================================================
//  2. PASSWORD HASHING (SHA-256 bang Web Crypto API)
// =====================================================

function generateSalt() {
  var arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

async function hashPwd(password, salt) {
  var data = new TextEncoder().encode(salt + password);
  var buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

async function verifyPwd(password, salt, hash) {
  return (await hashPwd(password, salt)) === hash;
}

// =====================================================
//  3. SEED DATA (Tao du lieu mau khi lan dau truy cap)
// =====================================================

async function initDatabase() {
  if (dbGetUsers().length > 0) return;

  var salt = generateSalt();
  var hash = await hashPwd('demo123', salt);
  var userId = dbNextId('user');

  dbSaveUsers([{
    id: userId, username: 'demo',
    password_hash: hash, password_salt: salt,
    created_at: new Date().toISOString()
  }]);

  dbSaveProfile(userId, {
    user_id: userId, full_name: 'LUCIE NGUYEN',
    birthday: '2008-01-15', gender: 'Female',
    city: 'Ho Chi Minh', school: 'THPT ABC', year_level: '12',
    avatar_url: 'avatar_2.png',
    barcode_id: 'PKT-' + String(userId).padStart(8, '0'),
    quote: 'Stay curious, stay kind'
  });

  var defaultFolders = [
    { name: 'Emergency Fund', color_code: '#FFB6C1' },
    { name: 'Education',      color_code: '#D8B4FE' },
    { name: 'Investment',     color_code: '#93C5FD' },
    { name: 'Daily Needs',    color_code: '#FDE68A' },
    { name: 'Entertainment',  color_code: '#86EFAC' },
    { name: 'Savings',        color_code: '#FCA5A5' }
  ];

  dbSaveFolders(userId, defaultFolders.map(function(f) {
    return { id: dbNextId('folder'), user_id: userId, name: f.name, color_code: f.color_code };
  }));

  dbSaveRecords(userId, []);
}

// =====================================================
//  4. AUTH HELPERS
// =====================================================

function getCurrentUser() {
  var data = sessionStorage.getItem('pocketly_user');
  if (!data) return null;
  try { return JSON.parse(data); } catch(e) { return null; }
}

function setCurrentUser(user) {
  sessionStorage.setItem('pocketly_user', JSON.stringify(user));
}

function logout() {
  sessionStorage.removeItem('pocketly_user');
  window.location.href = 'login.html';
}

function requireAuth() {
  var user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// =====================================================
//  5. UTILITY FUNCTIONS
// =====================================================

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

function formatVND(num) {
  var n = Number(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('vi-VN');
}

// =====================================================
//  6. PAGE ROUTER
// =====================================================

document.addEventListener('DOMContentLoaded', async function() {
  await initDatabase();

  var page = detectPage();

  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  switch (page) {
    case 'login':         initLoginPage();    break;
    case 'dashboard':     initDashboard();    break;
    case 'folders':       initFoldersPage();  break;
    case 'folder-detail': initFolderDetail(); break;
    case 'profile':       initProfilePage();  break;
  }
});

function detectPage() {
  var path = window.location.pathname;
  if (path.includes('login'))         return 'login';
  if (path.includes('dashboard'))     return 'dashboard';
  if (path.includes('folder-detail')) return 'folder-detail';
  if (path.includes('folders'))       return 'folders';
  if (path.includes('profile'))       return 'profile';
  return 'home';
}

// =====================================================
//  7a. TRANG LOGIN / REGISTER
// =====================================================

function initLoginPage() {
  if (getCurrentUser()) {
    window.location.href = 'dashboard.html';
    return;
  }

  var loginForm = document.getElementById('login-form');
  var registerForm = document.getElementById('register-form');
  var showRegister = document.getElementById('show-register');
  var showLogin = document.getElementById('show-login');
  var loginSection = document.getElementById('login-section');
  var registerSection = document.getElementById('register-section');

  showRegister.addEventListener('click', function(e) {
    e.preventDefault();
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
  });

  showLogin.addEventListener('click', function(e) {
    e.preventDefault();
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
  });

  // --- Login ---
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    var errBox = document.getElementById('login-error');
    errBox.classList.remove('show');

    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;

    if (!username || !password) {
      errBox.textContent = 'Vui long nhap day du thong tin.';
      errBox.classList.add('show');
      return;
    }

    var users = dbGetUsers();
    var user = users.find(function(u) { return u.username === username; });

    if (!user || !(await verifyPwd(password, user.password_salt, user.password_hash))) {
      errBox.textContent = 'Sai username hoac password.';
      errBox.classList.add('show');
      return;
    }

    setCurrentUser({ id: user.id, username: user.username });
    window.location.href = 'dashboard.html';
  });

  // --- Register ---
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    var errBox = document.getElementById('register-error');
    var sucBox = document.getElementById('register-success');
    errBox.classList.remove('show');
    sucBox.classList.remove('show');

    var username = document.getElementById('reg-username').value.trim();
    var password = document.getElementById('reg-password').value;
    var password2 = document.getElementById('reg-password2').value;

    if (!username || !password || !password2) {
      errBox.textContent = 'Vui long nhap day du thong tin.';
      errBox.classList.add('show');
      return;
    }
    if (password !== password2) {
      errBox.textContent = 'Password xac nhan khong khop.';
      errBox.classList.add('show');
      return;
    }
    if (password.length < 6) {
      errBox.textContent = 'Password phai it nhat 6 ky tu.';
      errBox.classList.add('show');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errBox.textContent = 'Username chi duoc chua chu cai, so va dau gach duoi.';
      errBox.classList.add('show');
      return;
    }

    var users = dbGetUsers();
    if (users.find(function(u) { return u.username === username; })) {
      errBox.textContent = 'Username da ton tai.';
      errBox.classList.add('show');
      return;
    }

    var salt = generateSalt();
    var hash = await hashPwd(password, salt);
    var userId = dbNextId('user');

    users.push({
      id: userId, username: username,
      password_hash: hash, password_salt: salt,
      created_at: new Date().toISOString()
    });
    dbSaveUsers(users);

    dbSaveProfile(userId, {
      user_id: userId, full_name: username.toUpperCase(),
      birthday: '', gender: '', city: '', school: '', year_level: '',
      avatar_url: 'avatar_1.png',
      barcode_id: 'PKT-' + String(userId).padStart(8, '0'),
      quote: ''
    });

    var defaultFolders = [
      { name: 'Emergency Fund', color_code: '#FFB6C1' },
      { name: 'Education',      color_code: '#D8B4FE' },
      { name: 'Investment',     color_code: '#93C5FD' },
      { name: 'Daily Needs',    color_code: '#FDE68A' },
      { name: 'Entertainment',  color_code: '#86EFAC' },
      { name: 'Savings',        color_code: '#FCA5A5' }
    ];
    dbSaveFolders(userId, defaultFolders.map(function(f) {
      return { id: dbNextId('folder'), user_id: userId, name: f.name, color_code: f.color_code };
    }));
    dbSaveRecords(userId, []);

    sucBox.textContent = 'Dang ky thanh cong! Dang chuyen huong...';
    sucBox.classList.add('show');
    registerForm.reset();
    setCurrentUser({ id: userId, username: username });
    setTimeout(function() { window.location.href = 'dashboard.html'; }, 1000);
  });
}

// =====================================================
//  7b. TRANG DASHBOARD / MONTHLY (Bieu do tron)
// =====================================================

function initDashboard() {
  var user = requireAuth();
  if (!user) return;

  var folders = dbGetFolders(user.id);
  var records = dbGetRecords(user.id);

  var labels = [];
  var data = [];
  var colors = [];

  folders.forEach(function(f) {
    var total = records
      .filter(function(r) { return r.folder_id === f.id && r.type === 'expense'; })
      .reduce(function(sum, r) { return sum + (Number(r.amount_or_content) || 0); }, 0);
    labels.push(f.name);
    data.push(total);
    colors.push(f.color_code);
  });

  var total = data.reduce(function(s, v) { return s + v; }, 0);
  var stats = { labels: labels, data: data, colors: colors, total: total };

  renderPieChart(stats);
  renderLegend(stats);
  renderTotal(stats.total);

  function renderPieChart(stats) {
    var ctx = document.getElementById('expense-chart').getContext('2d');

    if (stats.total === 0) {
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Chua co chi tieu'],
          datasets: [{ data: [1], backgroundColor: ['#e0e0e0'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
      });
      return;
    }

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: stats.labels,
        datasets: [{ data: stats.data, backgroundColor: stats.colors, borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                var value = context.parsed;
                var pct = ((value / stats.total) * 100).toFixed(1);
                return context.label + ': ' + formatVND(value) + ' VND (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  function renderLegend(stats) {
    var container = document.getElementById('chart-legend');
    if (stats.total === 0) {
      container.innerHTML = '<p class="legend-empty">Chua co chi tieu nao. Them record trong Folders!</p>';
      return;
    }
    container.innerHTML = stats.labels.map(function(label, i) {
      var pct = ((stats.data[i] / stats.total) * 100).toFixed(1);
      return '<div class="legend-item">' +
        '<span class="legend-color" style="background:' + escapeHtml(stats.colors[i]) + ';"></span>' +
        '<span class="legend-label">' + escapeHtml(label) + '</span>' +
        '<span class="legend-pct">' + pct + '%</span>' +
        '<span class="legend-value">' + formatVND(stats.data[i]) + ' VND</span>' +
        '</div>';
    }).join('');
  }

  function renderTotal(total) {
    document.getElementById('chart-total').innerHTML =
      'Tong chi tieu: <strong>' + formatVND(total) + ' VND</strong>';
  }
}

// =====================================================
//  7c. TRANG FOLDERS
// =====================================================

function initFoldersPage() {
  var user = requireAuth();
  if (!user) return;

  var allFolders = dbGetFolders(user.id);
  renderFolders(allFolders);

  function renderFolders(folders) {
    var grid = document.getElementById('folder-grid');
    grid.innerHTML = folders.map(function(f) {
      return '<div class="folder-wrapper" style="--folder-color: ' + escapeHtml(f.color_code) + ';" data-id="' + f.id + '">' +
        '<div class="folder-tab"></div>' +
        '<div class="folder-body"><span class="folder-label">' + escapeHtml(f.name) + '</span></div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.folder-wrapper').forEach(function(el) {
      el.addEventListener('click', function() {
        window.location.href = 'folder-detail.html?id=' + el.dataset.id;
      });
    });
  }

  document.getElementById('add-folder-fab').addEventListener('click', function() {
    document.getElementById('folder-modal').classList.add('active');
  });

  document.getElementById('folder-search').addEventListener('input', function(e) {
    var q = e.target.value.toLowerCase().trim();
    renderFolders(allFolders.filter(function(f) { return f.name.toLowerCase().includes(q); }));
  });

  var modal = document.getElementById('folder-modal');

  document.getElementById('btn-cancel-folder').addEventListener('click', function() {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.classList.remove('active');
  });

  document.getElementById('folder-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var name = document.getElementById('folder-name').value.trim();
    var color_code = document.getElementById('folder-color').value;
    if (!name) return;

    var safeColor = /^#[0-9A-Fa-f]{3,6}$/.test(color_code) ? color_code : '#FFB6C1';
    allFolders.push({ id: dbNextId('folder'), user_id: user.id, name: name, color_code: safeColor });
    dbSaveFolders(user.id, allFolders);

    modal.classList.remove('active');
    document.getElementById('folder-form').reset();
    renderFolders(allFolders);
  });
}

// =====================================================
//  7d. TRANG FOLDER DETAIL
// =====================================================

function initFolderDetail() {
  var user = requireAuth();
  if (!user) return;

  var params = new URLSearchParams(window.location.search);
  var folderId = Number(params.get('id'));
  if (!folderId) { window.location.href = 'folders.html'; return; }

  var folders = dbGetFolders(user.id);
  var folderInfo = folders.find(function(f) { return f.id === folderId; });

  if (folderInfo) {
    document.getElementById('folder-detail-name').textContent = folderInfo.name;
    document.getElementById('folder-detail-color').style.background = folderInfo.color_code;
  }

  function getFilteredRecords() {
    return dbGetRecords(user.id).filter(function(r) { return r.folder_id === folderId; });
  }

  var allRecords = getFilteredRecords();
  renderRecords(allRecords);

  function renderRecords(records) {
    var container = document.getElementById('records-list');
    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">&#128194;</div><p>Folder trong. Hay them record moi!</p></div>';
      return;
    }

    container.innerHTML = records.map(function(r) {
      return '<div class="record-item">' +
        '<span class="record-type ' + escapeHtml(r.type) + '">' + escapeHtml(r.type) + '</span>' +
        '<div class="record-info">' +
          '<div class="record-title">' + escapeHtml(r.title) + '</div>' +
          '<div class="record-sub">' + escapeHtml(r.amount_or_content || '') + '</div>' +
        '</div>' +
        '<span class="record-date">' + formatDate(r.date) + '</span>' +
        '<div class="record-actions">' +
          '<button class="btn-icon delete" data-id="' + r.id + '" title="Xoa">&#128465;&#65039;</button>' +
        '</div></div>';
    }).join('');

    container.querySelectorAll('.btn-icon.delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!confirm('Xoa record nay?')) return;
        var rid = Number(btn.dataset.id);
        var allUserRecords = dbGetRecords(user.id).filter(function(r) { return r.id !== rid; });
        dbSaveRecords(user.id, allUserRecords);
        allRecords = getFilteredRecords();
        renderRecords(allRecords);
      });
    });
  }

  document.getElementById('filter-type').addEventListener('change', function(e) {
    var t = e.target.value;
    renderRecords(t ? allRecords.filter(function(r) { return r.type === t; }) : allRecords);
  });

  var modal = document.getElementById('record-modal');
  var form = document.getElementById('record-form');

  document.getElementById('btn-add-record').addEventListener('click', function() {
    document.getElementById('modal-title').textContent = 'Them Record vao Folder';
    form.reset();
    document.getElementById('rec-edit-id').value = '';
    document.getElementById('rec-date').value = new Date().toISOString().split('T')[0];
    modal.classList.add('active');
  });

  document.getElementById('btn-cancel-record').addEventListener('click', function() {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.classList.remove('active');
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var newRecord = {
      id: dbNextId('record'),
      user_id: user.id,
      folder_id: folderId,
      type: document.getElementById('rec-type').value,
      title: document.getElementById('rec-title').value.trim(),
      amount_or_content: document.getElementById('rec-content').value.trim(),
      date: document.getElementById('rec-date').value || null
    };

    var allUserRecords = dbGetRecords(user.id);
    allUserRecords.push(newRecord);
    dbSaveRecords(user.id, allUserRecords);

    modal.classList.remove('active');
    allRecords = getFilteredRecords();
    renderRecords(allRecords);
  });
}

// =====================================================
//  7e. TRANG PROFILE (2 The ID Card canh nhau)
// =====================================================

function initProfilePage() {
  var user = requireAuth();
  if (!user) return;

  var profileData = dbGetProfile(user.id);
  if (profileData) renderProfile();

  function renderProfile() {
    if (!profileData) return;

    var displayName = profileData.full_name || user.username.toUpperCase();
    var displayBirthday = formatDate(profileData.birthday) || '\u2014';

    var avatarEmojis = {
      'avatar_1.png': '\uD83E\uDDD1', 'avatar_2.png': '\uD83D\uDC69',
      'avatar_3.png': '\uD83E\uDDD2', 'avatar_4.png': '\uD83D\uDC66', 'avatar_5.png': '\uD83D\uDC67'
    };
    var emoji = avatarEmojis[profileData.avatar_url] || '\uD83D\uDC64';

    document.getElementById('profile-name').textContent = displayName;
    document.getElementById('profile-birthday').textContent = displayBirthday;
    document.getElementById('profile-gender').textContent = profileData.gender || '\u2014';
    document.getElementById('profile-city').textContent = profileData.city || '\u2014';
    document.getElementById('avatar-placeholder-1').textContent = emoji;

    document.getElementById('profile-name-2').textContent = displayName;
    document.getElementById('profile-birthday-2').textContent = displayBirthday;
    document.getElementById('profile-school').textContent = profileData.school || '\u2014';
    document.getElementById('profile-year').textContent = profileData.year_level || '\u2014';
    document.getElementById('avatar-placeholder-2').textContent = emoji;

    var barcodeId = profileData.barcode_id || 'PKT-00000001';
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
    } catch(ex) { /* JsBarcode not loaded */ }
  }

  var modal = document.getElementById('profile-modal');

  document.getElementById('btn-edit-profile').addEventListener('click', function() {
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

  document.getElementById('btn-cancel-profile').addEventListener('click', function() {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.classList.remove('active');
  });

  document.getElementById('profile-form').addEventListener('submit', function(e) {
    e.preventDefault();

    profileData.full_name = document.getElementById('edit-fullname').value.trim();
    profileData.birthday = document.getElementById('edit-birthday').value;
    profileData.gender = document.getElementById('edit-gender').value;
    profileData.school = document.getElementById('edit-school').value.trim();
    profileData.city = document.getElementById('edit-city').value.trim();
    profileData.year_level = document.getElementById('edit-year').value.trim();
    profileData.avatar_url = document.getElementById('edit-avatar').value;
    profileData.quote = document.getElementById('edit-quote').value.trim();

    dbSaveProfile(user.id, profileData);
    modal.classList.remove('active');
    renderProfile();
  });
}