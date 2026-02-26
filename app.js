/* ========================================
   Nhà Trọ Eden Telegram Mini App
   Main Application Logic
   ======================================== */

// ─── Security: Telegram-only Access ────
const tg = window.Telegram?.WebApp;
let tgUser = null;

// 🔒 BLOCK access if NOT opened from Telegram
const isTelegram = tg && tg.initData && tg.initData.length > 0
    && tg.initDataUnsafe && tg.initDataUnsafe.user
    && tg.initDataUnsafe.hash && tg.initDataUnsafe.hash.length > 0
    && tg.platform && tg.platform !== 'unknown';

if (!isTelegram) {
    // Not inside Telegram — show access denied
    document.getElementById('loadingScreen').remove();
    document.getElementById('app').style.display = 'none';
    document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;
            background:#0f0f23;color:#e4e4e7;font-family:'Inter',sans-serif;text-align:center;padding:20px;">
            <div style="font-size:64px;margin-bottom:20px;">🔒</div>
            <h1 style="font-size:22px;font-weight:700;margin-bottom:10px;color:#f87171;">Truy cập bị từ chối</h1>
            <p style="font-size:14px;color:#a1a1aa;max-width:300px;line-height:1.6;">
                Ứng dụng này chỉ hoạt động trong <strong style="color:#818cf8;">Telegram</strong>.<br><br>
                Vui lòng mở qua bot <strong style="color:#818cf8;">Nhà Trọ Eden</strong> trên Telegram để sử dụng.
            </p>
            <div style="margin-top:24px;padding:12px 24px;background:#6366f1;border-radius:12px;cursor:pointer;"
                 onclick="window.open('https://t.me','_blank')">
                <span style="color:white;font-weight:600;font-size:14px;">📱 Mở Telegram</span>
            </div>
        </div>
    `;
    throw new Error('🔒 Access denied — not inside Telegram');
}

// ─── Telegram WebApp SDK ───────────────
tg.ready();
tg.expand();
tgUser = tg.initDataUnsafe?.user;
console.log('[Auth] ✅ Telegram user:', tgUser?.first_name, '| ID:', tgUser?.id);

// Apply Telegram theme colors
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams?.bg_color || '#1a1a2e');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams?.text_color || '#e4e4e7');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams?.hint_color || '#a1a1aa');
document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams?.link_color || '#818cf8');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams?.button_color || '#6366f1');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams?.button_text_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams?.secondary_bg_color || '#16162a');
document.documentElement.style.setProperty('--tg-theme-header-bg-color', tg.themeParams?.header_bg_color || '#0f0f23');

// Set viewport color
if (tg.setHeaderColor) tg.setHeaderColor('#0f0f23');
if (tg.setBackgroundColor) tg.setBackgroundColor('#1a1a2e');

// ─── Helpers ───────────────────────────
function formatVND(n) {
    if (!n && n !== 0) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN');
}

function formatMonth(m) {
    if (!m) return '—';
    const [y, mo] = m.split('-');
    return `T${parseInt(mo)}/${y}`;
}

function formatMonthFull(m) {
    if (!m) return '—';
    const [y, mo] = m.split('-');
    return `Tháng ${parseInt(mo)}/${y}`;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
}

function haptic(type) {
    if (tg?.HapticFeedback) {
        if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
        else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    }
}

// ─── Toast ─────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const iconMap = {
        success: '<i data-lucide="check-circle"></i>',
        error: '<i data-lucide="alert-circle"></i>',
        info: '<i data-lucide="info"></i>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${iconMap[type] || iconMap.info}<span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ─── Modal ─────────────────────────────
function showModal(title, content) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');

    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    overlay.classList.add('show');
    lucide.createIcons({ nodes: [bodyEl] });
    haptic('light');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

// ─── Navigation ────────────────────────
let currentPage = 'dashboard';
let pageHistory = [];

function navigateTo(page, addToHistory = true) {
    if (currentPage === page && page !== 'roomDetail') return;

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const pageMap = {
        'dashboard': 'pageDashboard',
        'rooms': 'pageRooms',
        'roomDetail': 'pageRoomDetail',
        'tenants': 'pageTenants',
        'invoices': 'pageInvoices',
        'services': 'pageServices',
        'settings': 'pageSettings'
    };

    const targetEl = document.getElementById(pageMap[page]);
    if (targetEl) targetEl.classList.add('active');

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Header UI
    const headerTitle = document.getElementById('headerTitle');
    const titleMap = {
        'dashboard': 'Tổng quan',
        'rooms': 'Phòng',
        'roomDetail': 'Chi tiết phòng',
        'tenants': 'Người thuê',
        'invoices': 'Hóa đơn',
        'services': 'Dịch vụ',
        'settings': 'Cài đặt'
    };
    headerTitle.textContent = titleMap[page] || '';

    // Back button
    const backBtn = document.getElementById('backBtn');
    const headerBrand = document.querySelector('.header-brand');
    const isSubPage = page === 'roomDetail';
    backBtn.style.display = isSubPage ? 'flex' : 'none';
    headerBrand.style.display = isSubPage ? 'none' : 'flex';

    // History
    if (addToHistory && currentPage !== page) {
        pageHistory.push(currentPage);
    }

    currentPage = page;

    // Render page content
    renderPage(page);

    // Scroll to top
    document.getElementById('appContent').scrollTop = 0;
    haptic('light');
}

function goBack() {
    const prev = pageHistory.pop() || 'dashboard';
    navigateTo(prev, false);
}

// Back button
document.getElementById('backBtn').addEventListener('click', goBack);

// Bottom nav clicks
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        pageHistory = [];
        navigateTo(btn.dataset.page);
    });
});

// Telegram back button
if (tg?.BackButton) {
    tg.BackButton.onClick(() => {
        if (pageHistory.length > 0) {
            goBack();
        } else {
            tg.close();
        }
    });
}

// ─── Render Pages ──────────────────────
function renderPage(page) {
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'rooms': renderRooms(); break;
        case 'tenants': renderTenants(); break;
        case 'invoices': renderInvoices(); break;
        case 'services': renderServices(); break;
        case 'settings': renderSettings(); break;
    }
}

// ─── Dashboard ─────────────────────────
function renderDashboard() {
    const stats = Store.getStats();
    const settings = Store.getSettings();

    // Stats Grid
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card primary" onclick="navigateTo('rooms')">
            <div class="stat-icon"><i data-lucide="door-open"></i></div>
            <div class="stat-value">${stats.totalRooms}</div>
            <div class="stat-label">Tổng phòng</div>
        </div>
        <div class="stat-card ${stats.occupied > 0 ? 'danger' : 'success'}">
            <div class="stat-icon"><i data-lucide="${stats.occupied > 0 ? 'home' : 'check-circle'}"></i></div>
            <div class="stat-value">${stats.occupied} / ${stats.available}</div>
            <div class="stat-label">Thuê / Trống</div>
        </div>
        <div class="stat-card info" onclick="navigateTo('tenants')">
            <div class="stat-icon"><i data-lucide="users"></i></div>
            <div class="stat-value">${stats.totalTenants}</div>
            <div class="stat-label">Người thuê</div>
        </div>
        <div class="stat-card warning" onclick="navigateTo('invoices')">
            <div class="stat-icon"><i data-lucide="alert-triangle"></i></div>
            <div class="stat-value">${stats.unpaidCount}</div>
            <div class="stat-label">Chưa thanh toán</div>
        </div>
    `;

    // Quick Actions
    document.getElementById('quickActions').innerHTML = `
        <button class="quick-action-btn qa-rooms" onclick="navigateTo('rooms')">
            <div class="action-icon"><i data-lucide="door-open"></i></div>
            <span class="action-label">Phòng</span>
        </button>
        <button class="quick-action-btn qa-tenants" onclick="navigateTo('tenants')">
            <div class="action-icon"><i data-lucide="users"></i></div>
            <span class="action-label">Người thuê</span>
        </button>
        <button class="quick-action-btn qa-invoices" onclick="navigateTo('invoices')">
            <div class="action-icon"><i data-lucide="receipt"></i></div>
            <span class="action-label">Hóa đơn</span>
        </button>
        <button class="quick-action-btn qa-services" onclick="navigateTo('services')">
            <div class="action-icon"><i data-lucide="concierge-bell"></i></div>
            <span class="action-label">Dịch vụ</span>
        </button>
    `;

    // Unpaid invoices
    const unpaid = Store.getInvoices().filter(i => !i.paid);
    const rooms = Store.getRooms();
    const unpaidSection = document.getElementById('unpaidSection');

    if (unpaid.length === 0) {
        unpaidSection.innerHTML = `
            <h3 class="section-title"><i data-lucide="check-circle"></i> Tình trạng thanh toán</h3>
            <div class="empty-state">
                <i data-lucide="party-popper"></i>
                <p class="empty-state-text">Tất cả hóa đơn đã thanh toán! 🎉</p>
            </div>
        `;
    } else {
        const totalUnpaid = unpaid.reduce((s, i) => s + (i.total || 0), 0);
        let html = `
            <h3 class="section-title"><i data-lucide="alert-circle"></i> Chưa thanh toán (${unpaid.length})</h3>
            <div class="summary-bar">
                <span class="summary-label">Tổng nợ</span>
                <span class="summary-value">${formatVND(totalUnpaid)}</span>
            </div>
        `;
        unpaid.sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 5).forEach(inv => {
            const room = rooms.find(r => r.id === inv.roomId);
            html += `
                <div class="invoice-card" onclick="showInvoiceDetail('${inv.id}')">
                    <div class="invoice-card-header">
                        <span class="invoice-room-name">${room ? room.name : '—'}</span>
                        <span class="invoice-month">${formatMonth(inv.month)}</span>
                    </div>
                    <div class="invoice-amount">${formatVND(inv.total)}</div>
                    <span class="invoice-status unpaid">
                        <span class="room-status-dot" style="background:var(--danger)"></span>
                        Chưa thanh toán
                    </span>
                </div>
            `;
        });
        if (unpaid.length > 5) {
            html += `<div style="text-align:center;margin-top:8px;">
                <button class="filter-chip" onclick="navigateTo('invoices')" style="margin:0 auto;">Xem tất cả ${unpaid.length} hóa đơn →</button>
            </div>`;
        }
        unpaidSection.innerHTML = html;
    }

    lucide.createIcons();
}

// ─── Rooms Page ────────────────────────
let roomFilter = 'all';

function renderRooms() {
    const rooms = Store.getRooms();
    const tenants = Store.getTenants();

    // Filter bar
    const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
    const availableCount = rooms.length - occupiedCount;

    document.getElementById('roomFilter').innerHTML = `
        <button class="filter-chip ${roomFilter === 'all' ? 'active' : ''}" onclick="setRoomFilter('all')">Tất cả (${rooms.length})</button>
        <button class="filter-chip ${roomFilter === 'occupied' ? 'active' : ''}" onclick="setRoomFilter('occupied')">Đã thuê (${occupiedCount})</button>
        <button class="filter-chip ${roomFilter === 'available' ? 'active' : ''}" onclick="setRoomFilter('available')">Trống (${availableCount})</button>
    `;

    // Filter rooms
    let filtered = rooms;
    if (roomFilter === 'occupied') filtered = rooms.filter(r => r.status === 'occupied');
    else if (roomFilter === 'available') filtered = rooms.filter(r => r.status !== 'occupied');

    // Sort by name
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

    if (filtered.length === 0) {
        document.getElementById('roomsGrid').innerHTML = `
            <div class="empty-state">
                <i data-lucide="door-open"></i>
                <p class="empty-state-text">Không có phòng nào</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    let html = '';
    filtered.forEach(room => {
        const roomTenants = tenants.filter(t => t.roomId === room.id);
        const isOccupied = room.status === 'occupied';

        html += `
            <div class="room-card" onclick="openRoomDetail('${room.id}')">
                <div class="room-card-header">
                    <span class="room-name">${room.name}</span>
                    <span class="room-status ${isOccupied ? 'occupied' : 'available'}">
                        <span class="room-status-dot"></span>
                        ${isOccupied ? 'Đã thuê' : 'Trống'}
                    </span>
                </div>
                <div class="room-meta">
                    <span class="room-meta-item"><i data-lucide="banknote"></i> ${formatVND(room.price)}</span>
                    <span class="room-meta-item"><i data-lucide="ruler"></i> ${room.area || '?'}m²</span>
                    <span class="room-meta-item"><i data-lucide="layers"></i> Tầng ${room.floor || '?'}</span>
                </div>
                ${roomTenants.length > 0 ? `
                    <div class="room-tenants">
                        ${roomTenants.map(t => `
                            <span class="room-tenant-name"><i data-lucide="user"></i> ${t.name}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });

    document.getElementById('roomsGrid').innerHTML = html;
    lucide.createIcons();
}

function setRoomFilter(filter) {
    roomFilter = filter;
    renderRooms();
    haptic('light');
}

// ─── Room Detail ───────────────────────
let currentRoomId = null;

function openRoomDetail(roomId) {
    currentRoomId = roomId;
    navigateTo('roomDetail');
    renderRoomDetail(roomId);
}

function renderRoomDetail(roomId) {
    const rooms = Store.getRooms();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const tenants = Store.getRoomTenants(roomId);
    const invoices = Store.getRoomInvoices(roomId);
    const contract = Store.getContract(roomId);
    const roomServices = Store.getRoomServices_forRoom(roomId);
    const utilities = Store.getRoomUtilities(roomId);
    const isOccupied = room.status === 'occupied';

    let html = `
        <!-- Hero Card -->
        <div class="detail-hero">
            <div class="detail-hero-name">${room.name}</div>
            <span class="detail-hero-status">
                <span class="room-status-dot" style="background:${isOccupied ? 'var(--danger)' : 'var(--success)'}"></span>
                ${isOccupied ? 'Đã thuê' : 'Trống'}
            </span>
            <div class="detail-info-grid">
                <div class="detail-info-item">
                    <div class="detail-info-value">${formatVND(room.price)}</div>
                    <div class="detail-info-label">Giá thuê/tháng</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-value">${room.area || '?'}m²</div>
                    <div class="detail-info-label">Diện tích</div>
                </div>
                <div class="detail-info-item">
                    <div class="detail-info-value">Tầng ${room.floor || '?'}</div>
                    <div class="detail-info-label">Vị trí</div>
                </div>
            </div>
        </div>
    `;

    // Tenants
    html += `<div class="section-card">
        <h3 class="section-title"><i data-lucide="users"></i> Người thuê (${tenants.length})</h3>`;

    if (tenants.length === 0) {
        html += `<div class="empty-state" style="padding:20px 0;">
            <p class="empty-state-text text-muted">Chưa có người thuê</p>
        </div>`;
    } else {
        tenants.forEach(t => {
            html += `
                <div class="tenant-card" style="margin-bottom:8px;">
                    <div class="tenant-card-header">
                        <div class="tenant-avatar">${getInitials(t.name)}</div>
                        <div class="tenant-info">
                            <div class="tenant-name">${t.name}</div>
                            <div class="tenant-details">
                                ${t.phone ? `<div class="tenant-detail-item"><i data-lucide="phone"></i> ${t.phone}</div>` : ''}
                                ${t.idCard ? `<div class="tenant-detail-item"><i data-lucide="id-card"></i> ${t.idCard}</div>` : ''}
                                ${t.email ? `<div class="tenant-detail-item"><i data-lucide="mail"></i> ${t.email}</div>` : ''}
                                ${t.vehiclePlate ? `<div class="tenant-detail-item"><i data-lucide="bike"></i> ${t.vehiclePlate}</div>` : ''}
                                ${t.moveInDate ? `<div class="tenant-detail-item"><i data-lucide="calendar"></i> Vào ${formatDate(t.moveInDate)}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    html += `</div>`;

    // Contract
    if (contract) {
        html += `<div class="section-card">
            <h3 class="section-title"><i data-lucide="file-signature"></i> Hợp đồng</h3>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;">
                    <span class="text-muted">Thời hạn</span>
                    <span>${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span class="text-muted">Đặt cọc</span>
                    <span class="text-warning">${formatVND(contract.deposit || 0)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span class="text-muted">Trạng thái</span>
                    <span class="badge ${contract.status === 'active' ? 'badge-success' : 'badge-danger'}">
                        ${contract.status === 'active' ? '✅ Hiệu lực' : '⏹ Hết hạn'}
                    </span>
                </div>
            </div>
        </div>`;
    }

    // Room Services
    if (roomServices.length > 0) {
        html += `<div class="section-card">
            <h3 class="section-title"><i data-lucide="concierge-bell"></i> Dịch vụ đăng ký (${roomServices.length})</h3>
            <div style="display:flex;flex-direction:column;gap:6px;">`;
        roomServices.forEach(rs => {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border-light);">
                <span>${rs.serviceName}</span>
                <span class="text-warning">${formatVND(rs.servicePrice)}/${rs.serviceUnit || 'tháng'} × ${rs.quantity || 1}</span>
            </div>`;
        });
        html += `</div></div>`;
    }

    // Recent Invoices
    const recentInvoices = invoices.slice(0, 3);
    if (recentInvoices.length > 0) {
        html += `<div class="section-card">
            <h3 class="section-title"><i data-lucide="receipt"></i> Hóa đơn gần đây</h3>`;
        recentInvoices.forEach(inv => {
            html += `
                <div class="invoice-card" style="margin-bottom:8px;" onclick="showInvoiceDetail('${inv.id}')">
                    <div class="invoice-card-header">
                        <span class="invoice-room-name">${formatMonthFull(inv.month)}</span>
                        <span class="invoice-status ${inv.paid ? 'paid' : 'unpaid'}">
                            <span class="room-status-dot" style="background:var(--${inv.paid ? 'success' : 'danger'})"></span>
                            ${inv.paid ? 'Đã TT' : 'Chưa TT'}
                        </span>
                    </div>
                    <div class="invoice-amount">${formatVND(inv.total)}</div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // Recent Utility Readings
    const recentUtil = utilities.slice(0, 2);
    if (recentUtil.length > 0) {
        html += `<div class="section-card">
            <h3 class="section-title"><i data-lucide="zap"></i> Chỉ số điện nước</h3>`;
        recentUtil.forEach(u => {
            const eUsage = (u.electricNew || 0) - (u.electricOld || 0);
            const wUsage = (u.waterNew || 0) - (u.waterOld || 0);
            html += `<div style="padding:8px 0;border-bottom:1px solid var(--border-light);font-size:13px;">
                <div style="font-weight:600;margin-bottom:4px;">${formatMonthFull(u.month)}</div>
                <div style="display:flex;gap:16px;color:var(--tg-theme-hint-color);">
                    <span>⚡ ${u.electricOld}→${u.electricNew} (${eUsage} kWh)</span>
                    <span>💧 ${u.waterOld}→${u.waterNew} (${wUsage} m³)</span>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    document.getElementById('roomDetailContent').innerHTML = html;
    lucide.createIcons();

    // Update header title
    document.getElementById('headerTitle').textContent = room.name;
}

// ─── Tenants Page ──────────────────────
function renderTenants() {
    const tenants = Store.getTenants();
    const rooms = Store.getRooms();

    if (tenants.length === 0) {
        document.getElementById('tenantList').innerHTML = `
            <div class="empty-state">
                <i data-lucide="users"></i>
                <p class="empty-state-text">Chưa có người thuê nào</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Sort by name
    const sorted = [...tenants].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

    let html = `<div class="summary-bar">
        <span class="summary-label">Tổng người thuê</span>
        <span class="summary-value">${tenants.length}</span>
    </div>`;

    sorted.forEach(t => {
        const room = rooms.find(r => r.id === t.roomId);
        html += `
            <div class="tenant-card" onclick="showTenantDetail('${t.id}')">
                <div class="tenant-card-header">
                    <div class="tenant-avatar">${getInitials(t.name)}</div>
                    <div class="tenant-info">
                        <div class="tenant-name">${t.name}</div>
                        <div class="tenant-details">
                            ${room ? `<div class="tenant-detail-item"><i data-lucide="door-open"></i> ${room.name}</div>` : ''}
                            ${t.phone ? `<div class="tenant-detail-item"><i data-lucide="phone"></i> ${t.phone}</div>` : ''}
                            ${t.email ? `<div class="tenant-detail-item"><i data-lucide="mail"></i> ${t.email}</div>` : ''}
                        </div>
                    </div>
                    ${room ? `<span class="tenant-room-badge">${room.name}</span>` : ''}
                </div>
            </div>
        `;
    });

    document.getElementById('tenantList').innerHTML = html;
    lucide.createIcons();
}

function showTenantDetail(tenantId) {
    const tenant = Store.getTenants().find(t => t.id === tenantId);
    if (!tenant) return;

    const room = Store.getRooms().find(r => r.id === tenant.roomId);

    let content = `
        <div style="text-align:center;margin-bottom:16px;">
            <div class="tenant-avatar" style="width:56px;height:56px;font-size:22px;margin:0 auto 8px;">
                ${getInitials(tenant.name)}
            </div>
            <h3 style="font-size:18px;font-weight:700;">${tenant.name}</h3>
            ${room ? `<span class="badge badge-info">${room.name}</span>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
            ${tenant.phone ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:var(--success-bg);color:var(--success);"><i data-lucide="phone"></i></div>
                <span class="settings-item-label">Số điện thoại</span>
                <span class="settings-item-value">${tenant.phone}</span>
            </div>` : ''}
            ${tenant.idCard ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:var(--info-bg);color:var(--info);"><i data-lucide="id-card"></i></div>
                <span class="settings-item-label">CCCD</span>
                <span class="settings-item-value">${tenant.idCard}</span>
            </div>` : ''}
            ${tenant.email ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:var(--warning-bg);color:var(--warning);"><i data-lucide="mail"></i></div>
                <span class="settings-item-label">Email</span>
                <span class="settings-item-value" style="font-size:12px;">${tenant.email}</span>
            </div>` : ''}
            ${tenant.vehiclePlate ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:rgba(168,85,247,0.12);color:#a855f7;"><i data-lucide="bike"></i></div>
                <span class="settings-item-label">Biển số xe</span>
                <span class="settings-item-value">${tenant.vehiclePlate}</span>
            </div>` : ''}
            ${tenant.moveInDate ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:rgba(236,72,153,0.12);color:#ec4899;"><i data-lucide="calendar"></i></div>
                <span class="settings-item-label">Ngày vào ở</span>
                <span class="settings-item-value">${formatDate(tenant.moveInDate)}</span>
            </div>` : ''}
        </div>
    `;

    showModal(tenant.name, content);
}

// ─── Invoices Page ─────────────────────
let invoiceFilter = 'all';

function renderInvoices() {
    const invoices = Store.getInvoices();
    const rooms = Store.getRooms();

    const unpaid = invoices.filter(i => !i.paid);
    const paid = invoices.filter(i => i.paid);

    // Filter bar
    document.getElementById('invoiceFilter').innerHTML = `
        <button class="filter-chip ${invoiceFilter === 'all' ? 'active' : ''}" onclick="setInvoiceFilter('all')">Tất cả (${invoices.length})</button>
        <button class="filter-chip ${invoiceFilter === 'unpaid' ? 'active' : ''}" onclick="setInvoiceFilter('unpaid')">Chưa TT (${unpaid.length})</button>
        <button class="filter-chip ${invoiceFilter === 'paid' ? 'active' : ''}" onclick="setInvoiceFilter('paid')">Đã TT (${paid.length})</button>
    `;

    let filtered = invoices;
    if (invoiceFilter === 'unpaid') filtered = unpaid;
    else if (invoiceFilter === 'paid') filtered = paid;

    // Sort by month desc
    filtered.sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    if (filtered.length === 0) {
        document.getElementById('invoiceListFull').innerHTML = `
            <div class="empty-state">
                <i data-lucide="receipt"></i>
                <p class="empty-state-text">Không có hóa đơn nào</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Summary
    const totalAmount = filtered.reduce((s, i) => s + (i.total || 0), 0);
    let html = `<div class="summary-bar">
        <span class="summary-label">${invoiceFilter === 'unpaid' ? 'Tổng nợ' : invoiceFilter === 'paid' ? 'Đã thu' : 'Tổng cộng'}</span>
        <span class="summary-value">${formatVND(totalAmount)}</span>
    </div>`;

    filtered.forEach(inv => {
        const room = rooms.find(r => r.id === inv.roomId);
        const settings = Store.getSettings();

        // Breakdown
        const roomPrice = inv.roomPrice || (room ? room.price : 0);
        const electricCost = inv.electricCost || 0;
        const waterCost = inv.waterCost || 0;
        const serviceCost = inv.serviceCost || 0;

        html += `
            <div class="invoice-card" onclick="showInvoiceDetail('${inv.id}')">
                <div class="invoice-card-header">
                    <span class="invoice-room-name">${room ? room.name : '—'}</span>
                    <span class="invoice-month">${formatMonth(inv.month)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div class="invoice-amount">${formatVND(inv.total)}</div>
                    <span class="invoice-status ${inv.paid ? 'paid' : 'unpaid'}">
                        <span class="room-status-dot" style="background:var(--${inv.paid ? 'success' : 'danger'})"></span>
                        ${inv.paid ? 'Đã TT' : 'Chưa TT'}
                    </span>
                </div>
                <div class="invoice-breakdown">
                    <span class="invoice-breakdown-item"><i data-lucide="home"></i> ${formatVND(roomPrice)}</span>
                    ${electricCost ? `<span class="invoice-breakdown-item"><i data-lucide="zap"></i> ${formatVND(electricCost)}</span>` : ''}
                    ${waterCost ? `<span class="invoice-breakdown-item"><i data-lucide="droplets"></i> ${formatVND(waterCost)}</span>` : ''}
                    ${serviceCost ? `<span class="invoice-breakdown-item"><i data-lucide="concierge-bell"></i> ${formatVND(serviceCost)}</span>` : ''}
                </div>
            </div>
        `;
    });

    document.getElementById('invoiceListFull').innerHTML = html;
    lucide.createIcons();
}

function setInvoiceFilter(filter) {
    invoiceFilter = filter;
    renderInvoices();
    haptic('light');
}

function showInvoiceDetail(invoiceId) {
    const inv = Store.getInvoices().find(i => i.id === invoiceId);
    if (!inv) return;

    const room = Store.getRooms().find(r => r.id === inv.roomId);
    const tenants = Store.getRoomTenants(inv.roomId);
    const settings = Store.getSettings();

    const roomPrice = inv.roomPrice || (room ? room.price : 0);
    const electricUsage = inv.electricUsage || 0;
    const waterUsage = inv.waterUsage || 0;
    const electricPrice = inv.electricPrice || settings.electricityPrice || 0;
    const waterPrice = inv.waterPrice || settings.waterPrice || 0;
    const electricCost = inv.electricCost || 0;
    const waterCost = inv.waterCost || 0;
    const serviceCost = inv.serviceCost || 0;

    let content = `
        <div style="text-align:center;margin-bottom:16px;">
            <h3 style="font-size:18px;font-weight:700;">HÓA ĐƠN ${formatMonthFull(inv.month).toUpperCase()}</h3>
            <p style="color:var(--tg-theme-hint-color);font-size:13px;">${room ? room.name : '—'}</p>
            <span class="badge ${inv.paid ? 'badge-success' : 'badge-danger'}" style="margin-top:6px;">
                ${inv.paid ? '✅ Đã thanh toán' : '⚠️ Chưa thanh toán'}
            </span>
        </div>
        
        <div class="settings-group">
            <div class="settings-group-title">Chi tiết</div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:rgba(99,102,241,0.12);color:var(--primary-light);"><i data-lucide="home"></i></div>
                <span class="settings-item-label">Tiền phòng</span>
                <span class="settings-item-value">${formatVND(roomPrice)}</span>
            </div>
            ${electricCost ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:var(--warning-bg);color:var(--warning);"><i data-lucide="zap"></i></div>
                <span class="settings-item-label">Tiền điện (${electricUsage} kWh)</span>
                <span class="settings-item-value">${formatVND(electricCost)}</span>
            </div>` : ''}
            ${waterCost ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:var(--info-bg);color:var(--info);"><i data-lucide="droplets"></i></div>
                <span class="settings-item-label">Tiền nước (${waterUsage} m³)</span>
                <span class="settings-item-value">${formatVND(waterCost)}</span>
            </div>` : ''}
            ${serviceCost ? `<div class="settings-item">
                <div class="settings-item-icon" style="background:rgba(168,85,247,0.12);color:#a855f7;"><i data-lucide="concierge-bell"></i></div>
                <span class="settings-item-label">Dịch vụ</span>
                <span class="settings-item-value">${formatVND(serviceCost)}</span>
            </div>` : ''}
        </div>

        <div style="background:linear-gradient(135deg,var(--primary-dark),var(--primary));border-radius:var(--radius-lg);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:14px;color:rgba(255,255,255,0.8);">TỔNG CỘNG</span>
            <span style="font-size:22px;font-weight:800;color:white;">${formatVND(inv.total)}</span>
        </div>

        ${tenants.length > 0 ? `
            <div style="margin-top:12px;padding:12px;background:var(--surface);border-radius:var(--radius-md);">
                <div style="font-size:12px;color:var(--tg-theme-hint-color);margin-bottom:6px;font-weight:600;">NGƯỜI THUÊ</div>
                ${tenants.map(t => `
                    <div style="font-size:13px;display:flex;align-items:center;gap:6px;margin-top:4px;">
                        <span style="font-weight:600;">${t.name}</span>
                        ${t.phone ? `<span style="color:var(--tg-theme-hint-color);">— ${t.phone}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;

    showModal(`HĐ ${room ? room.name : ''} — ${formatMonth(inv.month)}`, content);
}

// ─── Services Page ─────────────────────
function renderServices() {
    const services = Store.getServices();

    if (services.length === 0) {
        document.getElementById('serviceList').innerHTML = `
            <div class="empty-state">
                <i data-lucide="concierge-bell"></i>
                <p class="empty-state-text">Chưa có dịch vụ nào</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const serviceIcons = {
        'điện': 'zap', 'nước': 'droplets', 'internet': 'wifi', 'wifi': 'wifi',
        'giữ xe': 'bike', 'xe': 'bike', 'rác': 'trash-2', 'vệ sinh': 'sparkles',
        'giặt': 'shirt', 'bảo vệ': 'shield', 'thang máy': 'arrow-up-down',
        'nước uống': 'cup-soda', 'gas': 'flame'
    };

    function getServiceIcon(name) {
        const lower = (name || '').toLowerCase();
        for (const [k, v] of Object.entries(serviceIcons)) {
            if (lower.includes(k)) return v;
        }
        return 'package';
    }

    let html = `<div class="summary-bar">
        <span class="summary-label">Tổng dịch vụ</span>
        <span class="summary-value">${services.length}</span>
    </div>`;

    services.forEach(s => {
        const icon = getServiceIcon(s.name);
        html += `
            <div class="service-card">
                <div class="service-icon"><i data-lucide="${icon}"></i></div>
                <div class="service-info">
                    <div class="service-name">${s.name}</div>
                    <div class="service-unit">/ ${s.unit || 'tháng'}</div>
                </div>
                <div class="service-price">${formatVND(s.price)}</div>
            </div>
        `;
    });

    document.getElementById('serviceList').innerHTML = html;
    lucide.createIcons();
}

// ─── Settings Page ─────────────────────
function renderSettings() {
    const settings = Store.getSettings();
    const stats = Store.getStats();

    let html = `
        <div class="revenue-card">
            <div class="revenue-label">Doanh thu ${formatMonthFull(stats.curMonth)}</div>
            <div class="revenue-value">${formatVND(stats.monthRevenue)}</div>
            <div class="revenue-change">Đã thu: ${formatVND(stats.monthPaid)} · Chưa thu: ${formatVND(stats.monthRevenue - stats.monthPaid)}</div>
        </div>

        <div class="settings-group">
            <div class="settings-group-title">Giá dịch vụ</div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:var(--warning-bg);color:var(--warning);"><i data-lucide="zap"></i></div>
                <span class="settings-item-label">Giá điện</span>
                <span class="settings-item-value">${formatVND(settings.electricityPrice || 0)}/kWh</span>
            </div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:var(--info-bg);color:var(--info);"><i data-lucide="droplets"></i></div>
                <span class="settings-item-label">Giá nước</span>
                <span class="settings-item-value">${formatVND(settings.waterPrice || 0)}/m³</span>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-group-title">Thông tin chủ trọ</div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:rgba(99,102,241,0.12);color:var(--primary-light);"><i data-lucide="user"></i></div>
                <span class="settings-item-label">Tên</span>
                <span class="settings-item-value">${settings.landlordName || '—'}</span>
            </div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:var(--success-bg);color:var(--success);"><i data-lucide="phone"></i></div>
                <span class="settings-item-label">SĐT</span>
                <span class="settings-item-value">${settings.landlordPhone || '—'}</span>
            </div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:var(--warning-bg);color:var(--warning);"><i data-lucide="map-pin"></i></div>
                <span class="settings-item-label">Địa chỉ</span>
                <span class="settings-item-value" style="font-size:12px;max-width:180px;text-align:right;">${settings.landlordAddress || '—'}</span>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-group-title">Thống kê</div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:rgba(99,102,241,0.12);color:var(--primary-light);"><i data-lucide="door-open"></i></div>
                <span class="settings-item-label">Tổng phòng</span>
                <span class="settings-item-value">${stats.totalRooms}</span>
            </div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:var(--danger-bg);color:var(--danger);"><i data-lucide="home"></i></div>
                <span class="settings-item-label">Đã cho thuê</span>
                <span class="settings-item-value">${stats.occupied}</span>
            </div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:var(--success-bg);color:var(--success);"><i data-lucide="check-circle"></i></div>
                <span class="settings-item-label">Phòng trống</span>
                <span class="settings-item-value">${stats.available}</span>
            </div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:var(--info-bg);color:var(--info);"><i data-lucide="users"></i></div>
                <span class="settings-item-label">Người thuê</span>
                <span class="settings-item-value">${stats.totalTenants}</span>
            </div>
            <div class="settings-item">
                <div class="settings-item-icon" style="background:rgba(236,72,153,0.12);color:#ec4899;"><i data-lucide="file-signature"></i></div>
                <span class="settings-item-label">HĐ hiệu lực</span>
                <span class="settings-item-value">${stats.activeContracts}</span>
            </div>
        </div>

        <div style="text-align:center;padding:16px 0;color:var(--tg-theme-hint-color);font-size:11px;">
            Nhà Trọ Eden v1.0 · Powered by Firebase<br>
            ${tgUser ? `👤 ${tgUser.first_name} ${tgUser.last_name || ''}` : ''}
        </div>
    `;

    document.getElementById('settingsContent').innerHTML = html;
    lucide.createIcons();
}

// ─── Refresh Handler ───────────────────
document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    haptic('medium');

    try {
        await Store.loadAll();
        renderPage(currentPage);
        showToast('Đã cập nhật dữ liệu!', 'success');
        haptic('success');
    } catch (err) {
        showToast('Lỗi cập nhật: ' + err.message, 'error');
        haptic('error');
    }

    setTimeout(() => btn.classList.remove('spinning'), 500);
});

// ─── App Init ──────────────────────────
async function initApp() {
    console.log('[App] 🚀 Initializing Nhà Trọ Eden WebApp...');

    try {
        // Load all data from Firestore
        await Store.loadAll();

        // Start realtime listeners
        Store.startListeners((collection) => {
            console.log(`[Realtime] 🔄 Updated: ${collection}`);
            renderPage(currentPage);
        });

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('fade-out');

        // Show app
        document.getElementById('app').style.display = 'flex';

        // Render initial page
        renderDashboard();

        // Initialize Lucide icons
        lucide.createIcons();

        console.log('[App] ✅ Ready!');
        haptic('success');

        // Remove loading screen after animation
        setTimeout(() => loadingScreen.remove(), 600);

    } catch (err) {
        console.error('[App] ❌ Init error:', err);
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.querySelector('.loading-subtitle').textContent = 'Lỗi kết nối. Thử lại...';
        setTimeout(() => initApp(), 3000);
    }
}

// Start the app
initApp();
