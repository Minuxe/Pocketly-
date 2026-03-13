/*
 * =====================================================
 *  FILE: main.js - Pocketly Frontend Logic
 * =====================================================
 *
 *  MODE: GitHub Pages (no Node.js server needed)
 *  Data stored in browser localStorage.
 *  Password hashed with SHA-256 (Web Crypto API).
 *
 *  SECTIONS:
 *    1. LOCAL DATABASE: CRUD data in localStorage
 *    2. PASSWORD HASHING: SHA-256 via Web Crypto API
 *    3. SEED DATA: Create sample data on first visit
 *    4. AUTH HELPERS: Login / logout
 *    5. UTILITY: escapeHtml, formatDate, formatVND
 *    6. PAGE ROUTER: Page navigation
 *    7. PAGES: Login, Monthly, Folders, Folder Detail, Profile
 */

// =====================================================
//  1. LOCAL DATABASE (localStorage replaces server + SQLite)
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
//  2. PASSWORD HASHING (SHA-256 via Web Crypto API)
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
//  3. SEED DATA (Create sample data on first visit)
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
  return d.toLocaleDateString('en-US');
}

function formatVND(num) {
  var n = Number(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('en-US');
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
//  7a. LOGIN / REGISTER PAGE
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
      errBox.textContent = 'Please fill in all fields.';
      errBox.classList.add('show');
      return;
    }

    var users = dbGetUsers();
    var user = users.find(function(u) { return u.username === username; });

    if (!user || !(await verifyPwd(password, user.password_salt, user.password_hash))) {
      errBox.textContent = 'Incorrect username or password.';
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
      errBox.textContent = 'Please fill in all fields.';
      errBox.classList.add('show');
      return;
    }
    if (password !== password2) {
      errBox.textContent = 'Passwords do not match.';
      errBox.classList.add('show');
      return;
    }
    if (password.length < 6) {
      errBox.textContent = 'Password must be at least 6 characters.';
      errBox.classList.add('show');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errBox.textContent = 'Username can only contain letters, numbers and underscores.';
      errBox.classList.add('show');
      return;
    }

    var users = dbGetUsers();
    if (users.find(function(u) { return u.username === username; })) {
      errBox.textContent = 'Username already exists.';
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

    sucBox.textContent = 'Registration successful! Redirecting...';
    sucBox.classList.add('show');
    registerForm.reset();
    setCurrentUser({ id: userId, username: username });
    setTimeout(function() { window.location.href = 'dashboard.html'; }, 1000);
  });
}

// =====================================================
//  7b. DASHBOARD / MONTHLY PAGE (Pie Chart)
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
          labels: ['No expenses yet'],
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
      container.innerHTML = '<p class="legend-empty">No expenses yet. Add records in Folders!</p>';
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
      'Total Expenses: <strong>' + formatVND(total) + ' VND</strong>';
  }
}

// =====================================================
//  7c. FOLDERS PAGE
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
        '<div class="folder-body"><span class="folder-label">' + escapeHtml(f.name) + '</span>' +
        '<button class="btn-delete-folder" data-id="' + f.id + '" title="Delete folder">&#128465;&#65039;</button></div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.folder-wrapper').forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (e.target.closest('.btn-delete-folder')) return;
        window.location.href = 'folder-detail.html?id=' + el.dataset.id;
      });
    });

    grid.querySelectorAll('.btn-delete-folder').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var folderId = Number(btn.dataset.id);
        var folder = allFolders.find(function(f) { return f.id === folderId; });
        if (!confirm('Delete folder "' + (folder ? folder.name : '') + '" and all its records?')) return;
        allFolders = allFolders.filter(function(f) { return f.id !== folderId; });
        dbSaveFolders(user.id, allFolders);
        var userRecords = dbGetRecords(user.id).filter(function(r) { return r.folder_id !== folderId; });
        dbSaveRecords(user.id, userRecords);
        renderFolders(allFolders);
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
//  7d. FOLDER DETAIL PAGE
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
      container.innerHTML = '<div class="empty-state"><div class="emoji">&#128194;</div><p>Folder is empty. Add a new record!</p></div>';
      return;
    }

    var typeIcons = { expense: '💰', income: '💵', task: '✅', note: '📝', reminder: '🔔', goal: '🎯', receipt: '🧾' };

    container.innerHTML = records.map(function(r) {
      var icon = typeIcons[r.type] || '';
      var priorityBadge = r.priority ? '<span class="record-priority priority-' + escapeHtml(r.priority) + '">' + escapeHtml(r.priority) + '</span>' : '';
      var tagsHtml = (r.tags && r.tags.length) ? '<div class="record-tags">' + r.tags.map(function(t) { return '<span class="record-tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '';
      return '<div class="record-item">' +
        '<span class="record-type ' + escapeHtml(r.type) + '">' + icon + ' ' + escapeHtml(r.type) + '</span>' +
        '<div class="record-info">' +
          '<div class="record-title">' + escapeHtml(r.title) + '</div>' +
          '<div class="record-sub">' + escapeHtml(r.amount_or_content || '') + '</div>' +
          tagsHtml +
        '</div>' +
        priorityBadge +
        '<span class="record-date">' + formatDate(r.date) + '</span>' +
        '<div class="record-actions">' +
          '<button class="btn-icon delete" data-id="' + r.id + '" title="Delete">&#128465;&#65039;</button>' +
        '</div></div>';
    }).join('');

    container.querySelectorAll('.btn-icon.delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!confirm('Delete this record?')) return;
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
    document.getElementById('modal-title').textContent = 'Add Record to Folder';
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
    var tagsRaw = (document.getElementById('rec-tags').value || '').trim();
    var tags = tagsRaw ? tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
    var newRecord = {
      id: dbNextId('record'),
      user_id: user.id,
      folder_id: folderId,
      type: document.getElementById('rec-type').value,
      title: document.getElementById('rec-title').value.trim(),
      amount_or_content: document.getElementById('rec-content').value.trim(),
      date: document.getElementById('rec-date').value || null,
      priority: document.getElementById('rec-priority').value || null,
      tags: tags
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
//  7e. PROFILE PAGE (Single centered card + Tabbed modal)
// =====================================================

// --- Extended emoji avatars list ---
var EMOJI_AVATARS = [
  { key: 'avatar_1.png',  emoji: '\uD83E\uDDD1', label: 'Person' },
  { key: 'avatar_2.png',  emoji: '\uD83D\uDC69', label: 'Woman' },
  { key: 'avatar_3.png',  emoji: '\uD83E\uDDD2', label: 'Child' },
  { key: 'avatar_4.png',  emoji: '\uD83D\uDC66', label: 'Boy' },
  { key: 'avatar_5.png',  emoji: '\uD83D\uDC67', label: 'Girl' },
  { key: 'avatar_6.png',  emoji: '\uD83D\uDE0E', label: 'Cool' },
  { key: 'avatar_7.png',  emoji: '\uD83E\uDD73', label: 'Party' },
  { key: 'avatar_8.png',  emoji: '\uD83E\uDDD1\u200D\uD83C\uDF93', label: 'Student' },
  { key: 'avatar_9.png',  emoji: '\uD83D\uDC78', label: 'Princess' },
  { key: 'avatar_10.png', emoji: '\uD83E\uDDB8', label: 'Hero' },
  { key: 'avatar_11.png', emoji: '\uD83D\uDC31', label: 'Cat' },
  { key: 'avatar_12.png', emoji: '\uD83D\uDC36', label: 'Dog' },
  { key: 'avatar_13.png', emoji: '\uD83E\uDD8A', label: 'Fox' },
  { key: 'avatar_14.png', emoji: '\uD83D\uDC3B', label: 'Bear' },
  { key: 'avatar_15.png', emoji: '\uD83E\uDD84', label: 'Unicorn' },
  { key: 'avatar_16.png', emoji: '\uD83C\uDF38', label: 'Flower' },
  { key: 'avatar_17.png', emoji: '\u2B50',       label: 'Star' },
  { key: 'avatar_18.png', emoji: '\uD83C\uDF19', label: 'Moon' },
];

var CARD_THEMES = [
  { key: 'pink',    label: 'Pink',    gradient: 'linear-gradient(135deg, #ffc0cb, #ffb6c1, #ffa6b8)' },
  { key: 'purple',  label: 'Purple',  gradient: 'linear-gradient(135deg, #e1bee7, #ce93d8, #ba68c8)' },
  { key: 'blue',    label: 'Blue',    gradient: 'linear-gradient(135deg, #bbdefb, #90caf9, #64b5f6)' },
  { key: 'green',   label: 'Green',   gradient: 'linear-gradient(135deg, #c8e6c9, #a5d6a7, #81c784)' },
  { key: 'yellow',  label: 'Yellow',  gradient: 'linear-gradient(135deg, #fff9c4, #fff176, #ffee58)' },
  { key: 'peach',   label: 'Peach',   gradient: 'linear-gradient(135deg, #ffe0b2, #ffcc80, #ffb74d)' },
  { key: 'mint',    label: 'Mint',    gradient: 'linear-gradient(135deg, #b2dfdb, #80cbc4, #4db6ac)' },
  { key: 'lavender',label: 'Lavender',gradient: 'linear-gradient(135deg, #d1c4e9, #b39ddb, #9575cd)' },
  { key: 'coral',   label: 'Coral',   gradient: 'linear-gradient(135deg, #ffcdd2, #ef9a9a, #e57373)' },
  { key: 'sky',     label: 'Sky',     gradient: 'linear-gradient(135deg, #b3e5fc, #81d4fa, #4fc3f7)' },
  { key: 'dark',    label: 'Dark',    gradient: 'linear-gradient(135deg, #37474f, #455a64, #546e7a)' },
  { key: 'gold',    label: 'Gold',    gradient: 'linear-gradient(135deg, #ffe082, #ffd54f, #ffca28)' },
];

var BORDER_STYLES = [
  { key: 'solid',  label: 'Classic',  css: '2px solid #333' },
  { key: 'double', label: 'Double',   css: '4px double #333' },
  { key: 'dashed', label: 'Dashed',   css: '2px dashed #555' },
  { key: 'dotted', label: 'Dotted',   css: '2px dotted #555' },
  { key: 'thick',  label: 'Bold',     css: '3px solid #111' },
  { key: 'none',   label: 'No Border',css: 'none' },
  { key: 'round',  label: 'Rounded',  css: '2px solid #333' },
  { key: 'shadow', label: 'Shadow',   css: '1px solid rgba(0,0,0,0.1)' },
];

var NAME_FONTS = [
  { key: 'nunito',   label: 'Nunito',     css: "'Nunito', sans-serif" },
  { key: 'fredoka',  label: 'Fredoka',    css: "'Fredoka One', cursive" },
  { key: 'pacifico', label: 'Pacifico',   css: "'Pacifico', cursive" },
  { key: 'monospace',label: 'Monospace',  css: "'Courier New', monospace" },
  { key: 'serif',    label: 'Serif',      css: "'Georgia', serif" },
  { key: 'comic',    label: 'Playful',    css: "'Comic Sans MS', cursive" },
];

function getCustomize(userId) {
  return JSON.parse(localStorage.getItem('pocketly_customize_' + userId) || 'null') || {};
}
function saveCustomize(userId, data) {
  localStorage.setItem('pocketly_customize_' + userId, JSON.stringify(data));
}

function initProfilePage() {
  var user = requireAuth();
  if (!user) return;

  var profileData = dbGetProfile(user.id);
  var customize = getCustomize(user.id);
  if (profileData) renderProfile();

  function setAvatarDisplay(frameEl, avatarData) {
    if (avatarData && avatarData.startsWith('data:image')) {
      frameEl.innerHTML = '<img src="' + avatarData + '" alt="avatar" style="width:100%;height:100%;object-fit:cover;" />';
    } else {
      var avatarEmojis = {};
      EMOJI_AVATARS.forEach(function(a) { avatarEmojis[a.key] = a.emoji; });
      var emoji = avatarEmojis[avatarData] || '\uD83D\uDC64';
      frameEl.innerHTML = '<div class="avatar-placeholder">' + emoji + '</div>';
    }
  }

  function applyCardTheme() {
    var card = document.querySelector('.id-card-main');
    if (!card) return;

    var theme = CARD_THEMES.find(function(t) { return t.key === customize.cardTheme; });
    card.style.background = theme ? theme.gradient : '';

    var border = BORDER_STYLES.find(function(b) { return b.key === customize.borderStyle; });
    card.style.border = border ? border.css : '';
    card.style.borderRadius = (customize.borderStyle === 'round') ? '24px' : '';
    card.style.boxShadow = (customize.borderStyle === 'shadow') ? '0 8px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' : '';

    if (customize.cardTheme === 'dark') {
      card.style.color = '#e0e0e0';
      card.querySelectorAll('.card-org').forEach(function(el) { el.style.color = '#e0e0e0'; el.style.borderColor = '#777'; });
      card.querySelectorAll('.info-field label').forEach(function(el) { el.style.color = '#aaa'; });
      card.querySelectorAll('.info-field .value').forEach(function(el) { el.style.color = '#fff'; });
    } else {
      card.style.color = '';
      card.querySelectorAll('.card-org').forEach(function(el) { el.style.color = ''; el.style.borderColor = ''; });
      card.querySelectorAll('.info-field label').forEach(function(el) { el.style.color = ''; });
      card.querySelectorAll('.info-field .value').forEach(function(el) { el.style.color = ''; });
    }

    var nameFont = NAME_FONTS.find(function(f) { return f.key === customize.nameFont; });
    var nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.style.fontFamily = nameFont ? nameFont.css : '';
  }

  function renderProfile() {
    if (!profileData) return;

    var displayName = profileData.full_name || user.username.toUpperCase();
    var displayBirthday = formatDate(profileData.birthday) || '\u2014';
    var avatarSrc = customize.uploadedAvatar || profileData.avatar_url;

    setAvatarDisplay(document.getElementById('avatar-frame-1'), avatarSrc);

    document.getElementById('profile-name').textContent = displayName;
    document.getElementById('profile-birthday').textContent = displayBirthday;
    document.getElementById('profile-gender').textContent = profileData.gender || '\u2014';
    document.getElementById('profile-city').textContent = profileData.city || '\u2014';
    document.getElementById('profile-school').textContent = profileData.school || '\u2014';
    document.getElementById('profile-year').textContent = profileData.year_level || '\u2014';

    var barcodeId = profileData.barcode_id || 'PKT-00000001';
    try {
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode('#barcode1', barcodeId, {
          format: 'CODE128', width: 1.8, height: 40,
          displayValue: true, fontSize: 11, margin: 0, background: 'transparent'
        });
      }
    } catch(ex) {}

    applyCardTheme();
  }

  // --- Modal Tabs ---
  var modal = document.getElementById('profile-modal');
  var tabs = modal.querySelectorAll('.modal-tab');
  var tabContents = modal.querySelectorAll('.modal-tab-content');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tabContents.forEach(function(c) { c.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  function openModal(tabName) {
    // Reset to specified tab
    tabs.forEach(function(t) { t.classList.remove('active'); });
    tabContents.forEach(function(c) { c.classList.remove('active'); });
    var targetTab = modal.querySelector('[data-tab="' + tabName + '"]');
    if (targetTab) targetTab.classList.add('active');
    var targetContent = document.getElementById(tabName);
    if (targetContent) targetContent.classList.add('active');
    modal.classList.add('active');
  }

  function closeModal() { modal.classList.remove('active'); }

  // Edit Profile button opens modal on Info tab
  document.getElementById('btn-edit-profile').addEventListener('click', function() {
    if (profileData) {
      document.getElementById('edit-fullname').value = profileData.full_name || '';
      document.getElementById('edit-birthday').value = profileData.birthday || '';
      document.getElementById('edit-gender').value = profileData.gender || '';
      document.getElementById('edit-school').value = profileData.school || '';
      document.getElementById('edit-city').value = profileData.city || '';
      document.getElementById('edit-year').value = profileData.year_level || '';
      document.getElementById('edit-quote').value = profileData.quote || '';
    }
    initCustomizeGrids();
    openModal('tab-info');
  });

  // Close buttons
  document.getElementById('btn-cancel-profile').addEventListener('click', closeModal);
  var closeAvatar = document.getElementById('btn-close-avatar');
  if (closeAvatar) closeAvatar.addEventListener('click', closeModal);
  var closeStyle = document.getElementById('btn-close-style');
  if (closeStyle) closeStyle.addEventListener('click', closeModal);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });

  // Save profile info
  document.getElementById('profile-form').addEventListener('submit', function(e) {
    e.preventDefault();
    profileData.full_name = document.getElementById('edit-fullname').value.trim();
    profileData.birthday = document.getElementById('edit-birthday').value;
    profileData.gender = document.getElementById('edit-gender').value;
    profileData.school = document.getElementById('edit-school').value.trim();
    profileData.city = document.getElementById('edit-city').value.trim();
    profileData.year_level = document.getElementById('edit-year').value.trim();
    profileData.quote = document.getElementById('edit-quote').value.trim();
    dbSaveProfile(user.id, profileData);
    closeModal();
    renderProfile();
  });

  // --- Customize Grids (initialized once on modal open) ---
  var gridsInitialized = false;

  function initCustomizeGrids() {
    if (gridsInitialized) return;
    gridsInitialized = true;

    // === Emoji Grid ===
    var emojiGrid = document.getElementById('emoji-grid');
    if (emojiGrid) {
      emojiGrid.innerHTML = EMOJI_AVATARS.map(function(a) {
        var isActive = (!customize.uploadedAvatar && profileData && profileData.avatar_url === a.key);
        return '<button type="button" class="emoji-btn' + (isActive ? ' active' : '') + '" data-key="' + escapeHtml(a.key) + '" title="' + escapeHtml(a.label) + '">' +
          '<span class="emoji-icon">' + a.emoji + '</span>' +
          '<span class="emoji-label">' + escapeHtml(a.label) + '</span></button>';
      }).join('');

      emojiGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.emoji-btn');
        if (!btn) return;
        customize.uploadedAvatar = null;
        saveCustomize(user.id, customize);
        profileData.avatar_url = btn.dataset.key;
        dbSaveProfile(user.id, profileData);
        renderProfile();
        updateEmojiActive();
        updateUploadPreview();
      });
    }

    // === Upload Avatar ===
    var uploadArea = document.getElementById('avatar-upload-area');
    var fileInput = document.getElementById('avatar-file-input');
    var removeBtn = document.getElementById('btn-remove-avatar');

    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', function() { fileInput.click(); });
      uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); uploadArea.classList.add('drag-over'); });
      uploadArea.addEventListener('dragleave', function() { uploadArea.classList.remove('drag-over'); });
      uploadArea.addEventListener('drop', function(e) {
        e.preventDefault(); uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
      });
      fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) processFile(fileInput.files[0]);
      });
      if (removeBtn) {
        removeBtn.addEventListener('click', function() {
          customize.uploadedAvatar = null;
          saveCustomize(user.id, customize);
          renderProfile(); updateUploadPreview(); updateEmojiActive();
        });
      }
    }

    function processFile(file) {
      var ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!ALLOWED.includes(file.type)) { alert('Only PNG, JPG, GIF, WEBP supported!'); return; }
      if (file.size > 2 * 1024 * 1024) { alert('Image too large! Max 2MB.'); return; }
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var max = 200, w = img.width, h = img.height;
          if (w > max || h > max) {
            if (w > h) { h = Math.round(h * max / w); w = max; }
            else { w = Math.round(w * max / h); h = max; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          customize.uploadedAvatar = canvas.toDataURL('image/png');
          saveCustomize(user.id, customize);
          renderProfile(); updateUploadPreview(); updateEmojiActive();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    updateUploadPreview();

    // === Theme Grid ===
    var themeGrid = document.getElementById('theme-grid');
    if (themeGrid) {
      themeGrid.innerHTML = CARD_THEMES.map(function(t) {
        return '<button type="button" class="theme-btn' + (customize.cardTheme === t.key ? ' active' : '') + '" data-key="' + escapeHtml(t.key) + '" title="' + escapeHtml(t.label) + '">' +
          '<span class="theme-swatch" style="background:' + t.gradient + ';"></span>' +
          '<span class="theme-label">' + escapeHtml(t.label) + '</span></button>';
      }).join('');
      themeGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.theme-btn');
        if (!btn) return;
        customize.cardTheme = btn.dataset.key;
        saveCustomize(user.id, customize); applyCardTheme();
        themeGrid.querySelectorAll('.theme-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    }

    // === Border Grid ===
    var borderGrid = document.getElementById('border-grid');
    if (borderGrid) {
      borderGrid.innerHTML = BORDER_STYLES.map(function(b) {
        return '<button type="button" class="border-btn' + (customize.borderStyle === b.key ? ' active' : '') + '" data-key="' + escapeHtml(b.key) + '">' +
          '<span class="border-preview" style="border:' + b.css + ';"></span>' +
          '<span class="border-label">' + escapeHtml(b.label) + '</span></button>';
      }).join('');
      borderGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.border-btn');
        if (!btn) return;
        customize.borderStyle = btn.dataset.key;
        saveCustomize(user.id, customize); applyCardTheme();
        borderGrid.querySelectorAll('.border-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    }

    // === Font Grid ===
    var fontGrid = document.getElementById('font-grid');
    if (fontGrid) {
      fontGrid.innerHTML = NAME_FONTS.map(function(f) {
        return '<button type="button" class="font-btn' + (customize.nameFont === f.key ? ' active' : '') + '" data-key="' + escapeHtml(f.key) + '" style="font-family:' + f.css + ';">' +
          escapeHtml(f.label) + '</button>';
      }).join('');
      fontGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.font-btn');
        if (!btn) return;
        customize.nameFont = btn.dataset.key;
        saveCustomize(user.id, customize); applyCardTheme();
        fontGrid.querySelectorAll('.font-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    }
  }

  function updateUploadPreview() {
    var preview = document.getElementById('upload-preview');
    var removeBtn = document.getElementById('btn-remove-avatar');
    if (!preview) return;
    if (customize.uploadedAvatar) {
      preview.innerHTML = '<img src="' + customize.uploadedAvatar + '" alt="preview" class="upload-thumb" />' +
        '<p class="upload-hint">Click to change image</p>';
      if (removeBtn) removeBtn.style.display = 'inline-block';
    } else {
      preview.innerHTML = '<span class="upload-icon">\uD83D\uDCE4</span>' +
        '<p>Drag & drop or click to choose image</p>' +
        '<p class="upload-hint">PNG, JPG, GIF — max 2MB</p>';
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  function updateEmojiActive() {
    var emojiGrid = document.getElementById('emoji-grid');
    if (!emojiGrid) return;
    emojiGrid.querySelectorAll('.emoji-btn').forEach(function(btn) {
      btn.classList.toggle('active', !customize.uploadedAvatar && profileData && profileData.avatar_url === btn.dataset.key);
    });
  }
}