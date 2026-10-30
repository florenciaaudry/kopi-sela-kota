/**
 * KOPI SELA KOTA — Authentication Module
 * Demo authentication using in-memory user list.
 */

const Auth = {
    currentUser: null,

    login(email, password) {
        const user = DB.users.find(u => u.email === email && u.password === password);
        if (!user) return false;
        this.currentUser = user;
        sessionStorage.setItem('ksk_user', JSON.stringify(user));
        return true;
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('ksk_user');
    },

    restoreSession() {
        const saved = sessionStorage.getItem('ksk_user');
        if (saved) {
            try { this.currentUser = JSON.parse(saved); return true; }
            catch (e) { return false; }
        }
        return false;
    },

    isLoggedIn() { return !!this.currentUser; },

    get user() { return this.currentUser; },
    get role() { return this.currentUser ? this.currentUser.role : null; },
};

/* ─── ROLE PERMISSIONS ─────────────────────────── */
const ROLE_PERMISSIONS = {
    Owner: {
        pages: ['dashboard', 'sales', 'purchase', 'inventory', 'accounting', 'pos', 'reports', 'settings'],
        canCreate: true, canEdit: true, canDelete: true,
        canViewFinance: true, canPostJournal: true, canManageUsers: true,
    },
    Sales: {
        pages: ['dashboard', 'sales', 'reports'],
        canCreate: true, canEdit: true, canDelete: false,
        canViewFinance: false, canPostJournal: false, canManageUsers: false,
    },
    Warehouse: {
        pages: ['dashboard', 'inventory', 'reports'],
        canCreate: false, canEdit: true, canDelete: false,
        canViewFinance: false, canPostJournal: false, canManageUsers: false,
    },
    Procurement: {
        pages: ['dashboard', 'purchase', 'inventory', 'reports'],
        canCreate: true, canEdit: true, canDelete: false,
        canViewFinance: false, canPostJournal: false, canManageUsers: false,
    },
    Finance: {
        pages: ['dashboard', 'accounting', 'reports'],
        canCreate: true, canEdit: true, canDelete: false,
        canViewFinance: true, canPostJournal: true, canManageUsers: false,
    },
    Cashier: {
        pages: ['pos'],
        canCreate: false, canEdit: false, canDelete: false,
        canViewFinance: false, canPostJournal: false, canManageUsers: false,
    },
};

/* ─── NAVIGATION ITEMS PER PAGE ─────────────────── */
const NAV_ITEMS = {
    dashboard: {
        label: 'Dashboard', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    sales: {
        label: 'Sales & CRM', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>`,
    },
    purchase: {
        label: 'Purchase', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    },
    inventory: {
        label: 'Inventory', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-8 4.5v9L12 21l8-4.5v-9L12 3z"/><path d="m12 12 8-4.5"/><path d="M12 12v9"/><path d="m12 12-8-4.5"/></svg>`,
    },
    accounting: {
        label: 'Accounting', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    },
    pos: {
        label: 'Point of Sale', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    },
    reports: {
        label: 'Reports', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    },
    settings: {
        label: 'Settings', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    },
};

function getPermissions() {
    return ROLE_PERMISSIONS[Auth.role] || ROLE_PERMISSIONS.Cashier;
}

function canAccess(page) {
    const perms = getPermissions();
    return perms.pages.includes(page);
}

function getDefaultPage() {
    const perms = getPermissions();
    if (perms.pages[0]) return perms.pages[0];
    return 'dashboard';
}
