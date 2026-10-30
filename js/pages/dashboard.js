/**
 * KOPI SELA KOTA — Dashboard Page
 */

function renderDashboard(container) {
    const kpi = getDashboardKPIs();
    const lowStock = getLowStockProducts().slice(0, 5);
    const role = Auth.role;

    container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Halo, ${Auth.user.name.split(' ')[0]} 👋</div>
        <div class="page-subtitle">Selamat datang di Kopi Sela Kota ERP · ${role}</div>
      </div>
      <div class="page-actions">
        <span class="text-sm text-muted">📅 ${formatDate(new Date().toISOString().slice(0, 10))}</span>
      </div>
    </div>

    <!-- KPI CARDS -->
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-card-accent purple"></div>
        <div class="stat-card-icon purple">💰</div>
        <div class="stat-card-label">Total Penjualan</div>
        <div class="stat-card-value">${formatRp(kpi.totalSales)}</div>
        <div class="stat-card-change up">▲ 12% dari bulan lalu</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent green"></div>
        <div class="stat-card-icon green">🛒</div>
        <div class="stat-card-label">Jumlah Transaksi</div>
        <div class="stat-card-value">${kpi.totalTrx + DB.posTransactions.length}</div>
        <div class="stat-card-change up">▲ 6% dari bulan lalu</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent orange"></div>
        <div class="stat-card-icon ${kpi.lowStockCount > 0 ? 'red' : 'green'}">⚠️</div>
        <div class="stat-card-label">Stok Menipis</div>
        <div class="stat-card-value" style="color:${kpi.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)'};">${kpi.lowStockCount} Produk</div>
        <div class="stat-card-change ${kpi.lowStockCount > 0 ? 'down' : 'up'}">${kpi.lowStockCount > 0 ? '▼ Perlu restock' : '✓ Stok aman'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent blue"></div>
        <div class="stat-card-icon blue">📄</div>
        <div class="stat-card-label">Invoice Belum Bayar</div>
        <div class="stat-card-value">${formatRp(kpi.openInvoicesAmt)}</div>
        <div class="stat-card-change down">▼ 3 invoice outstanding</div>
      </div>
    </div>

    <!-- CHART + ACTIVITY ROW -->
    <div class="dashboard-row">
      <div class="card">
        <div class="card-header">
          <h3>📈 Penjualan per Hari (Apr 2025)</h3>
          <button class="btn btn-secondary btn-sm" onclick="exportChartPNG()">⬇ Export</button>
        </div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:220px;">
            <canvas id="salesLineChart"></canvas>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>🍕 Penjualan per Kategori</h3></div>
        <div class="card-body">
          <div class="chart-wrapper" style="height:220px;">
            <canvas id="salesPieChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- ACTIVITY + LOW STOCK -->
    <div class="dashboard-row">
      <div class="card">
        <div class="card-header">
          <h3>🕐 Aktivitas Terbaru</h3>
          <span class="text-sm text-muted">Hari ini</span>
        </div>
        <div class="activity-list">
          ${DB.activities.map(a => `
            <div class="activity-item">
              <div class="activity-icon ${a.type}"><span>${a.icon}</span></div>
              <div class="activity-content">
                <div class="activity-title">${a.title}</div>
                <div class="activity-meta">${a.meta}</div>
              </div>
              <div class="activity-time">${a.time}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>📦 Stok Menipis</h3>
          ${canAccess('inventory') ? `<button class="btn btn-secondary btn-sm" onclick="Router.navigate('inventory')">Lihat Semua</button>` : ''}
        </div>
        <div class="low-stock-list">
          ${lowStock.length === 0 ? '<div class="empty-state" style="padding:30px;"><p>Semua stok aman ✓</p></div>' : ''}
          ${lowStock.map(p => `
            <div class="low-stock-item">
              <div>
                <div class="low-stock-name">${p.emoji} ${p.name}</div>
                <div class="low-stock-sku">${p.sku} · Min: ${p.minStock}</div>
              </div>
              <div class="low-stock-qty">${p.stock} sisa</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

    // Render charts
    setTimeout(() => {
        renderSalesLineChart();
        renderSalesPieChart();
    }, 50);
}

function renderSalesLineChart() {
    const canvas = document.getElementById('salesLineChart');
    if (!canvas) return;
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: DB.salesChart.labels,
            datasets: [{
                label: 'Penjualan (Rp)',
                data: DB.salesChart.data,
                borderColor: '#4B2563',
                backgroundColor: 'rgba(75,37,99,0.08)',
                borderWidth: 2.5,
                pointBackgroundColor: '#4B2563',
                pointRadius: 4,
                fill: true,
                tension: 0.4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    ticks: { callback: v => 'Rp ' + (v / 1000000).toFixed(1) + 'jt', font: { size: 11 } },
                    grid: { color: '#f0f0f0' },
                },
                x: { ticks: { font: { size: 11 } }, grid: { display: false } },
            },
        }
    });
}

function renderSalesPieChart() {
    const canvas = document.getElementById('salesPieChart');
    if (!canvas) return;
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: DB.salesByCategory.labels,
            datasets: [{
                data: DB.salesByCategory.data,
                backgroundColor: ['#4B2563', '#7c3aed', '#a78bfa', '#ddd6fe'],
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 11 }, padding: 12 } },
            },
            cutout: '65%',
        }
    });
}

function exportChartPNG() {
    const canvas = document.getElementById('salesLineChart');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'grafik-penjualan-ksk.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}
