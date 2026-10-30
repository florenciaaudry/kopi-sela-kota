/**
 * KOPI SELA KOTA — Accounting Page
 */

let accTab = 'invoices';
let accSearch = '';

function renderAccounting(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Accounting</div>
        <div class="page-subtitle">Invoice, vendor bills, pembayaran, dan buku besar</div>
      </div>
      <div class="page-actions">
        ${getPermissions().canCreate ? `<button class="btn btn-primary" id="btn-new-invoice">+ Invoice Baru</button>` : ''}
      </div>
    </div>
    <div class="filter-toolbar">
      <button class="filter-btn ${accTab === 'invoices' ? 'active' : ''}" onclick="setAccTab('invoices')">📄 Customer Invoice</button>
      <button class="filter-btn ${accTab === 'bills' ? 'active' : ''}" onclick="setAccTab('bills')">📋 Vendor Bills</button>
      <button class="filter-btn ${accTab === 'journal' ? 'active' : ''}" onclick="setAccTab('journal')">📒 Journal Entries</button>
      <button class="filter-btn ${accTab === 'ledger' ? 'active' : ''}" onclick="setAccTab('ledger')">📊 General Ledger</button>
    </div>
    <div id="acc-tab-content"></div>
  `;
    document.getElementById('btn-new-invoice')?.addEventListener('click', () => openNewInvoiceModal());
    renderAccTab();
}

function setAccTab(tab) {
    accTab = tab;
    accSearch = '';
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active',
            (tab === 'invoices' && b.textContent.includes('Invoice')) ||
            (tab === 'bills' && b.textContent.includes('Vendor')) ||
            (tab === 'journal' && b.textContent.includes('Journal')) ||
            (tab === 'ledger' && b.textContent.includes('Ledger'))
        );
    });
    renderAccTab();
}

function renderAccTab() {
    const container = document.getElementById('acc-tab-content');
    if (!container) return;

    if (accTab === 'invoices') {
        const data = filterData(DB.invoices, accSearch, ['number', 'customer']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="search-bar-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="inv-acc-search" placeholder="Cari invoice..." value="${accSearch}"/>
          </div>
          ${getPermissions().canCreate ? `<button class="btn btn-primary btn-sm" onclick="openNewInvoiceModal()">+ Invoice Baru</button>` : ''}
        </div>
        ${renderTable(
            ['Nomor', 'Pelanggan', 'Tanggal', 'Jatuh Tempo', 'Total', 'Status', 'Pembayaran', 'Aksi'],
            data.map(i => [
                `<span class="doc-link">${i.number}</span>`,
                i.customer, formatDate(i.date), formatDate(i.dueDate),
                `<strong>${formatRp(i.amount)}</strong>`,
                badge(i.status), badge(i.paymentStatus),
                `<button class="btn btn-ghost btn-xs" onclick="showInvoiceDetail('${i.id}')">Detail</button>
             ${i.status === 'posted' && i.paymentStatus === 'pending' && getPermissions().canEdit ? `<button class="btn btn-success btn-xs" onclick="markInvoicePaid('${i.id}')">Tandai Lunas</button>` : ''}`,
            ])
        )}
      </div>
    `;
        document.getElementById('inv-acc-search')?.addEventListener('input', e => { accSearch = e.target.value; renderAccTab(); });
    }

    else if (accTab === 'bills') {
        const data = filterData(DB.vendorBills, accSearch, ['number', 'supplier']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="search-bar-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="bill-search" placeholder="Cari vendor bill..." value="${accSearch}"/>
          </div>
        </div>
        ${renderTable(
            ['Nomor', 'Supplier', 'Tanggal', 'Jatuh Tempo', 'Total', 'Status', 'Pembayaran', 'Aksi'],
            data.map(b => [
                `<span class="doc-link">${b.number}</span>`,
                b.supplier, formatDate(b.date), formatDate(b.dueDate),
                `<strong>${formatRp(b.amount)}</strong>`,
                badge(b.status), badge(b.paymentStatus),
                `<button class="btn btn-ghost btn-xs" onclick="showBillDetail('${b.id}')">Detail</button>
             ${b.paymentStatus === 'pending' && getPermissions().canEdit ? `<button class="btn btn-primary btn-xs" onclick="markBillPaid('${b.id}')">Bayar</button>` : ''}`,
            ])
        )}
      </div>
    `;
        document.getElementById('bill-search')?.addEventListener('input', e => { accSearch = e.target.value; renderAccTab(); });
    }

    else if (accTab === 'journal') {
        const data = filterData(DB.journalEntries, accSearch, ['number', 'reference', 'account']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="search-bar-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="je-search" placeholder="Cari journal entry..." value="${accSearch}"/>
          </div>
          ${getPermissions().canPostJournal ? `<button class="btn btn-primary btn-sm" onclick="openNewJEModal()">+ Journal Entry</button>` : ''}
        </div>
        ${renderTable(
            ['Nomor', 'Tanggal', 'Referensi', 'Akun', 'Debit', 'Kredit', 'Status'],
            data.map(j => [
                `<span class="doc-link">${j.number}</span>`,
                formatDate(j.date), j.reference, j.account,
                j.debit > 0 ? formatRp(j.debit) : '—',
                j.credit > 0 ? formatRp(j.credit) : '—',
                badge(j.status),
            ])
        )}
      </div>
    `;
        document.getElementById('je-search')?.addEventListener('input', e => { accSearch = e.target.value; renderAccTab(); });
    }

    else if (accTab === 'ledger') {
        const accounts = [
            { name: 'Kas & Bank', debit: 12450000, credit: 3200000, balance: 9250000 },
            { name: 'Piutang Usaha', debit: 10650000, credit: 1750000, balance: 8900000 },
            { name: 'Persediaan', debit: 3200000, credit: 1400000, balance: 1800000 },
            { name: 'Penjualan', debit: 0, credit: 10650000, balance: 10650000 },
            { name: 'Hutang Usaha', debit: 3200000, credit: 4330000, balance: 1130000 },
            { name: 'Modal', debit: 0, credit: 50000000, balance: 50000000 },
        ];
        container.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>📊 General Ledger — April 2025</h3><span class="demo-badge">Data Demo</span></div>
        ${renderTable(
            ['Nama Akun', 'Total Debit', 'Total Kredit', 'Saldo'],
            accounts.map(a => [
                `<strong>${a.name}</strong>`,
                formatRp(a.debit),
                formatRp(a.credit),
                `<strong style="color:var(--brand-purple)">${formatRp(a.balance)}</strong>`,
            ])
        )}
      </div>
    `;
    }
}

function showInvoiceDetail(id) {
    const i = DB.invoices.find(x => x.id === id);
    if (!i) return;
    openModal(`📄 ${i.number}`,
        `<div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Nomor</div><div class="detail-value">${i.number}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${badge(i.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Pelanggan</div><div class="detail-value">${i.customer}</div></div>
      <div class="detail-field"><div class="detail-label">Pembayaran</div><div class="detail-value">${badge(i.paymentStatus)}</div></div>
      <div class="detail-field"><div class="detail-label">Tanggal</div><div class="detail-value">${formatDate(i.date)}</div></div>
      <div class="detail-field"><div class="detail-label">Jatuh Tempo</div><div class="detail-value">${formatDate(i.dueDate)}</div></div>
      <div class="detail-field"><div class="detail-label">Total</div><div class="detail-value big">${formatRp(i.amount)}</div></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
     ${i.status === 'posted' && i.paymentStatus === 'pending' && getPermissions().canEdit ? `<button class="btn btn-success" onclick="markInvoicePaid('${id}')">Tandai Lunas</button>` : ''}`
    );
}

function markInvoicePaid(id) {
    const i = DB.invoices.find(x => x.id === id);
    if (!i) return;
    i.paymentStatus = 'paid';
    closeModal();
    showToast(`Invoice ${i.number} ditandai sebagai lunas.`, 'success');
    renderAccTab();
}

function showBillDetail(id) {
    const b = DB.vendorBills.find(x => x.id === id);
    if (!b) return;
    openModal(`📋 ${b.number}`,
        `<div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Nomor</div><div class="detail-value">${b.number}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${badge(b.status)}</div></div>
      <div class="detail-field"><div class="detail-label">Supplier</div><div class="detail-value">${b.supplier}</div></div>
      <div class="detail-field"><div class="detail-label">Pembayaran</div><div class="detail-value">${badge(b.paymentStatus)}</div></div>
      <div class="detail-field"><div class="detail-label">Total</div><div class="detail-value big">${formatRp(b.amount)}</div></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
     ${b.paymentStatus === 'pending' && getPermissions().canEdit ? `<button class="btn btn-primary" onclick="markBillPaid('${id}')">Tandai Lunas</button>` : ''}`
    );
}

function markBillPaid(id) {
    const b = DB.vendorBills.find(x => x.id === id);
    if (!b) return;
    b.paymentStatus = 'paid';
    closeModal();
    showToast(`Vendor bill ${b.number} ditandai sebagai lunas.`, 'success');
    renderAccTab();
}

function openNewInvoiceModal() {
    openModal('+ Invoice Baru',
        `<div class="form-grid form-grid-2">
      <div class="form-group full"><label class="form-label required">Pelanggan</label>
        <select class="form-select" id="ni-cust">
          ${DB.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Tanggal</label><input class="form-input" type="date" id="ni-date" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-group"><label class="form-label">Jatuh Tempo</label><input class="form-input" type="date" id="ni-due"></div>
      <div class="form-group full"><label class="form-label required">Total (Rp)</label><input class="form-input" type="number" id="ni-amount" placeholder="0"></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveNewInvoice()">Simpan as Draft</button>`
    );
}

function saveNewInvoice() {
    const custId = document.getElementById('ni-cust')?.value;
    const cust = DB.customers.find(c => c.id === custId);
    const amount = parseFloat(document.getElementById('ni-amount')?.value);
    if (!cust || !amount) { showToast('Pelanggan dan total wajib diisi.', 'error'); return; }
    const num = `INV/2025/${String(DB.invoices.length + 1).padStart(5, '0')}`;
    DB.invoices.unshift({ id: genId('INV'), number: num, customer: cust.name, date: document.getElementById('ni-date')?.value || new Date().toISOString().slice(0, 10), dueDate: document.getElementById('ni-due')?.value || '', amount, status: 'draft', paymentStatus: 'pending' });
    closeModal();
    showToast('Invoice baru berhasil dibuat.', 'success');
    renderAccTab();
}

function openNewJEModal() {
    openModal('+ Journal Entry',
        `<div style="background:var(--info-bg);padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px;color:var(--info);">
      ⚠️ Journal Entry hanya boleh dibuat oleh Finance dan Owner. Pastikan setiap entri sudah tervalidasi.
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label class="form-label">Tanggal</label><input class="form-input" type="date" id="nje-date" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-group"><label class="form-label">Referensi</label><input class="form-input" id="nje-ref" placeholder="Misal: INV/2025/00001"></div>
      <div class="form-group"><label class="form-label">Akun</label><input class="form-input" id="nje-account" placeholder="Nama akun"></div>
      <div class="form-group"><label class="form-label">Debit (Rp)</label><input class="form-input" type="number" id="nje-debit" placeholder="0"></div>
      <div class="form-group"><label class="form-label">Kredit (Rp)</label><input class="form-input" type="number" id="nje-credit" placeholder="0"></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveNewJE()">Posting</button>`
    );
}

function saveNewJE() {
    const account = document.getElementById('nje-account')?.value?.trim();
    if (!account) { showToast('Nama akun wajib diisi.', 'error'); return; }
    const num = `JE/2025/${String(DB.journalEntries.length + 1).padStart(5, '0')}`;
    DB.journalEntries.unshift({
        id: genId('JE'), number: num,
        date: document.getElementById('nje-date')?.value,
        reference: document.getElementById('nje-ref')?.value || '—',
        account,
        debit: parseFloat(document.getElementById('nje-debit')?.value) || 0,
        credit: parseFloat(document.getElementById('nje-credit')?.value) || 0,
        status: 'posted',
    });
    closeModal();
    showToast('Journal entry berhasil diposting.', 'success');
    renderAccTab();
}
