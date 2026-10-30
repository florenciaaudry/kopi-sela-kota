/**
 * KOPI SELA KOTA — UI Helpers
 * Toast notifications, modal management, sidebar rendering
 */

/* ─── TOAST ─────────────────────────────────────── */
function showToast(msg, type = 'default', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ─── MODAL ─────────────────────────────────────── */
function openModal(title, bodyHTML, footerHTML = '') {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    container.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" id="modal-close-btn">✕</button>
    </div>
    <div class="modal-body">${bodyHTML}</div>
    ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
  `;
    overlay.classList.remove('hidden');
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    document.getElementById('modal-container').innerHTML = '';
}

/* ─── SIDEBAR ────────────────────────────────────── */
function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    const user = Auth.user;
    const perms = getPermissions();
    const pages = perms.pages;

    let html = '';
    html += `<div class="nav-section-label">Menu</div>`;
    pages.forEach(page => {
        const item = NAV_ITEMS[page];
        if (!item) return;
        const active = Router.currentPage === page ? ' active' : '';
        html += `<button class="nav-item${active}" data-page="${page}">
      ${item.icon}
      <span class="nav-item-text">${item.label}</span>
    </button>`;
    });

    nav.innerHTML = html;

    nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            Router.navigate(btn.dataset.page);
            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('mobile-open');
        });
    });

    // User info in sidebar footer
    const sidebarUser = document.getElementById('sidebar-user');
    sidebarUser.innerHTML = `
    <div class="user-avatar">${user.avatar}</div>
    <div class="user-info">
      <div class="user-name">${user.name}</div>
      <div class="user-role">${user.role}</div>
    </div>
  `;

    // Header user
    const headerUser = document.getElementById('header-user');
    headerUser.innerHTML = `
    <div class="header-user-info">
      <div class="header-avatar">${user.avatar}</div>
      <div>
        <div class="header-user-name">${user.name}</div>
        <div class="header-user-role">${user.role}</div>
      </div>
    </div>
  `;
}

function updateActiveSidebarItem(page) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
}

function setBreadcrumb(parts) {
    const bc = document.getElementById('breadcrumb');
    if (!parts || parts.length === 0) { bc.innerHTML = ''; return; }
    let html = parts.map((p, i) => {
        if (i < parts.length - 1) return `<span>${p}</span><span class="breadcrumb-sep">›</span>`;
        return `<span>${p}</span>`;
    }).join('');
    bc.innerHTML = html;
}

/* ─── CONFIRM DIALOG ──────────────────────────────── */
function confirmDialog(title, message, icon = '🗑️') {
    return new Promise(resolve => {
        const body = `
      <div class="confirm-modal-inner">
        <div class="confirm-icon">${icon}</div>
        <div class="confirm-title">${title}</div>
        <div class="confirm-text">${message}</div>
      </div>
    `;
        const footer = `
      <button class="btn btn-secondary" id="confirm-cancel-btn">Batal</button>
      <button class="btn btn-danger" id="confirm-ok-btn">Hapus</button>
    `;
        openModal('Konfirmasi', body, footer);
        document.getElementById('confirm-ok-btn').addEventListener('click', () => { closeModal(); resolve(true); });
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => { closeModal(); resolve(false); });
    });
}

/* ─── SEARCH FILTER ───────────────────────────────── */
function filterData(data, query, fields) {
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(q)));
}

/* ─── STATUS BADGE ────────────────────────────────── */
function badge(status) {
    const map = {
        done: 'Selesai', draft: 'Draft', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan',
        posted: 'Posted', waiting: 'Menunggu', received: 'Diterima', sent: 'Terkirim',
        accepted: 'Diterima', processing: 'Diproses', active: 'Aktif', inactive: 'Nonaktif',
        paid: 'Lunas', partial: 'Sebagian', pending: 'Belum Bayar', open: 'Buka', closed: 'Tutup',
        'low-stock': 'Stok Rendah',
    };
    const label = map[status] || status;
    return `<span class="badge badge-${status}">${label}</span>`;
}

/* ─── RENDER TABLE ────────────────────────────────── */
function renderTable(headers, rows, options = {}) {
    if (rows.length === 0) {
        return `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <p>${options.emptyText || 'Tidak ada data ditemukan.'}</p>
    </div>`;
    }
    const ths = headers.map(h => `<th>${h}</th>`).join('');
    const trs = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
    <div class="table-pagination">
      <span class="pagination-info">${rows.length} baris data</span>
    </div>
  `;
}
