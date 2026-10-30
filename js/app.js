/**
 * KOPI SELA KOTA — Main App Router
 */

const Router = {
    currentPage: null,

    navigate(page) {
        if (!canAccess(page)) {
            showToast('Anda tidak memiliki akses ke halaman ini.', 'error');
            return;
        }
        this.currentPage = page;
        updateActiveSidebarItem(page);

        const content = document.getElementById('app-content');
        const navItem = NAV_ITEMS[page];
        setBreadcrumb(['Kopi Sela Kota', navItem ? navItem.label : page]);

        // Remove POS special layout class from body
        document.body.classList.remove('pos-mode');

        switch (page) {
            case 'dashboard': renderDashboard(content); break;
            case 'sales': renderSales(content); break;
            case 'purchase': renderPurchase(content); break;
            case 'inventory': renderInventory(content); break;
            case 'accounting': renderAccounting(content); break;
            case 'pos': renderPOS(content); break;
            case 'reports': renderReports(content); break;
            case 'settings': renderSettings(content); break;
            default: content.innerHTML = '<p>Halaman tidak ditemukan.</p>';
        }
    },
};

/* ─── INIT ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    // Try to restore session
    if (Auth.restoreSession()) {
        showApp();
    }

    // LOGIN FORM
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pw = document.getElementById('login-password').value;
        const err = document.getElementById('login-error');
        if (!email || !pw) {
            err.textContent = 'Email dan password wajib diisi.';
            err.classList.remove('hidden'); return;
        }
        if (Auth.login(email, pw)) {
            err.classList.add('hidden');
            showApp();
        } else {
            err.textContent = 'Email atau password salah. Coba akun demo di bawah.';
            err.classList.remove('hidden');
        }
    });

    // PASSWORD TOGGLE
    const togglePw = document.getElementById('toggle-pw');
    const pwInput = document.getElementById('login-password');
    togglePw.addEventListener('click', () => {
        pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    });

    // DEMO ACCOUNT BUTTONS
    document.querySelectorAll('.demo-acc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('login-email').value = btn.dataset.email;
            document.getElementById('login-password').value = btn.dataset.pw;
            document.getElementById('login-error').classList.add('hidden');
        });
    });

    // LOGOUT BUTTON
    document.getElementById('btn-logout').addEventListener('click', () => {
        Auth.logout();
        document.getElementById('app').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        showToast('Berhasil logout.', 'success');
    });

    // SIDEBAR TOGGLE (collapse)
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // MOBILE MENU BUTTON
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('mobile-open');
    });
});

function showApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderSidebar();
    const defaultPage = getDefaultPage();
    Router.navigate(defaultPage);
}
