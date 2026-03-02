/* ========================================
   Data Store for Telegram WebApp
   Firebase Firestore Direct Access
   ======================================== */

const Store = {
    _data: {
        rooms: [],
        tenants: [],
        contracts: [],
        services: [],
        roomServices: [],
        invoices: [],
        utilities: [],
        settings: {}
    },
    _listeners: [],
    _loaded: false,

    // ─── Load all data from Firestore ───
    async loadAll() {
        const collections = ['rooms', 'tenants', 'contracts', 'services', 'roomServices', 'invoices', 'utilities'];

        const promises = collections.map(async (col) => {
            try {
                const snapshot = await db.collection(col).get();
                const items = [];
                snapshot.forEach(doc => {
                    items.push({ ...doc.data(), id: doc.id });
                });
                this._data[col] = items;
            } catch (err) {
                console.warn(`[Store] Failed to load ${col}:`, err.message);
            }
        });

        // Load settings separately
        promises.push((async () => {
            try {
                const doc = await db.collection('settings').doc('main').get();
                this._data.settings = doc.exists ? doc.data() : {};
            } catch (err) {
                console.warn('[Store] Failed to load settings:', err.message);
            }
        })());

        await Promise.all(promises);
        this._loaded = true;
        console.log('[Store] ✅ All data loaded');
    },

    // ─── Realtime listeners (onSnapshot) ───
    // Hiệu quả hơn polling: chỉ đọc khi data thay đổi, không đọc định kỳ vô ích
    _listeners: [],
    startListeners(onUpdate) {
        if (this._listeners.length > 0) return; // đã chạy rồi
        const collections = ['rooms', 'tenants', 'contracts', 'services', 'roomServices', 'invoices', 'utilities'];

        collections.forEach(col => {
            const unsub = db.collection(col).onSnapshot(snapshot => {
                const items = [];
                snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
                const changed = JSON.stringify(this._data[col]) !== JSON.stringify(items);
                this._data[col] = items;
                if (this._loaded && changed && onUpdate) onUpdate(col);
            }, err => {
                console.warn(`[Store] Listener error for ${col}:`, err.message);
            });
            this._listeners.push(unsub);
        });

        // Settings listener
        const unsub = db.collection('settings').doc('main').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                const changed = JSON.stringify(this._data.settings) !== JSON.stringify(data);
                this._data.settings = data;
                if (this._loaded && changed && onUpdate) onUpdate('settings');
            }
        }, err => console.warn('[Store] Settings listener error:', err.message));
        this._listeners.push(unsub);

        console.log('[Store] 👁️ Realtime listeners active — chỉ đọc khi có thay đổi');
    },

    stopListeners() {
        this._listeners.forEach(unsub => unsub());
        this._listeners = [];
    },

    // ─── Getters ───
    getRooms() { return this._data.rooms; },
    getTenants() { return this._data.tenants; },
    getContracts() { return this._data.contracts; },
    getServices() { return this._data.services; },
    getRoomServices() { return this._data.roomServices; },
    getInvoices() { return this._data.invoices; },
    getUtilities() { return this._data.utilities; },
    getSettings() { return this._data.settings; },

    // ─── Computed ───
    getRoomTenants(roomId) {
        return this._data.tenants.filter(t => t.roomId === roomId);
    },

    getRoomInvoices(roomId) {
        return this._data.invoices.filter(i => i.roomId === roomId)
            .sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    },

    getRoomServices_forRoom(roomId) {
        return this._data.roomServices
            .filter(rs => rs.roomId === roomId)
            .map(rs => {
                const svc = this._data.services.find(s => s.id === rs.serviceId);
                return { ...rs, serviceName: svc ? svc.name : '—', servicePrice: svc ? svc.price : 0, serviceUnit: svc ? svc.unit : '' };
            });
    },

    getRoomUtilities(roomId) {
        return this._data.utilities.filter(u => u.roomId === roomId)
            .sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    },

    getContract(roomId) {
        return this._data.contracts.find(c => c.roomId === roomId && c.status === 'active');
    },

    // Summary stats
    getStats() {
        const rooms = this._data.rooms;
        const tenants = this._data.tenants;
        const invoices = this._data.invoices;
        const contracts = this._data.contracts;

        const occupied = rooms.filter(r => r.status === 'occupied').length;
        const available = rooms.filter(r => r.status === 'available' || r.status !== 'occupied').length;
        const unpaidInvoices = invoices.filter(i => !i.paid);
        const totalUnpaid = unpaidInvoices.reduce((s, i) => s + (i.total || 0), 0);
        const activeContracts = contracts.filter(c => c.status === 'active').length;

        // Current month revenue
        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthInvoices = invoices.filter(i => i.month === curMonth);
        const monthRevenue = monthInvoices.reduce((s, i) => s + (i.total || 0), 0);
        const monthPaid = monthInvoices.filter(i => i.paid).reduce((s, i) => s + (i.total || 0), 0);

        return {
            totalRooms: rooms.length,
            occupied,
            available,
            totalTenants: tenants.length,
            activeContracts,
            unpaidCount: unpaidInvoices.length,
            totalUnpaid,
            monthRevenue,
            monthPaid,
            curMonth
        };
    }
};
