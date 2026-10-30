/**
 * KOPI SELA KOTA — Settings Page
 */

let settingsTab = 'users';

function renderSettings(container) {
    if (Auth.role !== 'Owner') {
        container.innerHTML = `
      <div class="empty-state" style="height:60vh;">
        <span style="font-size:48px;">🔒</span>
        <p style="font-size:16px;font-weight:600;color:var(--gray-700);">Akses Ditolak</p>
        <p>Halaman Settings hanya dapat diakses oleh Owner.</p>
      </div>
    `;
        return;
    }

    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Settings</div>
        <div class="page-subtitle">Kelola pengguna, role, dan hak akses sistem</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-add-user">+ Tambah Pengguna</button>
      </div>
    </div>

    <div class="filter-toolbar">
      <button class="filter-btn ${settingsTab === 'users' ? 'active' : ''}" onclick="setSettingsTab('users')">👥 Pengguna &amp; Role</button>
      <button class="filter-btn ${settingsTab === 'roles' ? 'active' : ''}" onclick="setSettingsTab('roles')">🔑 Hak Akses</button>
      <button class="filter-btn ${settingsTab === 'system' ? 'active' : ''}" onclick="setSettingsTab('system')">⚙️ Sistem</button>
    </div>

    <div id="settings-tab-content"></div>
  `;

    document.getElementById('btn-add-user')?.addEventListener('click', () => openAddUserModal());
    renderSettingsTab();
}

function setSettingsTab(tab) {
    settingsTab = tab;
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active',
            (tab === 'users' && b.textContent.includes('Pengguna')) ||
            (tab === 'roles' && b.textContent.includes('Hak')) ||
            (tab === 'system' && b.textContent.includes('Sistem'))
        );
    });
    renderSettingsTab();
}

function renderSettingsTab() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;

    if (settingsTab === 'users') {
        container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>👥 Daftar Pengguna</h3>
          <span class="text-sm text-muted">${DB.users.length} pengguna terdaftar</span>
        </div>
        ${renderTable(
            ['Avatar', 'Nama', 'Email', 'Role', 'Status', 'Aksi'],
            DB.users.map(u => [
                `<div class="user-avatar" style="background:var(--brand-purple);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${u.avatar}</div>`,
                `<strong>${u.name}</strong>`,
                u.email,
                `<span class="tag">${u.role}</span>`,
                badge(u.status),
                `<button class="btn btn-ghost btn-xs" onclick="editUser('${u.id}')">Edit</button>
             ${u.id !== Auth.user.id ? `<button class="btn btn-danger btn-xs" onclick="toggleUserStatus('${u.id}')">${u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</button>` : '<span class="text-muted text-xs">(Anda)</span>'}`,
            ])
        )}
      </div>
    `;
    }

    else if (settingsTab === 'roles') {
        const roleData = [
            { role: 'Owner', pages: 'Dashboard, Sales, Purchase, Inventory, Accounting, POS, Reports, Settings', canCreate: '✓', canPostJournal: '✓', canManageUsers: '✓' },
            { role: 'Sales', pages: 'Dashboard, Sales, Reports', canCreate: '✓', canPostJournal: '✗', canManageUsers: '✗' },
            { role: 'Warehouse', pages: 'Dashboard, Inventory, Reports', canCreate: '✗', canPostJournal: '✗', canManageUsers: '✗' },
            { role: 'Procurement', pages: 'Dashboard, Purchase, Inventory, Reports', canCreate: '✓', canPostJournal: '✗', canManageUsers: '✗' },
            { role: 'Finance', pages: 'Dashboard, Accounting, Reports', canCreate: '✓', canPostJournal: '✓', canManageUsers: '✗' },
            { role: 'Cashier', pages: 'POS', canCreate: '✗', canPostJournal: '✗', canManageUsers: '✗' },
        ];
        container.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>🔑 Hak Akses per Role</h3><span class="demo-badge">Konfigurasi</span></div>
        ${renderTable(
            ['Role', 'Halaman yang Dapat Diakses', 'Buat Data', 'Post Jurnal', 'Kelola User'],
            roleData.map(r => [
                `<span class="tag" style="background:rgba(75,37,99,0.1);color:var(--brand-purple)">${r.role}</span>`,
                `<span class="text-sm text-muted">${r.pages}</span>`,
                `<span style="color:${r.canCreate === '✓' ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">${r.canCreate}</span>`,
                `<span style="color:${r.canPostJournal === '✓' ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">${r.canPostJournal}</span>`,
                `<span style="color:${r.canManageUsers === '✓' ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">${r.canManageUsers}</span>`,
            ])
        )}
      </div>
    `;
    }

    else if (settingsTab === 'system') {
        container.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>⚙️ Pengaturan Sistem</h3><span class="demo-badge">Mode Demo</span></div>
        <div class="card-body">
          <div class="form-grid form-grid-2" style="margin-bottom:20px;">
            <div class="form-group">
              <label class="form-label">Nama Toko</label>
              <input class="form-input" value="Kopi Sela Kota" readonly style="background:var(--gray-50);">
            </div>
            <div class="form-group">
              <label class="form-label">Mata Uang</label>
              <input class="form-input" value="IDR (Rupiah)" readonly style="background:var(--gray-50);">
            </div>
            <div class="form-group">
              <label class="form-label">Pajak Default</label>
              <input class="form-input" value="PPN 11%" readonly style="background:var(--gray-50);">
            </div>
            <div class="form-group">
              <label class="form-label">Zona Waktu</label>
              <input class="form-input" value="WIB (UTC+7)" readonly style="background:var(--gray-50);">
            </div>
          </div>
          <hr class="divider">
          <div style="margin-top:16px;">
            <p class="text-sm text-muted" style="margin-bottom:12px;">⚠️ Peringatan: Tombol berikut akan menghapus semua data demo (transaksi POS, stok yang diubah, sesi kasir) dari browser storage.</p>
            <button class="btn btn-danger" onclick="if(confirm('Reset semua data demo? Tindakan ini tidak dapat dibatalkan.')) resetDemoData();">
              🗑️ Reset Data Demo
            </button>
          </div>
        </div>
      </div>
    `;
    }
}

function editUser(id) {
    const u = DB.users.find(x => x.id === id);
    if (!u) return;
    openModal(`✏️ Edit Pengguna — ${u.name}`,
        `<div class="form-grid form-grid-2">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-input" id="eu-name" value="${u.name}"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="eu-email" value="${u.email}" ${u.id === Auth.user.id ? 'readonly style="background:var(--gray-50);"' : ''}></div>
      <div class="form-group"><label class="form-label">Role</label>
        <select class="form-select" id="eu-role" ${u.id === Auth.user.id ? 'disabled' : ''}>
          ${['Owner', 'Sales', 'Warehouse', 'Procurement', 'Finance', 'Cashier'].map(r => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" id="eu-status" ${u.id === Auth.user.id ? 'disabled' : ''}>
          <option value="active" ${u.status === 'active' ? 'selected' : ''}>Aktif</option>
          <option value="inactive" ${u.status === 'inactive' ? 'selected' : ''}>Nonaktif</option>
        </select>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveEditUser('${id}')">Simpan</button>`
    );
}

function saveEditUser(id) {
    const u = DB.users.find(x => x.id === id);
    if (!u) return;
    u.name = document.getElementById('eu-name')?.value || u.name;
    u.email = document.getElementById('eu-email')?.value || u.email;
    if (id !== Auth.user.id) {
        u.role = document.getElementById('eu-role')?.value || u.role;
        u.status = document.getElementById('eu-status')?.value || u.status;
        u.avatar = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }
    closeModal();
    showToast('Data pengguna berhasil diperbarui.', 'success');
    renderSettingsTab();
}

function toggleUserStatus(id) {
    const u = DB.users.find(x => x.id === id);
    if (!u || u.id === Auth.user.id) return;
    u.status = u.status === 'active' ? 'inactive' : 'active';
    showToast(`${u.name} ${u.status === 'active' ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
    renderSettingsTab();
}

function openAddUserModal() {
    openModal('+ Tambah Pengguna Baru',
        `<div class="form-grid form-grid-2">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-input" id="nu-name" placeholder="Nama lengkap"></div>
      <div class="form-group"><label class="form-label required">Email</label><input class="form-input" id="nu-email" placeholder="email@kopiselakota.id"></div>
      <div class="form-group"><label class="form-label">Role</label>
        <select class="form-select" id="nu-role">
          ${['Owner', 'Sales', 'Warehouse', 'Procurement', 'Finance', 'Cashier'].map(r => `<option>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" id="nu-pw" placeholder="Min. 6 karakter"></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveNewUser()">Tambahkan</button>`
    );
}

function saveNewUser() {
    const name = document.getElementById('nu-name')?.value?.trim();
    const email = document.getElementById('nu-email')?.value?.trim();
    const pw = document.getElementById('nu-pw')?.value;
    if (!name || !email || !pw) { showToast('Nama, email, dan password wajib diisi.', 'error'); return; }
    if (DB.users.find(u => u.email === email)) { showToast('Email sudah digunakan.', 'error'); return; }
    const role = document.getElementById('nu-role')?.value;
    DB.users.push({ id: genId('U'), name, email, password: pw, role, avatar: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(), status: 'active' });
    closeModal();
    showToast(`Pengguna ${name} berhasil ditambahkan.`, 'success');
    renderSettingsTab();
}
