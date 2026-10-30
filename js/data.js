/**
 * KOPI SELA KOTA — Demo Data Layer
 * All data is stored in-memory + localStorage for prototyping.
 * NOT a substitute for a real database backend.
 */

const DB = {

  /* ─── USERS ─────────────────────────────────── */
  users: [
    { id: 'U001', name: 'Nadia Pramuwati', email: 'owner@kopiselakota.id',       password: 'demo123', role: 'Owner',       avatar: 'NP', status: 'active' },
    { id: 'U002', name: 'Rizky Firmansyah', email: 'sales@kopiselakota.id',     password: 'demo123', role: 'Sales',       avatar: 'RF', status: 'active' },
    { id: 'U003', name: 'Bagas Wicaksono', email: 'warehouse@kopiselakota.id',  password: 'demo123', role: 'Warehouse',   avatar: 'BW', status: 'active' },
    { id: 'U004', name: 'Shinta Kusuma',   email: 'procurement@kopiselakota.id',password: 'demo123', role: 'Procurement', avatar: 'SK', status: 'active' },
    { id: 'U005', name: 'Budi Santoso',    email: 'finance@kopiselakota.id',    password: 'demo123', role: 'Finance',     avatar: 'BS', status: 'active' },
    { id: 'U006', name: 'Dina Rahayu',     email: 'cashier@kopiselakota.id',    password: 'demo123', role: 'Cashier',     avatar: 'DR', status: 'active' },
  ],

  /* ─── PRODUCTS ────────────────────────────────── */
  products: [
    { id: 'P001', name: 'Americano',        sku: 'BEV-AM-001', category: 'Kopi',         price: 22000, cost: 9000,  stock: 150, minStock: 20, emoji: '☕', image: null },
    { id: 'P002', name: 'Latte',            sku: 'BEV-LT-002', category: 'Kopi',         price: 28000, cost: 12000, stock: 120, minStock: 20, emoji: '☕', image: null },
    { id: 'P003', name: 'Cappuccino',       sku: 'BEV-CP-003', category: 'Kopi',         price: 28000, cost: 12000, stock: 100, minStock: 20, emoji: '☕', image: null },
    { id: 'P004', name: 'Mocha',            sku: 'BEV-MC-004', category: 'Kopi',         price: 32000, cost: 14000, stock: 80,  minStock: 15, emoji: '☕', image: null },
    { id: 'P005', name: 'Cold Brew',        sku: 'BEV-CB-005', category: 'Kopi',         price: 32000, cost: 13000, stock: 60,  minStock: 15, emoji: '🧊', image: null },
    { id: 'P006', name: 'Caramel Latte',    sku: 'BEV-CL-006', category: 'Kopi',         price: 35000, cost: 15000, stock: 5,   minStock: 10, emoji: '☕', image: null },
    { id: 'P007', name: 'Matcha Latte',     sku: 'BEV-ML-007', category: 'Non-Kopi',     price: 30000, cost: 13000, stock: 90,  minStock: 15, emoji: '🍵', image: null },
    { id: 'P008', name: 'Teh Tarik',        sku: 'BEV-TT-008', category: 'Non-Kopi',     price: 20000, cost: 7000,  stock: 110, minStock: 20, emoji: '🍵', image: null },
    { id: 'P009', name: 'Croissant',        sku: 'FOD-CR-009', category: 'Pastry',       price: 25000, cost: 10000, stock: 40,  minStock: 10, emoji: '🥐', image: null },
    { id: 'P010', name: 'Roti Bakar',       sku: 'FOD-RB-010', category: 'Pastry',       price: 18000, cost: 6000,  stock: 35,  minStock: 10, emoji: '🍞', image: null },
    { id: 'P011', name: 'Banana Bread',     sku: 'FOD-BB-011', category: 'Pastry',       price: 22000, cost: 8000,  stock: 3,   minStock: 8,  emoji: '🍌', image: null },
    { id: 'P012', name: 'Kopi Arabika 250g',sku: 'PKG-KA-012', category: 'Produk Retail',price: 95000, cost: 55000, stock: 25,  minStock: 5,  emoji: '🫘', image: null },
    { id: 'P013', name: 'Espresso',         sku: 'BEV-ES-013', category: 'Kopi',         price: 20000, cost: 8000,  stock: 200, minStock: 30, emoji: '☕', image: null },
    { id: 'P014', name: 'Flat White',       sku: 'BEV-FW-014', category: 'Kopi',         price: 30000, cost: 13000, stock: 75,  minStock: 15, emoji: '☕', image: null },
    { id: 'P015', name: 'Hot Chocolate',    sku: 'BEV-HC-015', category: 'Non-Kopi',     price: 28000, cost: 11000, stock: 65,  minStock: 12, emoji: '🍫', image: null },
  ],

  /* ─── CUSTOMERS ────────────────────────────────── */
  customers: [
    { id: 'C001', name: 'PT Maju Bersama',      email: 'maju@bisnisku.id',        phone: '021-1345-67', piutang: 2500000,  status: 'active' },
    { id: 'C002', name: 'CV Sinar Terang',       email: 'spt@terterang.co.id',     phone: '021-5678-90', piutang: 0,        status: 'active' },
    { id: 'C003', name: 'Nadia Pramuwati',       email: 'nadia.p@gmail.com',       phone: '0812-3456-78',piutang: 350000,   status: 'active' },
    { id: 'C004', name: 'Kantor Walikota',       email: 'walikota@dki.go.id',      phone: '021-7788-66', piutang: 8500000,  status: 'active' },
    { id: 'C005', name: 'PT Sinar Raja',         email: 'spt@sinarraja.co.id',     phone: '031-4562-319',piutang: 1200000,  status: 'inactive' },
  ],

  /* ─── SUPPLIERS ────────────────────────────────── */
  suppliers: [
    { id: 'SUP001', name: 'PT Indonesia Kopi',   email: 'supply@indokopi.id',      phone: '021-1111-22', kota: 'Jakarta',   status: 'active' },
    { id: 'SUP002', name: 'UD Sinar Dapur',      email: 'sinar@dapursupply.co.id', phone: '022-3333-44', kota: 'Bandung',   status: 'active' },
    { id: 'SUP003', name: 'CV Aksara Kristia',   email: 'aksara@crystal.net',      phone: '031-5555-66', kota: 'Surabaya',  status: 'active' },
    { id: 'SUP004', name: 'PT Fast Supply',      email: 'fast@fastsupply.id',      phone: '021-7777-88', kota: 'Jakarta',   status: 'inactive' },
  ],

  /* ─── SALES ORDERS ───────────────────────────────── */
  salesOrders: [
    { id: 'SO-001', number: 'SO/2025/00001', customer: 'PT Maju Bersama', date: '2025-04-10', amount: 1750000, status: 'done',      items: 5, salesperson: 'Rizky Firmansyah' },
    { id: 'SO-002', number: 'SO/2025/00002', customer: 'CV Sinar Terang', date: '2025-04-11', amount:  980000, status: 'confirmed', items: 3, salesperson: 'Rizky Firmansyah' },
    { id: 'SO-003', number: 'SO/2025/00003', customer: 'Nadia Pramuwati', date: '2025-04-12', amount:  350000, status: 'draft',     items: 2, salesperson: 'Rizky Firmansyah' },
    { id: 'SO-004', number: 'SO/2025/00004', customer: 'Kantor Walikota', date: '2025-04-13', amount: 5600000, status: 'done',      items: 12,salesperson: 'Rizky Firmansyah' },
    { id: 'SO-005', number: 'SO/2025/00005', customer: 'PT Sinar Raja',   date: '2025-04-14', amount:  770000, status: 'cancelled', items: 2, salesperson: 'Rizky Firmansyah' },
  ],

  /* ─── QUOTATIONS / LEADS ─────────────────────────── */
  quotations: [
    { id: 'Q001', number: 'QT/2025/00031', customer: 'Kantor Walikota', date: '2025-04-09', amount: 4200000, status: 'sent',     salesperson: 'Rizky Firmansyah' },
    { id: 'Q002', number: 'QT/2025/00032', customer: 'PT Maju Bersama', date: '2025-04-08', amount: 1100000, status: 'draft',    salesperson: 'Rizky Firmansyah' },
    { id: 'Q003', number: 'QT/2025/00033', customer: 'CV Bintang Timur',date: '2025-04-07', amount:  560000, status: 'accepted', salesperson: 'Rizky Firmansyah' },
  ],

  /* ─── PURCHASE ORDERS ───────────────────────────── */
  purchaseOrders: [
    { id: 'PO-001', number: 'PO/2025/00041', supplier: 'PT Indonesia Kopi', date: '2025-04-15', amount: 3200000, status: 'received',  items: 8 },
    { id: 'PO-002', number: 'PO/2025/00042', supplier: 'UD Sinar Dapur',   date: '2025-04-14', amount: 1150000, status: 'confirmed', items: 4 },
    { id: 'PO-003', number: 'PO/2025/00043', supplier: 'CV Aksara Kristia',date: '2025-04-13', amount:  780000, status: 'draft',     items: 3 },
    { id: 'PO-004', number: 'PO/2025/00044', supplier: 'PT Fast Supply',   date: '2025-04-12', amount: 2400000, status: 'received',  items: 6 },
  ],

  /* ─── RFQs ─────────────────────────────────────── */
  rfqs: [
    { id: 'RFQ001', number: 'RFQ/2025/00011', supplier: 'PT Indonesia Kopi', date: '2025-04-14', amount: 2800000, status: 'sent' },
    { id: 'RFQ002', number: 'RFQ/2025/00012', supplier: 'UD Sinar Dapur',   date: '2025-04-13', amount:  900000, status: 'draft' },
  ],

  /* ─── INVOICES ──────────────────────────────────── */
  invoices: [
    { id: 'INV001', number: 'INV/2025/00091', customer: 'PT Maju Bersama', date: '2025-04-10', dueDate: '2025-04-25', amount: 1750000, status: 'posted',    paymentStatus: 'paid' },
    { id: 'INV002', number: 'INV/2025/00092', customer: 'Kantor Walikota', date: '2025-04-13', dueDate: '2025-04-28', amount: 5600000, status: 'posted',    paymentStatus: 'partial' },
    { id: 'INV003', number: 'INV/2025/00093', customer: 'CV Sinar Terang', date: '2025-04-11', dueDate: '2025-04-26', amount:  980000, status: 'posted',    paymentStatus: 'pending' },
    { id: 'INV004', number: 'INV/2025/00094', customer: 'Nadia Pramuwati', date: '2025-04-12', dueDate: '2025-04-27', amount:  350000, status: 'draft',     paymentStatus: 'pending' },
    { id: 'INV005', number: 'INV/2025/00095', customer: 'PT Maju Bersama', date: '2025-04-08', dueDate: '2025-04-23', amount: 2100000, status: 'cancelled', paymentStatus: 'cancelled' },
  ],

  /* ─── VENDOR BILLS ──────────────────────────────── */
  vendorBills: [
    { id: 'VB001', number: 'BILL/2025/00021', supplier: 'PT Indonesia Kopi', date: '2025-04-15', dueDate: '2025-04-30', amount: 3200000, status: 'posted',  paymentStatus: 'paid' },
    { id: 'VB002', number: 'BILL/2025/00022', supplier: 'UD Sinar Dapur',   date: '2025-04-14', dueDate: '2025-04-29', amount: 1150000, status: 'posted',  paymentStatus: 'pending' },
    { id: 'VB003', number: 'BILL/2025/00023', supplier: 'CV Aksara Kristia',date: '2025-04-13', dueDate: '2025-04-28', amount:  780000, status: 'draft',   paymentStatus: 'pending' },
  ],

  /* ─── JOURNAL ENTRIES ───────────────────────────── */
  journalEntries: [
    { id: 'JE001', number: 'JE/2025/00101', date: '2025-04-15', reference: 'INV/2025/00091', account: 'Kas & Bank', debit: 1750000, credit: 0,       status: 'posted' },
    { id: 'JE002', number: 'JE/2025/00102', date: '2025-04-15', reference: 'INV/2025/00091', account: 'Penjualan',  debit: 0,       credit: 1750000, status: 'posted' },
    { id: 'JE003', number: 'JE/2025/00103', date: '2025-04-14', reference: 'BILL/2025/00021',account: 'Kas & Bank', debit: 0,       credit: 3200000, status: 'posted' },
    { id: 'JE004', number: 'JE/2025/00104', date: '2025-04-14', reference: 'BILL/2025/00021',account: 'Persediaan', debit: 3200000, credit: 0,       status: 'posted' },
    { id: 'JE005', number: 'JE/2025/00105', date: '2025-04-13', reference: 'Penyesuaian',    account: 'Penyesuaian',debit: 0,       credit:  150000, status: 'draft' },
  ],

  /* ─── STOCK MOVEMENTS ───────────────────────────── */
  stockMovements: [
    { id: 'SM001', number: 'WH/IN/2025/00001', type: 'Penerimaan',   product: 'Arabika Bean', qty: 50,  uom: 'kg',   date: '2025-04-15', status: 'done',    reference: 'PO/2025/00041' },
    { id: 'SM002', number: 'WH/IN/2025/00002', type: 'Penerimaan',   product: 'Cup 12oz',     qty: 500, uom: 'pcs',  date: '2025-04-14', status: 'done',    reference: 'PO/2025/00042' },
    { id: 'SM003', number: 'WH/TR/2025/00001', type: 'Transfer',     product: 'Espresso Shot', qty: 100,uom: 'shot', date: '2025-04-13', status: 'done',    reference: 'Internal' },
    { id: 'SM004', number: 'WH/ADJ/2025/0001',type: 'Penyesuaian',  product: 'Caramel Syrup', qty: -5, uom: 'bottle',date:'2025-04-12',status: 'done',   reference: 'Stock Count' },
    { id: 'SM005', number: 'WH/IN/2025/00003', type: 'Penerimaan',   product: 'Milk (1L)',     qty: 80,  uom: 'ltr',  date: '2025-04-11', status: 'waiting', reference: 'PO/2025/00043' },
  ],

  /* ─── POS TRANSACTIONS ──────────────────────────── */
  posTransactions: [],

  /* ─── POS SESSION ──────────────────────────────── */
  posSession: null,

  /* ─── ACTIVITIES (for dashboard) ──────────────── */
  activities: [
    { type: 'sale',      icon: '🛒', title: 'Sales Order SO/2025/00004 dikonfirmasi',  meta: 'Kantor Walikota · Rp 5.600.000',  time: '12 mnt lalu' },
    { type: 'purchase',  icon: '📦', title: 'Penerimaan barang WH/IN/2025/00002 selesai', meta: 'PT Indonesia Kopi · 50 kg Arabika', time: '1 jam lalu' },
    { type: 'payment',   icon: '💰', title: 'Pembayaran invoice INV/2025/00091',        meta: 'PT Maju Bersama · Rp 1.750.000',   time: '2 jam lalu' },
    { type: 'inventory', icon: '⚠️', title: 'Stok rendah terdeteksi',                  meta: 'Caramel Latte, Banana Bread',       time: '3 jam lalu' },
    { type: 'sale',      icon: '🛒', title: 'Sales Order SO/2025/00001 selesai',        meta: 'PT Maju Bersama · Rp 1.750.000',    time: '5 jam lalu' },
  ],

  /* ─── CHART DATA ────────────────────────────────── */
  salesChart: {
    labels: ['1 Apr','5 Apr','9 Apr','13 Apr','17 Apr','21 Apr','25 Apr'],
    data:   [1250000, 2100000, 1750000, 3400000, 2800000, 4100000, 5600000],
  },

  salesByCategory: {
    labels: ['Kopi', 'Non-Kopi', 'Pastry', 'Produk Retail'],
    data:   [58, 22, 14, 6],
  },
};

/* ─── HELPER: load/save posTransactions from localStorage ─── */
(function initLocalStorage() {
  const saved = localStorage.getItem('ksk_pos_transactions');
  if (saved) {
    try { DB.posTransactions = JSON.parse(saved); } catch(e) {}
  }
  const session = localStorage.getItem('ksk_pos_session');
  if (session) {
    try { DB.posSession = JSON.parse(session); } catch(e) {}
  }
  const products = localStorage.getItem('ksk_products');
  if (products) {
    try { DB.products = JSON.parse(products); } catch(e) {}
  }
})();

function savePosTransactions() {
  localStorage.setItem('ksk_pos_transactions', JSON.stringify(DB.posTransactions));
}
function savePosSession() {
  if (DB.posSession) localStorage.setItem('ksk_pos_session', JSON.stringify(DB.posSession));
  else localStorage.removeItem('ksk_pos_session');
}
function saveProducts() {
  localStorage.setItem('ksk_products', JSON.stringify(DB.products));
}

/* ROLLBACK TO DEFAULT DATA */
function resetDemoData() {
  localStorage.removeItem('ksk_pos_transactions');
  localStorage.removeItem('ksk_pos_session');
  localStorage.removeItem('ksk_products');
  location.reload();
}

/* FORMAT CURRENCY */
function formatRp(value) {
  return 'Rp ' + Number(value).toLocaleString('id-ID');
}

/* FORMAT DATE */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* FORMAT DATETIME */
function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) +
         ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}

/* GENERATE ID */
function genId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
}

/* LOW STOCK PRODUCTS */
function getLowStockProducts() {
  return DB.products.filter(p => p.stock <= p.minStock);
}

/* DASHBOARD KPIs */
function getDashboardKPIs() {
  const totalSales = DB.salesOrders
    .filter(o => o.status === 'done' || o.status === 'confirmed')
    .reduce((s, o) => s + o.amount, 0);
  const totalTrx   = DB.posTransactions.length + DB.salesOrders.filter(o=>o.status==='done').length;
  const lowStockCount = getLowStockProducts().length;
  const openInvoicesAmt = DB.invoices
    .filter(i => i.paymentStatus === 'pending' || i.paymentStatus === 'partial')
    .reduce((s,i)=>s+i.amount,0);
  return { totalSales, totalTrx, lowStockCount, openInvoicesAmt };
}
