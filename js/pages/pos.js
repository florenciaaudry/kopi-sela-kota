/**
 * KOPI SELA KOTA — Point of Sale Page
 */

// ─── POS STATE ──────────────────────────────────────────
let posCart = [];
let posSearchQuery = '';
let posActiveCategory = 'Semua';

function renderPOS(container) {
    document.body.classList.add('pos-mode');
    // POS gets special full-height layout — remove content padding
    container.style.padding = '0';
    container.style.overflow = 'hidden';
    container.style.height = 'calc(100vh - 56px)';

    const hasSession = !!DB.posSession;

    container.innerHTML = `
    <div class="pos-layout">
      <!-- LEFT: Products -->
      <div class="pos-left">
        ${!hasSession ? renderOpenSessionBanner() : renderSessionBanner()}
        <div class="pos-toolbar">
          <div class="search-bar-wrap pos-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="search-bar" id="pos-search-input" placeholder="Cari produk..." style="width:100%;">
          </div>
        </div>
        <div class="pos-categories" id="pos-cats"></div>
        <div class="pos-products" id="pos-product-grid"></div>
      </div>

      <!-- RIGHT: Cart -->
      <div class="pos-right">
        <div class="pos-cart-header">
          <h3>🛒 Keranjang</h3>
          <span class="cart-count-badge" id="cart-count">0</span>
        </div>
        <div class="pos-cart-items" id="cart-items"></div>
        <div class="pos-cart-footer">
          <div class="cart-summary" id="cart-summary"></div>
          <div class="pos-action-btns">
            <button class="btn btn-hold w-full" id="btn-hold-order" onclick="holdOrder()">⏸ Tahan Order</button>
            <button class="btn btn-pay w-full" id="btn-pay" onclick="openPaymentModal()">💳 Bayar</button>
          </div>
        </div>
      </div>
    </div>
  `;

    renderPOSCategories();
    renderPOSProducts();
    renderCart();

    document.getElementById('pos-search-input')?.addEventListener('input', e => {
        posSearchQuery = e.target.value;
        renderPOSProducts();
    });
}

function renderOpenSessionBanner() {
    return `<div class="session-banner" style="background:var(--warning-bg);border-color:rgba(217,119,6,0.2);">
    <span class="session-banner-info" style="color:var(--warning);">⚠️ Sesi kasir belum dibuka. Buka sesi untuk mulai menerima transaksi.</span>
    <button class="btn btn-warning btn-sm" onclick="openStartSessionModal()">Buka Sesi</button>
  </div>`;
}

function renderSessionBanner() {
    const s = DB.posSession;
    return `<div class="session-banner">
    <span class="session-banner-info">🟢 Sesi aktif · Kasir: <strong>${s.cashierName}</strong> · Mulai: <strong>${formatDateTime(s.startTime)}</strong></span>
    <button class="btn btn-danger btn-sm" onclick="openCloseSessionModal()">Tutup Sesi</button>
  </div>`;
}

function renderPOSCategories() {
    const cats = ['Semua', ...new Set(DB.products.map(p => p.category))];
    const el = document.getElementById('pos-cats');
    if (!el) return;
    el.innerHTML = cats.map(c =>
        `<button class="pos-cat-btn ${posActiveCategory === c ? 'active' : ''}" onclick="setPOSCategory('${c}')">${c}</button>`
    ).join('');
}

function setPOSCategory(cat) {
    posActiveCategory = cat;
    renderPOSCategories();
    renderPOSProducts();
}

function renderPOSProducts() {
    const grid = document.getElementById('pos-product-grid');
    if (!grid) return;

    let products = DB.products;
    if (posActiveCategory !== 'Semua') products = products.filter(p => p.category === posActiveCategory);
    if (posSearchQuery) products = products.filter(p =>
        p.name.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(posSearchQuery.toLowerCase())
    );

    if (products.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p>Tidak ada produk ditemukan.</p></div>`;
        return;
    }

    grid.innerHTML = `<div class="pos-product-grid">
    ${products.map(p => {
        const isOut = p.stock <= 0;
        const isLow = !isOut && p.stock <= p.minStock;
        const stockClass = isOut ? 'out' : isLow ? 'low' : '';
        const stockLabel = isOut ? 'Habis' : `${p.stock}`;
        return `
        <div class="pos-product-card ${isOut ? 'out-of-stock' : ''}" onclick="${isOut ? '' : `addToCart('${p.id}')`}">
          <span class="pos-product-stock ${stockClass}">${stockLabel}</span>
          <div class="pos-product-img">${p.emoji}</div>
          <div class="pos-product-name">${p.name}</div>
          <div class="pos-product-category">${p.category}</div>
          <div class="pos-product-price">${formatRp(p.price)}</div>
        </div>
      `;
    }).join('')}
  </div>`;
}

function addToCart(productId) {
    if (!DB.posSession) {
        showToast('Buka sesi kasir terlebih dahulu.', 'warning');
        return;
    }
    const product = DB.products.find(p => p.id === productId);
    if (!product || product.stock <= 0) { showToast('Produk habis.', 'error'); return; }
    const existing = posCart.find(i => i.productId === productId);
    if (existing) {
        if (existing.qty >= product.stock) { showToast('Stok tidak mencukupi.', 'error'); return; }
        existing.qty++;
    } else {
        posCart.push({ productId, name: product.name, emoji: product.emoji, price: product.price, qty: 1 });
    }
    renderCart();
    showToast(`${product.emoji} ${product.name} ditambahkan.`, 'success', 1200);
}

function changeCartQty(productId, delta) {
    const idx = posCart.findIndex(i => i.productId === productId);
    if (idx < 0) return;
    posCart[idx].qty += delta;
    if (posCart[idx].qty <= 0) posCart.splice(idx, 1);
    renderCart();
}

function removeFromCart(productId) {
    posCart = posCart.filter(i => i.productId !== productId);
    renderCart();
}

function renderCart() {
    const itemsEl = document.getElementById('cart-items');
    const summaryEl = document.getElementById('cart-summary');
    const countEl = document.getElementById('cart-count');
    const payBtn = document.getElementById('btn-pay');
    const holdBtn = document.getElementById('btn-hold-order');

    if (!itemsEl) return;

    const totalQty = posCart.reduce((s, i) => s + i.qty, 0);
    const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = 0;
    const tax = Math.round(subtotal * 0.11);
    const total = subtotal - discount + tax;

    if (countEl) countEl.textContent = totalQty;
    if (payBtn) payBtn.disabled = posCart.length === 0;
    if (holdBtn) holdBtn.disabled = posCart.length === 0;

    if (posCart.length === 0) {
        itemsEl.innerHTML = `<div class="cart-empty">
      <span style="font-size:40px;">🛒</span>
      <p>Keranjang kosong.<br>Klik produk untuk menambahkan.</p>
    </div>`;
    } else {
        itemsEl.innerHTML = posCart.map(item => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatRp(item.price)} / pcs</div>
        </div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn minus" onclick="changeCartQty('${item.productId}', -1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeCartQty('${item.productId}', 1)">+</button>
        </div>
        <div class="cart-item-total">${formatRp(item.price * item.qty)}</div>
        <button class="cart-item-del" onclick="removeFromCart('${item.productId}')" title="Hapus item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    `).join('');
    }

    if (summaryEl) {
        summaryEl.innerHTML = `
      <div class="cart-summary-row"><span>Subtotal</span><span>${formatRp(subtotal)}</span></div>
      <div class="cart-summary-row discount"><span>Diskon</span><span>− ${formatRp(discount)}</span></div>
      <div class="cart-summary-row"><span>PPN 11%</span><span>${formatRp(tax)}</span></div>
      <div class="cart-summary-row total"><span>Total</span><span>${formatRp(total)}</span></div>
    `;
    }
}

function getCartTotal() {
    const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = Math.round(subtotal * 0.11);
    return { subtotal, discount: 0, tax, total: subtotal + tax };
}

/* ─── PAYMENT ─────────────────────────────────────── */
let paymentMethod = 'cash';
let paymentAmount = 0;

function openPaymentModal() {
    if (posCart.length === 0) { showToast('Keranjang kosong.', 'error'); return; }
    const { subtotal, discount, tax, total } = getCartTotal();

    openModal('💳 Pembayaran',
        `<div class="payment-modal">
      <div class="payment-summary-box">
        <div class="payment-summary-title">Ringkasan Tagihan</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;color:var(--gray-600);">
          <span>${posCart.length} item · Subtotal</span><span>${formatRp(subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;color:var(--success);">
          <span>Diskon</span><span>− ${formatRp(discount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;color:var(--gray-600);">
          <span>PPN 11%</span><span>${formatRp(tax)}</span>
        </div>
        <hr class="divider" style="margin:8px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:14px;font-weight:600;color:var(--gray-700);">Total Tagihan</span>
          <span class="payment-total-large" id="pm-total-display">${formatRp(total)}</span>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div class="payment-summary-title">Metode Pembayaran</div>
        <div class="payment-methods">
          <button class="payment-method-btn selected" id="pm-cash" onclick="selectPaymentMethod('cash')">
            <span class="method-icon">💵</span><span class="method-label">Tunai</span>
          </button>
          <button class="payment-method-btn" id="pm-transfer" onclick="selectPaymentMethod('transfer')">
            <span class="method-icon">🏦</span><span class="method-label">Transfer</span>
          </button>
          <button class="payment-method-btn" id="pm-qris" onclick="selectPaymentMethod('qris')">
            <span class="method-icon">📱</span><span class="method-label">QRIS</span>
          </button>
        </div>
      </div>

      <div class="payment-input-section" id="pm-input-section">
        <div class="payment-input-label">Jumlah Pembayaran (Rp)</div>
        <input type="number" class="form-input payment-input-big" id="pm-amount-input"
          value="${total}" min="${total}"
          oninput="updatePaymentChange(${total})">
      </div>

      <div class="payment-change-row" id="pm-change-row">
        <span class="payment-change-label">Kembalian</span>
        <span class="payment-change-value" id="pm-change-display">${formatRp(0)}</span>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-success btn-lg" id="btn-confirm-pay" onclick="confirmPayment(${total})">✓ Konfirmasi Pembayaran</button>`
    );

    paymentMethod = 'cash';
    paymentAmount = total;
}

function selectPaymentMethod(method) {
    paymentMethod = method;
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById(`pm-${method}`)?.classList.add('selected');
    const inputSection = document.getElementById('pm-input-section');
    const changeRow = document.getElementById('pm-change-row');
    if (method !== 'cash') {
        if (inputSection) inputSection.style.display = 'none';
        if (changeRow) changeRow.style.display = 'none';
    } else {
        if (inputSection) inputSection.style.display = '';
        if (changeRow) changeRow.style.display = '';
    }
}

function updatePaymentChange(total) {
    const amt = parseFloat(document.getElementById('pm-amount-input')?.value) || 0;
    const change = Math.max(0, amt - total);
    const el = document.getElementById('pm-change-display');
    if (el) el.textContent = formatRp(change);
    paymentAmount = amt;
}

function confirmPayment(total) {
    const paid = paymentMethod === 'cash' ? (parseFloat(document.getElementById('pm-amount-input')?.value) || 0) : total;
    if (paymentMethod === 'cash' && paid < total) {
        showToast('Pembayaran tunai kurang dari total tagihan.', 'error');
        return;
    }

    // Deduct stock
    posCart.forEach(item => {
        const product = DB.products.find(p => p.id === item.productId);
        if (product) product.stock = Math.max(0, product.stock - item.qty);
    });
    saveProducts();

    // Save transaction
    const trxNum = `POS/${new Date().getFullYear()}/${String(DB.posTransactions.length + 1).padStart(5, '0')}`;
    const trx = {
        id: genId('TRX'),
        number: trxNum,
        cashier: Auth.user.name,
        date: new Date().toISOString(),
        items: posCart.map(i => ({ ...i })),
        subtotal: posCart.reduce((s, i) => s + i.price * i.qty, 0),
        discount: 0,
        tax: Math.round(posCart.reduce((s, i) => s + i.price * i.qty, 0) * 0.11),
        total,
        paid,
        change: Math.max(0, paid - total),
        method: paymentMethod,
    };
    DB.posTransactions.push(trx);
    savePosTransactions();

    if (DB.posSession) DB.posSession.transactions.push(trx.id);
    savePosSession();

    const cartSnapshot = [...posCart];
    posCart = [];
    renderCart();
    renderPOSProducts();

    closeModal();
    showReceiptModal(trx);
}

/* ─── RECEIPT ─────────────────────────────────────── */
function showReceiptModal(trx) {
    const methodLabel = { cash: 'Tunai', transfer: 'Transfer Bank', qris: 'QRIS' };
    openModal('🧾 Struk Transaksi',
        `<div class="receipt-paper">
      <div class="receipt-header">
        <div class="receipt-success-icon">✅</div>
        <div style="font-size:18px;font-weight:800;color:var(--success);">Transaksi Berhasil!</div>
        <hr class="divider">
        <div class="receipt-store-name">Kopi Sela Kota</div>
        <div class="receipt-store-sub">STRUK PEMBAYARAN</div>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-meta">
        <span>No. Transaksi: <strong>${trx.number}</strong></span>
        <span>Kasir: ${trx.cashier}</span>
        <span>Tanggal: ${formatDateTime(trx.date)}</span>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-items">
        ${trx.items.map(i => `
          <div class="receipt-item">
            <div>
              <div class="receipt-item-name">${i.emoji} ${i.name}</div>
              <div class="receipt-item-qty">${i.qty} × ${formatRp(i.price)}</div>
            </div>
            <div class="receipt-item-price">${formatRp(i.price * i.qty)}</div>
          </div>
        `).join('')}
      </div>
      <hr class="receipt-divider">
      <div class="receipt-totals">
        <div class="receipt-total-row"><span>Subtotal</span><span>${formatRp(trx.subtotal)}</span></div>
        <div class="receipt-total-row"><span>Diskon</span><span>− ${formatRp(trx.discount)}</span></div>
        <div class="receipt-total-row"><span>PPN 11%</span><span>${formatRp(trx.tax)}</span></div>
        <div class="receipt-total-row grand-total"><span>Total</span><span>${formatRp(trx.total)}</span></div>
        <div class="receipt-total-row" style="color:var(--gray-500);font-size:12px;margin-top:4px;">
          <span>Metode</span><span>${methodLabel[trx.method]}</span>
        </div>
        ${trx.method === 'cash' ? `
        <div class="receipt-total-row" style="color:var(--gray-500);font-size:12px;">
          <span>Dibayar</span><span>${formatRp(trx.paid)}</span>
        </div>
        <div class="receipt-total-row" style="color:var(--success);font-weight:700;">
          <span>Kembalian</span><span>${formatRp(trx.change)}</span>
        </div>` : ''}
      </div>
      <div class="receipt-footer">
        ☕ Terima kasih! Good Coffee, Better Days.<br>
        <span style="font-size:10px;color:var(--gray-300);">STRUK INI ADALAH DEMO</span>
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="printReceipt()">🖨️ Cetak Struk</button>
     <button class="btn btn-primary" onclick="closeModal()">Selesai</button>`
    );
}

function printReceipt() {
    showToast('Mencetak struk... (mode demo)', 'default');
    window.print();
}

function holdOrder() {
    if (posCart.length === 0) return;
    showToast('Order ditahan. Keranjang dikosongkan untuk order baru.', 'warning');
    posCart = [];
    renderCart();
}

/* ─── SESSION ─────────────────────────────────────── */
function openStartSessionModal() {
    openModal('🟢 Buka Sesi Kasir',
        `<div class="form-grid" style="gap:14px;">
      <div class="form-group">
        <label class="form-label">Nama Kasir</label>
        <input class="form-input" id="sess-cashier" value="${Auth.user.name}" readonly style="background:var(--gray-50);">
      </div>
      <div class="form-group">
        <label class="form-label">Kas Awal (Rp)</label>
        <input class="form-input" type="number" id="sess-initial-cash" placeholder="500000">
      </div>
      <div class="form-group">
        <label class="form-label">Tanggal & Waktu Mulai</label>
        <input class="form-input" value="${new Date().toLocaleString('id-ID')}" readonly style="background:var(--gray-50);">
      </div>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-success" onclick="startSession()">🟢 Buka Sesi</button>`
    );
}

function startSession() {
    const initialCash = parseFloat(document.getElementById('sess-initial-cash')?.value) || 0;
    DB.posSession = {
        id: genId('SESS'),
        cashierId: Auth.user.id,
        cashierName: Auth.user.name,
        startTime: Date.now(),
        initialCash,
        transactions: [],
        status: 'open',
    };
    savePosSession();
    closeModal();
    showToast('Sesi kasir berhasil dibuka.', 'success');
    renderPOS(document.getElementById('app-content'));
}

function openCloseSessionModal() {
    const s = DB.posSession;
    if (!s) return;
    const trxList = DB.posTransactions.filter(t => s.transactions.includes(t.id));
    const totalSales = trxList.reduce((sum, t) => sum + t.total, 0);
    const cashSales = trxList.filter(t => t.method === 'cash').reduce((sum, t) => sum + t.total, 0);
    const expectedCash = s.initialCash + cashSales;

    openModal('🔴 Tutup Sesi Kasir',
        `<div style="background:var(--gray-50);padding:16px;border-radius:12px;margin-bottom:16px;">
      <div class="detail-grid">
        <div class="detail-field"><div class="detail-label">Kasir</div><div class="detail-value">${s.cashierName}</div></div>
        <div class="detail-field"><div class="detail-label">Mulai Sesi</div><div class="detail-value">${formatDateTime(s.startTime)}</div></div>
        <div class="detail-field"><div class="detail-label">Total Transaksi</div><div class="detail-value">${trxList.length}</div></div>
        <div class="detail-field"><div class="detail-label">Total Penjualan</div><div class="detail-value big">${formatRp(totalSales)}</div></div>
        <div class="detail-field"><div class="detail-label">Kas Awal</div><div class="detail-value">${formatRp(s.initialCash)}</div></div>
        <div class="detail-field"><div class="detail-label">Kas Diharapkan</div><div class="detail-value">${formatRp(expectedCash)}</div></div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Kas Aktual di Laci (Rp)</label>
      <input class="form-input" type="number" id="sess-actual-cash" placeholder="${expectedCash}" oninput="updateCashDiff(${expectedCash})">
    </div>
    <div id="cash-diff-row" style="display:flex;justify-content:space-between;padding:10px 14px;background:var(--gray-100);border-radius:8px;margin-top:8px;">
      <span style="font-size:13px;font-weight:500;">Selisih Kas</span>
      <span id="cash-diff-val" style="font-size:15px;font-weight:700;color:var(--gray-700);">Rp 0</span>
    </div>`,
        `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-danger" onclick="closeSession(${expectedCash})">🔴 Tutup Sesi</button>`
    );
}

function updateCashDiff(expected) {
    const actual = parseFloat(document.getElementById('sess-actual-cash')?.value) || 0;
    const diff = actual - expected;
    const el = document.getElementById('cash-diff-val');
    if (el) {
        el.textContent = formatRp(diff);
        el.style.color = diff < 0 ? 'var(--danger)' : diff > 0 ? 'var(--success)' : 'var(--gray-700)';
    }
}

function closeSession(expectedCash) {
    DB.posSession = null;
    savePosSession();
    posCart = [];
    closeModal();
    showToast('Sesi kasir berhasil ditutup.', 'success');
    renderPOS(document.getElementById('app-content'));
}
