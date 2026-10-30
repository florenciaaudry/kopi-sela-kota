/**
 * KOPI SELA KOTA — Inventory Page
 */

let invTab = 'products';
let invSearch = '';

function renderInventory(container) {
    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Inventory</div>
        <div class="page-subtitle">Kelola produk, stok, dan pergerakan barang</div>
      </div>
      <div class="page-actions">
        ${getPermissions().canCreate || Auth.role === 'Warehouse' ? `<button class="btn btn-primary" id="btn-stock-adj">📊 Stock Adjustment</button>` : ''}
        ${getPermissions().canCreate ? `<button class="btn btn-secondary" id="btn-new-inv">+ Produk Baru</button>` : ''}
      </div>
    </div>
    <div class="filter-toolbar">
      <button class="filter-btn ${invTab === 'products' ? 'active' : ''}" onclick="setInvTab('products')">📦 Produk</button>
      <button class="filter-btn ${invTab === 'movements' ? 'active' : ''}" onclick="setInvTab('movements')">🔄 Pergerakan Stok</button>
    </div>
    <div id="inv-tab-content"></div>
  `;

    document.getElementById('btn-new-inv')?.addEventListener('click', () => openNewProductModal());
    document.getElementById('btn-stock-adj')?.addEventListener('click', () => openStockAdjModal());
    renderInvTab();
}

function setInvTab(tab) {
    invTab = tab;
    invSearch = '';
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active',
            (tab === 'products' && b.textContent.includes('Produk')) ||
            (tab === 'movements' && b.textContent.includes('Pergerakan'))
        );
    });
    renderInvTab();
}

function renderInvTab() {
    const container = document.getElementById('inv-tab-content');
    if (!container) return;

    if (invTab === 'products') {
        const catFilters = ['Semua', 'Kopi', 'Non-Kopi', 'Pastry', 'Produk Retail'];
        const activeCat = window._invCat || 'Semua';
        let data = DB.products;
        if (activeCat !== 'Semua') data = data.filter(p => p.category === activeCat);
        data = filterData(data, invSearch, ['name', 'sku', 'category']);

        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-bar-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input class="search-bar" id="inv-search" placeholder="Cari produk, SKU..." value="${invSearch}"/>
            </div>
            ${catFilters.map(c => `<button class="filter-btn ${activeCat === c ? 'active' : ''}" onclick="window._invCat='${c}'; renderInvTab();">${c}</button>`).join('')}
          </div>
        </div>
        ${renderTable(
            ['', 'Produk', 'SKU', 'Kategori', 'Harga Jual', 'Harga Beli', 'Stok', 'Status', 'Aksi'],
            data.map(p => {
                const stockStatus = p.stock <= 0 ? 'out' : p.stock <= p.minStock ? 'low-stock' : 'active';
                const stockLabel = p.stock <= 0 ? 'Habis' : p.stock <= p.minStock ? 'Rendah' : 'Aman';
                return [
                    `<input type="checkbox">`,
                    `<div class="product-cell">
                <div class="product-thumb">${p.emoji}</div>
                <div><div class="product-name">${p.name}</div><div class="product-sku">Min: ${p.minStock}</div></div>
              </div>`,
                    `<span class="tag">${p.sku}</span>`,
                    p.category,
                    formatRp(p.price),
                    formatRp(p.cost),
                    `<strong style="color:${p.stock <= p.minStock ? 'var(--danger)' : 'var(--gray-900)'}">${p.stock}</strong>`,
                    badge(stockStatus === 'out' ? 'cancelled' : stockStatus),
                    `<button class="btn btn-ghost btn-xs" onclick="showProductDetail('${p.id}')">Detail</button>
               ${getPermissions().canEdit || Auth.role === 'Warehouse' ? `<button class="btn btn-ghost btn-xs" onclick="editProduct('${p.id}')">Edit</button>` : ''}`,
                ];
            })
        )}
      </div>
    `;
        document.getElementById('inv-search')?.addEventListener('input', e => {
            invSearch = e.target.value; renderInvTab();
        });
    }

    else if (invTab === 'movements') {
        const data = filterData(DB.stockMovements, invSearch, ['number', 'product', 'type', 'reference']);
        container.innerHTML = `
      <div class="card">
        <div class="table-toolbar">
          <div class="search-bar-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="sm-search" placeholder="Cari pergerakan..." value="${invSearch}"/>
          </div>
        </div>
        ${renderTable(
            ['Nomor', 'Tipe', 'Produk', 'Qty', 'UoM', 'Tanggal', 'Referensi', 'Status'],
            data.map(m => [
                `<span class="doc-link">${m.number}</span>`,
                `<span class="tag">${m.type}</span>`,
                m.product,
                `<strong style="color:${m.qty < 0 ? 'var(--danger)' : 'var(--success)'}">${m.qty > 0 ? '+' : ''}${m.qty}</strong>`,
                m.uom,
                formatDate(m.date),
                m.reference,
                badge(m.status),
            ])
        )}
      </div>
    `;
        document.getElementById('sm-search')?.addEventListener('input', e => {
            invSearch = e.target.value; renderInvTab();
        });
    }
}

function showProductDetail(id) {
    const p = DB.products.find(x => x.id === id);
    if (!p) return;
    openModal(`${p.emoji} ${p.name}`,
        `<div class="detail-section">
      <div class="detail-grid">
        <div class="detail-field"><div class="detail-label">SKU</div><div class="detail-value">${p.sku}</div></div>
        <div class="detail-field"><div class="detail-label">Kategori</div><div class="detail-value">${p.category}</div></div>
        <div class="detail-field"><div class="detail-label">Harga Jual</div><div class="detail-value big">${formatRp(p.price)}</div></div>
        <div class="detail-field"><div class="detail-label">Harga Beli</div><div class="detail-value">${formatRp(p.cost)}</div></div>
        <div class="detail-field"><div class="detail-label">Stok Saat Ini</div><div class="detail-value big" style="color:${p.stock <= p.minStock ? 'var(--danger)' : 'var(--success)'}">${p.stock}</div></div>
        <div class="detail-field"><div class="detail-label">Stok Minimum</div><div class="detail-value">${p.minStock}</div></div>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
     ${getPermissions().canEdit || Auth.role === 'Warehouse' ? `<button class="btn btn-primary" onclick="editProduct('${id}')">Edit Produk</button>` : ''}`
    );
}

function editProduct(id) {
    const p = DB.products.find(x => x.id === id);
    if (!p) return;
    openModal(`✏️ Edit Produk — ${p.name}`,
        `<div class="form-grid form-grid-2">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-input" id="ep-name" value="${p.name}"></div>
      <div class="form-group"><label class="form-label">Kategori</label>
        <select class="form-select" id="ep-cat">
          <option ${p.category === 'Kopi' ? 'selected' : ''}>Kopi</option>
          <option ${p.category === 'Non-Kopi' ? 'selected' : ''}>Non-Kopi</option>
          <option ${p.category === 'Pastry' ? 'selected' : ''}>Pastry</option>
          <option ${p.category === 'Produk Retail' ? 'selected' : ''}>Produk Retail</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Harga Jual (Rp)</label><input class="form-input" type="number" id="ep-price" value="${p.price}"></div>
      <div class="form-group"><label class="form-label">Harga Beli (Rp)</label><input class="form-input" type="number" id="ep-cost" value="${p.cost}"></div>
      <div class="form-group"><label class="form-label">Stok</label><input class="form-input" type="number" id="ep-stock" value="${p.stock}"></div>
      <div class="form-group"><label class="form-label">Stok Minimum</label><input class="form-input" type="number" id="ep-minStock" value="${p.minStock}"></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveEditProduct('${id}')">Simpan</button>`
    );
}

function saveEditProduct(id) {
    const p = DB.products.find(x => x.id === id);
    if (!p) return;
    p.name = document.getElementById('ep-name').value;
    p.category = document.getElementById('ep-cat').value;
    p.price = parseFloat(document.getElementById('ep-price').value) || p.price;
    p.cost = parseFloat(document.getElementById('ep-cost').value) || p.cost;
    p.stock = parseInt(document.getElementById('ep-stock').value) || 0;
    p.minStock = parseInt(document.getElementById('ep-minStock').value) || p.minStock;
    saveProducts();
    closeModal();
    showToast('Produk berhasil diperbarui.', 'success');
    renderInvTab();
}

function openNewProductModal() {
    openModal('+ Produk Baru',
        `<div class="form-grid form-grid-2">
      <div class="form-group"><label class="form-label required">Nama Produk</label><input class="form-input" id="np-name" placeholder="Nama produk"></div>
      <div class="form-group"><label class="form-label">SKU</label><input class="form-input" id="np-sku" placeholder="AUTO"></div>
      <div class="form-group"><label class="form-label">Kategori</label>
        <select class="form-select" id="np-cat">
          <option>Kopi</option><option>Non-Kopi</option><option>Pastry</option><option>Produk Retail</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Emoji</label><input class="form-input" id="np-emoji" value="☕" placeholder="☕"></div>
      <div class="form-group"><label class="form-label">Harga Jual</label><input class="form-input" type="number" id="np-price" placeholder="0"></div>
      <div class="form-group"><label class="form-label">Harga Beli</label><input class="form-input" type="number" id="np-cost" placeholder="0"></div>
      <div class="form-group"><label class="form-label">Stok Awal</label><input class="form-input" type="number" id="np-stock" placeholder="0"></div>
      <div class="form-group"><label class="form-label">Stok Minimum</label><input class="form-input" type="number" id="np-min" placeholder="10"></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="saveNewProduct()">Simpan</button>`
    );
}

function saveNewProduct() {
    const name = document.getElementById('np-name')?.value?.trim();
    if (!name) { showToast('Nama produk wajib diisi.', 'error'); return; }
    const id = genId('P');
    const sku = document.getElementById('np-sku')?.value?.trim() || `PRD-${id.slice(-4)}`;
    DB.products.push({
        id, name, sku,
        category: document.getElementById('np-cat')?.value || 'Kopi',
        emoji: document.getElementById('np-emoji')?.value || '☕',
        price: parseFloat(document.getElementById('np-price')?.value) || 0,
        cost: parseFloat(document.getElementById('np-cost')?.value) || 0,
        stock: parseInt(document.getElementById('np-stock')?.value) || 0,
        minStock: parseInt(document.getElementById('np-min')?.value) || 10,
        image: null,
    });
    saveProducts();
    closeModal();
    showToast('Produk baru berhasil ditambahkan.', 'success');
    renderInvTab();
}

function openStockAdjModal() {
    openModal('📊 Stock Adjustment',
        `<div class="form-grid form-grid-2">
      <div class="form-group full"><label class="form-label required">Produk</label>
        <select class="form-select" id="sa-product">
          ${DB.products.map(p => `<option value="${p.id}">${p.name} (stok: ${p.stock})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label required">Kuantitas Baru</label><input class="form-input" type="number" id="sa-qty" placeholder="Stok aktual"></div>
      <div class="form-group"><label class="form-label">Alasan</label><input class="form-input" id="sa-reason" placeholder="Misal: Stock opname"></div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-primary" onclick="applyStockAdj()">Terapkan</button>`
    );
}

function applyStockAdj() {
    const id = document.getElementById('sa-product')?.value;
    const qty = parseInt(document.getElementById('sa-qty')?.value);
    if (!id || isNaN(qty)) { showToast('Pilih produk dan masukkan kuantitas.', 'error'); return; }
    const p = DB.products.find(x => x.id === id);
    if (!p) return;
    const diff = qty - p.stock;
    p.stock = qty;
    DB.stockMovements.unshift({
        id: genId('SM'), number: `WH/ADJ/2025/${String(DB.stockMovements.length + 1).padStart(4, '0')}`,
        type: 'Penyesuaian', product: p.name, qty: diff, uom: 'pcs',
        date: new Date().toISOString().slice(0, 10), status: 'done', reference: 'Stock Adjustment'
    });
    saveProducts();
    closeModal();
    showToast(`Stok ${p.name} diperbarui ke ${qty}.`, 'success');
    renderInvTab();
}
