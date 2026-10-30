/**
 * KOPI SELA KOTA — Sales & CRM Page
 */

let salesTab = 'customers';
let salesSearch = '';

function renderSales(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Sales &amp; CRM</div>
        <div class="page-subtitle">Kelola pelanggan, quotation, dan sales order</div>
      </div>
      <div class="page-actions">
        ${getPermissions().canCreate ? `<button class="btn btn-primary" id="btn-new-sales">+ Buat Baru</button>` : ''}
      </div>
    </div>

    <!-- TABS -->
    <div class="filter-toolbar" style="margin-bottom:16px;">
      <button class="filter-btn ${salesTab === 'customers' ? 'active' : ''}" onclick="setSalesTab('customers')">👥 Pelanggan</button>
      <button class="filter-btn ${salesTab === 'quotations' ? 'active' : ''}" onclick="setSalesTab('quotations')">📋 Quotation</button>
      <button class="filter-btn ${salesTab === 'orders' ? 'active' : ''}" onclick="setSalesTab('orders')">🛒 Sales Order</button>
    </div>

    <div id="sales-tab-content"></div>
  `;

    if (getPermissions().canCreate) {
        document.getElementById('btn-new-sales')?.addEventListener('click', () => openNewRecordModal());
    }

    renderSalesTab();
}

function setSalesTab(tab) {
    salesTab = tab;
    salesSearch = '';
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.toLowerCase().includes(tab.substring(0, 4)));
    });
    renderSalesTab();
}

function renderSalesTab() {
    const container = document.getElementById('sales-tab-content');
    if (!container) return;

    if (salesTab === 'customers') {
        const data = filterData(DB.customers, salesSearch, ['name', 'email', 'phone']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-bar-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input class="search-bar" id="cust-search" placeholder="Cari pelanggan..." value="${salesSearch}"/>
            </div>
            <button class="btn btn-secondary btn-sm">⬇ Import</button>
            <button class="btn btn-secondary btn-sm">⬆ Export</button>
          </div>
        </div>
        ${renderTable(
            ['', 'Nama', 'Email', 'Telepon', 'Piutang', 'Status', 'Aksi'],
            data.map(c => [
                `<input type="checkbox">`,
                `<div class="customer-cell"><div class="customer-avatar">${c.name.charAt(0)}</div><div><div class="product-name">${c.name}</div><div class="product-sku">${c.id}</div></div></div>`,
                c.email,
                c.phone,
                `<span class="font-semibold">${formatRp(c.piutang)}</span>`,
                badge(c.status),
                `<button class="btn btn-ghost btn-xs" onclick="showCustomerDetail('${c.id}')">Detail</button>
             ${getPermissions().canEdit ? `<button class="btn btn-ghost btn-xs" onclick="editCustomer('${c.id}')">Edit</button>` : ''}`,
            ])
        )}
      </div>
    `;
        document.getElementById('cust-search')?.addEventListener('input', e => {
            salesSearch = e.target.value;
            renderSalesTab();
        });
    }

    else if (salesTab === 'quotations') {
        const data = filterData(DB.quotations, salesSearch, ['number', 'customer']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-bar-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input class="search-bar" id="qt-search" placeholder="Cari quotation..." value="${salesSearch}"/>
            </div>
          </div>
          <div class="table-toolbar-right">
            ${getPermissions().canCreate ? `<button class="btn btn-primary btn-sm" onclick="openNewRecordModal()">+ Quotation</button>` : ''}
          </div>
        </div>
        ${renderTable(
            ['Nomor', 'Pelanggan', 'Tanggal', 'Total', 'Status', 'Salesperson', 'Aksi'],
            data.map(q => [
                `<span class="doc-link">${q.number}</span>`,
                q.customer,
                formatDate(q.date),
                formatRp(q.amount),
                badge(q.status),
                q.salesperson,
                `<button class="btn btn-ghost btn-xs" onclick="showQTDetail('${q.id}')">Detail</button>`,
            ])
        )}
      </div>
    `;
        document.getElementById('qt-search')?.addEventListener('input', e => {
            salesSearch = e.target.value;
            renderSalesTab();
        });
    }

    else if (salesTab === 'orders') {
        const statusFilters = ['all', 'done', 'confirmed', 'draft', 'cancelled'];
        const activeFilter = window._soFilter || 'all';
        let data = DB.salesOrders;
        if (activeFilter !== 'all') data = data.filter(o => o.status === activeFilter);
        data = filterData(data, salesSearch, ['number', 'customer']);

        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-bar-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input class="search-bar" id="so-search" placeholder="Cari sales order..." value="${salesSearch}"/>
            </div>
            ${statusFilters.map(f => `<button class="filter-btn ${activeFilter === f ? 'active' : ''}" onclick="window._soFilter='${f}'; renderSalesTab();">${f === 'all' ? 'Semua' : badge(f)}</button>`).join('')}
          </div>
          <div class="table-toolbar-right">
            ${getPermissions().canCreate ? `<button class="btn btn-primary btn-sm" onclick="openNewRecordModal()">+ Sales Order</button>` : ''}
          </div>
        </div>
        ${renderTable(
            ['Nomor', 'Pelanggan', 'Tanggal', 'Item', 'Total', 'Status', 'Aksi'],
            data.map(o => [
                `<span class="doc-link">${o.number}</span>`,
                o.customer,
                formatDate(o.date),
                `${o.items} item`,
                `<strong>${formatRp(o.amount)}</strong>`,
                badge(o.status),
                `<button class="btn btn-ghost btn-xs" onclick="showSODetail('${o.id}')">Detail</button>`,
            ])
        )}
      </div>
    `;
        document.getElementById('so-search')?.addEventListener('input', e => {
            salesSearch = e.target.value;
            renderSalesTab();
        });
    }
}

function showCustomerDetail(id) {
    const c = DB.customers.find(x => x.id === id);
    if (!c) return;
    openModal(`👥 Detail Pelanggan — ${c.name}`,
        `<div class="detail-section">
      <div class="detail-grid">
        <div class="detail-field"><div class="detail-label">ID</div><div class="detail-value">${c.id}</div></div>
        <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${badge(c.status)}</div></div>
        <div class="detail-field"><div class="detail-label">Email</div><div class="detail-value">${c.email}</div></div>
        <div class="detail-field"><div class="detail-label">Telepon</div><div class="detail-value">${c.phone}</div></div>
        <div class="detail-field"><div class="detail-label">Total Piutang</div><div class="detail-value big">${formatRp(c.piutang)}</div></div>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>`
    );
}

function showSODetail(id) {
    const o = DB.salesOrders.find(x => x.id === id);
    if (!o) return;
    openModal(`🛒 ${o.number}`,
        `<div class="detail-section">
      <div class="detail-grid">
        <div class="detail-field"><div class="detail-label">Nomor</div><div class="detail-value">${o.number}</div></div>
        <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${badge(o.status)}</div></div>
        <div class="detail-field"><div class="detail-label">Pelanggan</div><div class="detail-value">${o.customer}</div></div>
        <div class="detail-field"><div class="detail-label">Tanggal</div><div class="detail-value">${formatDate(o.date)}</div></div>
        <div class="detail-field"><div class="detail-label">Jumlah Item</div><div class="detail-value">${o.items}</div></div>
        <div class="detail-field"><div class="detail-label">Total</div><div class="detail-value big">${formatRp(o.amount)}</div></div>
        <div class="detail-field"><div class="detail-label">Salesperson</div><div class="detail-value">${o.salesperson}</div></div>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>`
    );
}

function showQTDetail(id) {
    const q = DB.quotations.find(x => x.id === id);
    if (!q) return;
    openModal(`📋 ${q.number}`,
        `<div class="detail-section">
      <div class="detail-grid">
        <div class="detail-field"><div class="detail-label">Nomor</div><div class="detail-value">${q.number}</div></div>
        <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${badge(q.status)}</div></div>
        <div class="detail-field"><div class="detail-label">Pelanggan</div><div class="detail-value">${q.customer}</div></div>
        <div class="detail-field"><div class="detail-label">Tanggal</div><div class="detail-value">${formatDate(q.date)}</div></div>
        <div class="detail-field"><div class="detail-label">Total</div><div class="detail-value big">${formatRp(q.amount)}</div></div>
        <div class="detail-field"><div class="detail-label">Salesperson</div><div class="detail-value">${q.salesperson}</div></div>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
     ${q.status === 'draft' ? `<button class="btn btn-primary" onclick="confirmSendQT('${q.id}')">Kirim ke Pelanggan</button>` : ''}`
    );
}

function confirmSendQT(id) {
    const q = DB.quotations.find(x => x.id === id);
    if (!q) return;
    q.status = 'sent';
    closeModal();
    showToast(`Quotation ${q.number} telah dikirim.`, 'success');
    renderSalesTab();
}

function editCustomer(id) {
    const c = DB.customers.find(x => x.id === id);
    if (!c) return;
    openModal(`✏️ Edit Pelanggan`,
        `<div class="form-grid form-grid-2">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-input" id="ec-name" value="${c.name}"></div>
      <div class="form-group"><label class="form-label required">Email</label><input class="form-input" id="ec-email" value="${c.email}"></div>
      <div class="form-group"><label class="form-label">Telepon</label><input class="form-input" id="ec-phone" value="${c.phone}"></div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-select" id="ec-status">
          <option value="active" ${c.status === 'active' ? 'selected' : ''}>Aktif</option>
          <option value="inactive" ${c.status === 'inactive' ? 'selected' : ''}>Nonaktif</option>
        </select>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveEditCustomer('${id}')">Simpan</button>`
    );
}

function saveEditCustomer(id) {
    const c = DB.customers.find(x => x.id === id);
    if (!c) return;
    c.name = document.getElementById('ec-name').value;
    c.email = document.getElementById('ec-email').value;
    c.phone = document.getElementById('ec-phone').value;
    c.status = document.getElementById('ec-status').value;
    closeModal();
    showToast('Data pelanggan berhasil disimpan.', 'success');
    renderSalesTab();
}

function openNewRecordModal() {
    if (salesTab === 'customers') {
        openModal('+ Tambah Pelanggan',
            `<div class="form-grid form-grid-2">
        <div class="form-group"><label class="form-label required">Nama</label><input class="form-input" id="nc-name" placeholder="Nama pelanggan"></div>
        <div class="form-group"><label class="form-label required">Email</label><input class="form-input" id="nc-email" placeholder="email@contoh.id"></div>
        <div class="form-group"><label class="form-label">Telepon</label><input class="form-input" id="nc-phone" placeholder="08xx-xxxx-xxxx"></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="nc-status"><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>
      </div>`,
            `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
       <button class="btn btn-primary" onclick="saveNewCustomer()">Simpan</button>`
        );
    }
}

function saveNewCustomer() {
    const name = document.getElementById('nc-name')?.value?.trim();
    const email = document.getElementById('nc-email')?.value?.trim();
    if (!name || !email) { showToast('Nama dan email wajib diisi.', 'error'); return; }
    DB.customers.push({ id: genId('C'), name, email, phone: document.getElementById('nc-phone')?.value || '-', piutang: 0, status: document.getElementById('nc-status')?.value || 'active' });
    closeModal();
    showToast('Pelanggan baru berhasil ditambahkan.', 'success');
    renderSalesTab();
}
