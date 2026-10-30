/**
 * KOPI SELA KOTA — Reports Page
 */

function renderReports(container) {
    const kpi = getDashboardKPIs();
    const posTrx = DB.posTransactions;
    const totalPOSSales = posTrx.reduce((s, t) => s + t.total, 0);

    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Reports</div>
        <div class="page-subtitle">Laporan penjualan, stok, dan keuangan</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="exportReportCSV()">⬇ Export CSV</button>
      </div>
    </div>

    <!-- REPORT STATS -->
    <div class="report-stat-grid">
      <div class="report-stat-card">
        <div class="report-stat-label">Total Penjualan</div>
        <div class="report-stat-value">${formatRp(kpi.totalSales)}</div>
        <div class="report-stat-sub">▲ 12% bulan ini</div>
      </div>
      <div class="report-stat-card">
        <div class="report-stat-label">Transaksi POS</div>
        <div class="report-stat-value">${posTrx.length}</div>
        <div class="report-stat-sub">Total hari ini: ${formatRp(totalPOSSales)}</div>
      </div>
      <div class="report-stat-card">
        <div class="report-stat-label">Invoice Belum Lunas</div>
        <div class="report-stat-value">${kpi.openInvoicesAmt > 0 ? formatRp(kpi.openInvoicesAmt) : 'Rp 0'}</div>
        <div class="report-stat-sub">3 invoice outstanding</div>
      </div>
      <div class="report-stat-card">
        <div class="report-stat-label">Produk Stok Rendah</div>
        <div class="report-stat-value" style="color:${kpi.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)'}">${kpi.lowStockCount}</div>
        <div class="report-stat-sub">${kpi.lowStockCount > 0 ? 'Perlu restock segera' : 'Semua stok aman'}</div>
      </div>
    </div>

    <!-- CHARTS ROW -->
    <div class="dashboard-row" style="margin-bottom:16px;">
      <div class="card">
        <div class="card-header"><h3>📈 Penjualan Harian — April 2025</h3></div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:220px;"><canvas id="rpt-line-chart"></canvas></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🍕 Metode Pembayaran POS</h3></div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:220px;"><canvas id="rpt-pie-chart"></canvas></div>
        </div>
      </div>
    </div>

    <!-- POS TRANSACTION HISTORY -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <h3>🖥️ Riwayat Transaksi POS</h3>
        <span class="text-sm text-muted">${posTrx.length} transaksi</span>
      </div>
      ${posTrx.length === 0
            ? `<div class="empty-state"><span style="font-size:32px;">📭</span><p>Belum ada transaksi POS. Lakukan transaksi di halaman POS.</p></div>`
            : renderTable(
                ['No. Transaksi', 'Kasir', 'Waktu', 'Item', 'Total', 'Metode', 'Aksi'],
                [...posTrx].reverse().slice(0, 20).map(t => [
                    `<span class="doc-link">${t.number}</span>`,
                    t.cashier,
                    formatDateTime(t.date),
                    `${t.items.length} item`,
                    `<strong>${formatRp(t.total)}</strong>`,
                    `<span class="tag">${{ cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' }[t.method]}</span>`,
                    `<button class="btn btn-ghost btn-xs" onclick="showPOSTrxDetail('${t.id}')">Struk</button>`,
                ])
            )
        }
    </div>

    <!-- STOCK SUMMARY -->
    <div class="card">
      <div class="card-header"><h3>📦 Ringkasan Stok Produk</h3></div>
      ${renderTable(
            ['Produk', 'SKU', 'Kategori', 'Stok', 'Min Stok', 'Status'],
            DB.products.map(p => [
                `${p.emoji} ${p.name}`,
                `<span class="tag">${p.sku}</span>`,
                p.category,
                `<strong style="color:${p.stock <= p.minStock ? 'var(--danger)' : 'var(--gray-800)'}">${p.stock}</strong>`,
                p.minStock,
                badge(p.stock <= 0 ? 'cancelled' : p.stock <= p.minStock ? 'low-stock' : 'active'),
            ])
        )}
    </div>
  `;

    setTimeout(() => {
        renderReportLineChart();
        renderReportPieChart();
    }, 50);
}

function renderReportLineChart() {
    const canvas = document.getElementById('rpt-line-chart');
    if (!canvas) return;
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: DB.salesChart.labels,
            datasets: [{
                label: 'Penjualan (Rp)',
                data: DB.salesChart.data,
                backgroundColor: 'rgba(75,37,99,0.7)',
                borderColor: '#4B2563',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: v => 'Rp ' + (v / 1000000).toFixed(1) + 'jt', font: { size: 11 } }, grid: { color: '#f0f0f0' } },
                x: { ticks: { font: { size: 11 } }, grid: { display: false } },
            },
        }
    });
}

function renderReportPieChart() {
    const canvas = document.getElementById('rpt-pie-chart');
    if (!canvas) return;
    const trx = DB.posTransactions;
    const cash = trx.filter(t => t.method === 'cash').length;
    const transfer = trx.filter(t => t.method === 'transfer').length;
    const qris = trx.filter(t => t.method === 'qris').length;
    const total = cash + transfer + qris || 1;
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Tunai', 'Transfer', 'QRIS'],
            datasets: [{
                data: [cash || 0.3, transfer || 0.3, qris || 0.3],
                backgroundColor: ['#4B2563', '#7c3aed', '#a78bfa'],
                borderWidth: 2, borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 12 } } },
            cutout: '60%',
        }
    });
}

function showPOSTrxDetail(id) {
    const trx = DB.posTransactions.find(t => t.id === id);
    if (!trx) return;
    showReceiptModal(trx);
}

function exportReportCSV() {
    const rows = [
        ['No. Transaksi', 'Kasir', 'Tanggal', 'Total', 'Metode'],
        ...DB.posTransactions.map(t => [t.number, t.cashier, formatDateTime(t.date), t.total, t.method])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = 'laporan-ksk.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast('Laporan berhasil diekspor.', 'success');
}
