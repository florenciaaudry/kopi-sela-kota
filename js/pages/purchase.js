/**
 * KOPI SELA KOTA — Purchase Page
 */

let purchaseTab = 'suppliers';
let purchaseSearch = '';

function renderPurchase(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Purchase</div>
        <div class="page-subtitle">Kelola supplier, RFQ, dan purchase order</div>
      </div>
      <div class="page-actions">
        ${getPermissions().canCreate ? `<button class="btn btn-primary" id="btn-new-po">+ Baru</button>` : ''}
      </div>
    </div>
    <div class="filter-toolbar">
      <button class="filter-btn ${purchaseTab === 'suppliers' ? 'active' : ''}" onclick="setPurchaseTab('suppliers')">🏭 Supplier</button>
      <button class="filter-btn ${purchaseTab === 'rfqs' ? 'active' : ''}" onclick="setPurchaseTab('rfqs')">📋 RFQ</button>
      <button class="filter-btn ${purchaseTab === 'orders' ? 'active' : ''}" onclick="setPurchaseTab('orders')">📦 Purchase Order</button>
    </div>
    <div id="purchase-tab-content"></div>
  `;

    document.getElementById('btn-new-po')?.addEventListener('click', () => openNewPOModal());
    renderPurchaseTab();
}

function setPurchaseTab(tab) {
    purchaseTab = tab;
    purchaseSearch = '';
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active',
            (tab === 'suppliers' && b.textContent.includes('Supplier')) ||
            (tab === 'rfqs' && b.textContent.includes('RFQ')) ||
            (tab === 'orders' && b.textContent.includes('Purchase'))
        );
    });
    renderPurchaseTab();
}

function renderPurchaseTab() {
    const container = document.getElementById('purchase-tab-content');
    if (!container) return;

    if (purchaseTab === 'suppliers') {
        const data = filterData(DB.suppliers, purchaseSearch, ['name', 'email', 'kota']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="search-bar-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="sup-search" placeholder="Cari supplier..." value="${purchaseSearch}"/>
          </div>
        </div>
        ${renderTable(
            ['Nama', 'Email', 'Telepon', 'Kota', 'Status', 'Aksi'],
            data.map(s => [
                `<strong>${s.name}</strong><br><small class="text-muted">${s.id}</small>`,
                s.email, s.phone, s.kota, badge(s.status),
                `<button class="btn btn-ghost btn-xs" onclick="showSupplierDetail('${s.id}')">Detail</button>`,
            ])
        )}
      </div>
    `;
        document.getElementById('sup-search')?.addEventListener('input', e => {
            purchaseSearch = e.target.value; renderPurchaseTab();
        });
    }

    else if (purchaseTab === 'rfqs') {
        const data = filterData(DB.rfqs, purchaseSearch, ['number', 'supplier']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="search-bar-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="rfq-search" placeholder="Cari RFQ..." value="${purchaseSearch}"/>
          </div>
          ${getPermissions().canCreate ? `<button class="btn btn-primary btn-sm" onclick="openNewPOModal()">+ RFQ</button>` : ''}
        </div>
        ${renderTable(
            ['Nomor', 'Supplier', 'Tanggal', 'Total', 'Status', 'Aksi'],
            data.map(r => [
                `<span class="doc-link">${r.number}</span>`,
                r.supplier, formatDate(r.date), formatRp(r.amount), badge(r.status),
                `<button class="btn btn-ghost btn-xs" onclick="showPODetail('rfq','${r.id}')">Detail</button>
             ${r.status === 'draft' ? `<button class="btn btn-primary btn-xs" onclick="sendRFQ('${r.id}')">Kirim</button>` : ''}`,
            ])
        )}
      </div>
    `;
        document.getElementById('rfq-search')?.addEventListener('input', e => {
            purchaseSearch = e.target.value; renderPurchaseTab();
        });
    }

    else if (purchaseTab === 'orders') {
        const data = filterData(DB.purchaseOrders, purchaseSearch, ['number', 'supplier']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="search-bar-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="po-search" placeholder="Cari purchase order..." value="${purchaseSearch}"/>
          </div>
        </div>
        ${renderTable(
            ['Nomor', 'Supplier', 'Tanggal', 'Item', 'Total', 'Status', 'Aksi'],
            data.map(o => [
                `<span class="doc-link">${o.number}</span>`,
                o.supplier, formatDate(o.date), `${o.items} item`, formatRp(o.amount), badge(o.status),
                `<button class="btn btn-ghost btn-xs" onclick="showPODetail('po','${o.id}')">Detail</button>`,
            ])
        )}
      </div>
    `;
        document.getElementById('po-search')?.addEventListener('input', e => {
            purchaseSearch = e.target.value; renderPurchaseTab();
        });
    }
}

function showSupplierDetail(id) {
    const s = DB.suppliers.find(x => x.id === id);
    if (!s) return;
    openModal(`🏭 Detail Supplier`,
        `<div class="detail-grid">
      <div class="detail-field"><div class="detail-label">ID</div><div class="detail-value">${s.id}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${badge(s.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Nama</div><div class="detail-value">${s.name}</div></div>
      <div class="detail-field"><div class="detail-label">Email</div><div class="detail-value">${s.email}</div></div>
      <div class="detail-field"><div class="detail-label">Telepon</div><div class="detail-value">${s.phone}</div></div>
      <div class="detail-field"><div class="detail-label">Kota</div><div class="detail-value">${s.kota}</div></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>`
    );
}

function showPODetail(type, id) {
    const src = type === 'po' ? DB.purchaseOrders : DB.rfqs;
    const o = src.find(x => x.id === id);
    if (!o) return;
    openModal(`📦 ${o.number}`,
        `<div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Nomor</div><div class="detail-value">${o.number}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${badge(o.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Supplier</div><div class="detail-value">${o.supplier}</div></div>
      <div class="detail-field"><div class="detail-label">Tanggal</div><div class="detail-value">${formatDate(o.date)}</div></div>
      <div class="detail-field"><div class="detail-label">Total</div><div class="detail-value big">${formatRp(o.amount)}</div></div>
      ${o.items !== undefined ? `<div class="detail-field"><div class="detail-label">Jumlah Item</div><div class="detail-value">${o.items}</div></div>` : ''}
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>`
    );
}

function sendRFQ(id) {
    const r = DB.rfqs.find(x => x.id === id);
    if (!r) return;
    r.status = 'sent';
    closeModal();
    showToast(`RFQ ${r.number} berhasil dikirim ke supplier.`, 'success');
    renderPurchaseTab();
}

function openNewPOModal() {
    if (purchaseTab === 'orders' || purchaseTab === 'rfqs') {
        const isRFQ = purchaseTab === 'rfqs';
        openModal(`+ Buat ${isRFQ ? 'RFQ' : 'Purchase Order'} Baru`,
            `<div class="form-grid form-grid-2">
        <div class="form-group full"><label class="form-label required">Supplier</label>
          <select class="form-select" id="npo-supplier">
            ${DB.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Tanggal</label><input class="form-input" type="date" id="npo-date" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="form-group"><label class="form-label">Total (perkiraan)</label><input class="form-input" type="number" id="npo-amount" placeholder="0"></div>
        <div class="form-group full"><label class="form-label">Catatan</label><textarea class="form-input" id="npo-notes" placeholder="Catatan tambahan..."></textarea></div>
      </div>`,
            `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
       <button class="btn btn-primary" onclick="saveNewPO(${isRFQ})">Simpan sebagai Draft</button>`
        );
    } else {
        openModal('+ Tambah Supplier Baru',
            `<div class="form-grid form-grid-2">
        <div class="form-group"><label class="form-label required">Nama</label><input class="form-input" id="ns-name" placeholder="Nama supplier"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="ns-email" placeholder="email@supplier.id"></div>
        <div class="form-group"><label class="form-label">Telepon</label><input class="form-input" id="ns-phone" placeholder="021-xxxx"></div>
        <div class="form-group"><label class="form-label">Kota</label><input class="form-input" id="ns-kota" placeholder="Jakarta"></div>
      </div>`,
            `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
       <button class="btn btn-primary" onclick="saveNewSupplier()">Simpan</button>`
        );
    }
}

function saveNewPO(isRFQ) {
    const suppId = document.getElementById('npo-supplier')?.value;
    const supp = DB.suppliers.find(s => s.id === suppId);
    if (!supp) return;
    const date = document.getElementById('npo-date')?.value || new Date().toISOString().slice(0, 10);
    const amount = parseFloat(document.getElementById('npo-amount')?.value || 0);
    const num = isRFQ
        ? `RFQ/2025/${String(DB.rfqs.length + 1).padStart(5, '0')}`
        : `PO/2025/${String(DB.purchaseOrders.length + 1).padStart(5, '0')}`;
    const rec = { id: genId(isRFQ ? 'RFQ' : 'PO'), number: num, supplier: supp.name, date, amount, status: 'draft', items: 0 };
    if (isRFQ) DB.rfqs.unshift(rec); else DB.purchaseOrders.unshift(rec);
    closeModal();
    showToast(`${isRFQ ? 'RFQ' : 'Purchase Order'} berhasil dibuat sebagai draft.`, 'success');
    renderPurchaseTab();
}

function saveNewSupplier() {
    const name = document.getElementById('ns-name')?.value?.trim();
    if (!name) { showToast('Nama supplier wajib diisi.', 'error'); return; }
    DB.suppliers.push({ id: genId('SUP'), name, email: document.getElementById('ns-email')?.value || '', phone: document.getElementById('ns-phone')?.value || '-', kota: document.getElementById('ns-kota')?.value || '-', status: 'active' });
    closeModal();
    showToast('Supplier baru berhasil ditambahkan.', 'success');
    renderPurchaseTab();
}
