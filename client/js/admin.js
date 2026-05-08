/**
 * TekVotes Admin Dashboard - COMPLETE WORKING VERSION
 * With TikTok social media and Event Image upload
 */

const API_URL = window.location.origin + '/api';

let currentSection = 'overview';
let voteChart = null;
let allTransactions = [];
let allContestants = [];
let allEvents = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Set admin name
    const adminName = localStorage.getItem('adminName') || 'Admin';
    const adminNameSpan = document.getElementById('adminName');
    if (adminNameSpan) adminNameSpan.textContent = adminName;
    
    // Initialize everything
    initSidebar();
    initModals();
    await loadDashboard();
    await loadContestantsTable();
    await loadAllTransactions();
    await loadEvents();
    setupEventListeners();
});

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function loadDashboard() {
    await loadStats();
    await loadChart();
    await loadRecentTransactions();
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/contestants`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const totalContestants = result.data.length;
            const totalVotes = result.data.reduce((sum, c) => sum + (c.votes || 0), 0);
            const totalRevenue = totalVotes * 1;
            const uniqueVoters = Math.floor(totalVotes * 0.7);
            
            document.getElementById('dashContestants').textContent = totalContestants;
            document.getElementById('dashVotes').textContent = totalVotes.toLocaleString();
            document.getElementById('dashRevenue').textContent = formatCurrency(totalRevenue);
            document.getElementById('dashVoters').textContent = uniqueVoters.toLocaleString();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadChart() {
    try {
        const response = await fetch(`${API_URL}/contestants`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const top10 = result.data.slice(0, 10);
            const labels = top10.map(c => c.full_name.substring(0, 20));
            const votes = top10.map(c => c.votes || 0);
            
            const ctx = document.getElementById('voteChart')?.getContext('2d');
            if (ctx) {
                if (voteChart) voteChart.destroy();
                voteChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Votes',
                            data: votes,
                            backgroundColor: 'rgba(212, 175, 55, 0.7)',
                            borderColor: 'rgba(212, 175, 55, 1)',
                            borderWidth: 1,
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
            
            // Top contestants list
            const topList = document.getElementById('topContestantsList');
            if (topList) {
                topList.innerHTML = result.data.slice(0, 5).map((c, idx) => `
                    <div class="top-contestant-item">
                        <span class="top-contestant-rank">${idx + 1}</span>
                        <span class="top-contestant-name">${escapeHtml(c.full_name)}</span>
                        <span class="top-contestant-votes">${(c.votes || 0).toLocaleString()}</span>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading chart:', error);
    }
}

async function loadRecentTransactions() {
    const tbody = document.getElementById('recentTransactionsBody');
    if (!tbody) return;
    
    try {
        const response = await fetch(`${API_URL}/votes`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            const recent = result.data.slice(0, 5);
            tbody.innerHTML = recent.map(t => `
                <tr>
                    <td>${escapeHtml(t.voter_name || 'Anonymous')}</td>
                    <td>${escapeHtml(t.contestant_name)}</td>
                    <td>${t.votes_count || 1}</td>
                    <td>${formatCurrency(t.amount_paid || 0)}</td>
                    <td>${formatDate(t.created_at)}</td>
                    <td><span class="status-badge success">Success</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No transactions yet</td></tr>';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error loading transactions</td></tr>';
    }
}

// ============================================
// CONTESTANT FUNCTIONS
// ============================================

async function loadContestantsTable() {
    const tbody = document.getElementById('contestantsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loader-spinner small"></div> Loading contestants...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/contestants`);
        const result = await response.json();
        
        if (result.success && result.data) {
            allContestants = result.data;
            renderContestantsTable(allContestants);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No contestants found. Click "Add Contestant" to create one.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading contestants:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error loading contestants</td></tr>';
    }
}

function renderContestantsTable(contestants) {
    const tbody = document.getElementById('contestantsTableBody');
    if (!tbody) return;
    
    if (contestants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No contestants found</td></tr>';
        return;
    }
    
    tbody.innerHTML = contestants.map(c => `
        <tr>
            <td>
                <img src="${c.image || 'https://placehold.co/40x40/1a1a1a/D4AF37?text=?'}" 
                     style="width:40px;height:40px;object-fit:cover;border-radius:50%;"
                     onerror="this.src='https://placehold.co/40x40/1a1a1a/D4AF37?text=?'">
            </td>
            <td><strong>${escapeHtml(c.full_name)}</strong></td>
            <td>${escapeHtml(c.category || '-')}</td>
            <td><span class="event-badge">${escapeHtml(c.event_name || 'No Event')}</span></td>
            <td>${(c.votes || 0).toLocaleString()}</td>
            <td><span class="status-badge ${c.is_active !== false ? 'success' : 'pending'}">${c.is_active !== false ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-edit" data-id="${c.id}" title="Edit Contestant"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" data-id="${c.id}" title="Delete Contestant"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editContestant(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteContestant(parseInt(btn.dataset.id)));
    });
}

async function loadEventsForDropdown() {
    try {
        const response = await fetch(`${API_URL}/events`);
        const result = await response.json();
        const eventSelect = document.getElementById('contestantEventId');
        if (!eventSelect) return;
        
        if (result.success && result.data && result.data.length > 0) {
            eventSelect.innerHTML = '<option value="">-- Select Event --</option>' + 
                result.data.map(event => `<option value="${event.id}">${escapeHtml(event.event_name)} ${event.is_active ? '(Active)' : '(Inactive)'}</option>`).join('');
        } else {
            eventSelect.innerHTML = '<option value="">-- No Events Available --</option>';
        }
    } catch (error) {
        console.error('Error loading events for dropdown:', error);
    }
}

function showAddContestantModal() {
    document.getElementById('modalTitle').textContent = 'Add New Contestant';
    document.getElementById('contestantId').value = '';
    document.getElementById('contestantFullName').value = '';
    document.getElementById('contestantCategory').value = '';
    document.getElementById('contestantBio').value = '';
    document.getElementById('contestantInstagram').value = '';
    document.getElementById('contestantTiktok').value = '';
    document.getElementById('contestantFacebook').value = '';
    document.getElementById('contestantEventId').value = '';
    document.getElementById('imagePreview').innerHTML = '<i class="fas fa-user-circle upload-placeholder"></i>';
    loadEventsForDropdown();
    document.getElementById('contestantModal').classList.remove('hidden');
}

async function editContestant(id) {
    const contestant = allContestants.find(c => c.id === id);
    if (!contestant) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Contestant';
    document.getElementById('contestantId').value = contestant.id;
    document.getElementById('contestantFullName').value = contestant.full_name;
    document.getElementById('contestantCategory').value = contestant.category || '';
    document.getElementById('contestantBio').value = contestant.biography || '';
    document.getElementById('contestantInstagram').value = contestant.instagram || '';
    document.getElementById('contestantTiktok').value = contestant.tiktok || '';
    document.getElementById('contestantFacebook').value = contestant.facebook || '';
    
    await loadEventsForDropdown();
    document.getElementById('contestantEventId').value = contestant.event_id || '';
    
    const preview = document.getElementById('imagePreview');
    if (contestant.image) {
        preview.innerHTML = `<img src="${contestant.image}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        preview.innerHTML = '<i class="fas fa-user-circle upload-placeholder"></i>';
    }
    
    document.getElementById('contestantModal').classList.remove('hidden');
}

async function deleteContestant(id) {
    const contestant = allContestants.find(c => c.id === id);
    if (!confirm(`Are you sure you want to delete "${contestant?.full_name}"? This action cannot be undone.`)) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/contestants/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Contestant deleted successfully', 'success');
            await loadContestantsTable();
            await loadDashboard();
            await loadChart();
        } else {
            showToast(result.message || 'Failed to delete contestant', 'error');
        }
    } catch (error) {
        console.error('Error deleting contestant:', error);
        showToast('Error deleting contestant', 'error');
    }
}

async function saveContestant(event) {
    event.preventDefault();
    
    const id = document.getElementById('contestantId').value;
    const formData = new FormData();
    formData.append('full_name', document.getElementById('contestantFullName').value);
    formData.append('category', document.getElementById('contestantCategory').value);
    formData.append('biography', document.getElementById('contestantBio').value);
    formData.append('instagram', document.getElementById('contestantInstagram').value);
    formData.append('tiktok', document.getElementById('contestantTiktok').value);
    formData.append('facebook', document.getElementById('contestantFacebook').value);
    formData.append('event_id', document.getElementById('contestantEventId').value || '');
    
    const imageFile = document.getElementById('contestantImage').files[0];
    if (imageFile) formData.append('image', imageFile);
    
    const url = id ? `${API_URL}/contestants/${id}` : `${API_URL}/contestants`;
    const method = id ? 'PUT' : 'POST';
    
    const saveBtn = document.getElementById('saveContestantBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<div class="loader-spinner small white"></div> Saving...';
    saveBtn.disabled = true;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        
        if (result.success) {
            showToast(id ? 'Contestant updated successfully' : 'Contestant added successfully', 'success');
            document.getElementById('contestantModal').classList.add('hidden');
            await loadContestantsTable();
            await loadDashboard();
            await loadChart();
        } else {
            showToast(result.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error saving contestant:', error);
        showToast('Error saving contestant', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ============================================
// EVENT FUNCTIONS
// ============================================

async function loadEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loader-spinner"></div> Loading events...';
    
    try {
        const response = await fetch(`${API_URL}/events`);
        const result = await response.json();
        
        if (result.success && result.data) {
            allEvents = result.data;
            renderEvents(allEvents);
        } else {
            grid.innerHTML = '<p style="text-align:center;">No events found. Click "Create Event" to add one.</p>';
        }
    } catch (error) {
        console.error('Error loading events:', error);
        grid.innerHTML = '<p style="text-align:center; color:red;">Error loading events</p>';
    }
}

function renderEvents(events) {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    
    if (events.length === 0) {
        grid.innerHTML = '<p style="text-align:center;">No events found. Click "Create Event" to add one.</p>';
        return;
    }
    
    grid.innerHTML = events.map(event => `
        <div class="event-card-item">
            <div class="event-card-header">
                <h3>${escapeHtml(event.event_name)}</h3>
            </div>
            <div class="event-card-body">
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <img src="${event.event_image || 'https://placehold.co/80x80/1a1a1a/D4AF37?text=Event'}" 
                         style="width:80px;height:80px;object-fit:cover;border-radius:10px;"
                         onerror="this.src='https://placehold.co/80x80/1a1a1a/D4AF37?text=Event'">
                    <div style="flex:1;">
                        <span class="event-status ${event.is_active ? 'active' : ''}">${event.is_active ? '🟢 Active' : '⚫ Inactive'}</span>
                        <p style="margin-top: 0.5rem;">${escapeHtml(event.description?.substring(0, 100) || 'No description')}${event.description?.length > 100 ? '...' : ''}</p>
                    </div>
                </div>
                <p><strong>💰 Vote Price:</strong> ${formatCurrency(event.vote_price, event.currency)}</p>
                <p><strong>📅 Start:</strong> ${formatDate(event.start_date)}</p>
                <p><strong>⏰ End:</strong> ${formatDate(event.end_date)}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn btn-outline small edit-event" data-id="${event.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-outline small delete-event" data-id="${event.id}" style="border-color: #ef4444; color: #ef4444;"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.edit-event').forEach(btn => {
        btn.addEventListener('click', () => editEvent(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-event').forEach(btn => {
        btn.addEventListener('click', () => deleteEvent(parseInt(btn.dataset.id)));
    });
}

function showAddEventModal() {
    document.getElementById('eventModalTitle').textContent = 'Create New Event';
    document.getElementById('eventId').value = '';
    document.getElementById('eventName').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('eventStartDate').value = '';
    document.getElementById('eventEndDate').value = '';
    document.getElementById('eventVotePrice').value = '1.00';
    document.getElementById('eventCurrency').value = 'GHS';
    document.getElementById('eventIsActive').checked = true;
    document.getElementById('eventImagePreview').innerHTML = '<i class="fas fa-calendar-alt upload-placeholder"></i>';
    document.getElementById('eventModal').classList.remove('hidden');
}

async function editEvent(id) {
    const event = allEvents.find(e => e.id === id);
    if (!event) return;
    
    document.getElementById('eventModalTitle').textContent = 'Edit Event';
    document.getElementById('eventId').value = event.id;
    document.getElementById('eventName').value = event.event_name;
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('eventStartDate').value = event.start_date?.slice(0, 16) || '';
    document.getElementById('eventEndDate').value = event.end_date?.slice(0, 16) || '';
    document.getElementById('eventVotePrice').value = event.vote_price || '1.00';
    document.getElementById('eventCurrency').value = event.currency || 'GHS';
    document.getElementById('eventIsActive').checked = event.is_active === 1;
    
    const preview = document.getElementById('eventImagePreview');
    if (event.event_image) {
        preview.innerHTML = `<img src="${event.event_image}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        preview.innerHTML = '<i class="fas fa-calendar-alt upload-placeholder"></i>';
    }
    
    document.getElementById('eventModal').classList.remove('hidden');
}

async function deleteEvent(id) {
    const event = allEvents.find(e => e.id === id);
    if (!confirm(`Are you sure you want to delete "${event?.event_name}"? This will also remove this event from contestants.`)) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Event deleted successfully', 'success');
            await loadEvents();
            await loadContestantsTable();
            await loadEventsForDropdown();
        } else {
            showToast(result.message || 'Failed to delete event', 'error');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Error deleting event', 'error');
    }
}

async function saveEvent(event) {
    event.preventDefault();
    
    const id = document.getElementById('eventId').value;
    const formData = new FormData();
    formData.append('event_name', document.getElementById('eventName').value);
    formData.append('description', document.getElementById('eventDescription').value);
    formData.append('start_date', document.getElementById('eventStartDate').value);
    formData.append('end_date', document.getElementById('eventEndDate').value);
    formData.append('vote_price', document.getElementById('eventVotePrice').value);
    formData.append('currency', document.getElementById('eventCurrency').value);
    formData.append('is_active', document.getElementById('eventIsActive').checked ? 1 : 0);
    
    const imageFile = document.getElementById('eventImage').files[0];
    if (imageFile) formData.append('event_image', imageFile);
    
    if (!formData.get('event_name') || !formData.get('start_date') || !formData.get('end_date')) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const url = id ? `${API_URL}/events/${id}` : `${API_URL}/events`;
    const method = id ? 'PUT' : 'POST';
    
    const saveBtn = document.getElementById('saveEventBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<div class="loader-spinner small white"></div> Saving...';
    saveBtn.disabled = true;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        
        if (result.success) {
            showToast(id ? 'Event updated successfully' : 'Event created successfully', 'success');
            document.getElementById('eventModal').classList.add('hidden');
            await loadEvents();
            await loadEventsForDropdown();
        } else {
            showToast(result.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Error saving event', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ============================================
// TRANSACTIONS FUNCTIONS
// ============================================

async function loadAllTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8"><div class="loader-spinner small"></div> Loading transactions...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/votes`);
        const result = await response.json();
        
        if (result.success && result.data) {
            allTransactions = result.data;
            renderTransactionsTable(allTransactions);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No transactions found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Error loading transactions</td></tr>';
    }
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No transactions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map((t, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(t.voter_name || 'Anonymous')}</td>
            <td>${escapeHtml(t.voter_email || '-')}</td>
            <td>${escapeHtml(t.contestant_name)}</td>
            <td>${t.votes_count || 1}</td>
            <td>${formatCurrency(t.amount_paid || 0)}</td>
            <td>${formatDate(t.created_at)}</td>
            <td><span class="status-badge success">Success</span></td>
        </tr>
    `).join('');
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => sidebar?.classList.add('open'));
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => sidebar?.classList.remove('open'));
    }
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) showSection(section);
            sidebar?.classList.remove('open');
        });
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'admin-login.html';
        });
    }
    
    const refreshBtn = document.getElementById('refreshStats');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboard();
            loadContestantsTable();
            loadEvents();
            showToast('Dashboard refreshed', 'success');
        });
    }
}

function initModals() {
    // Contestant modal close handlers
    const closeModal = document.getElementById('closeContestantModal');
    const cancelModal = document.getElementById('cancelContestantModal');
    const modalOverlay = document.getElementById('contestantModal');
    
    if (closeModal) closeModal.addEventListener('click', () => modalOverlay?.classList.add('hidden'));
    if (cancelModal) cancelModal.addEventListener('click', () => modalOverlay?.classList.add('hidden'));
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
        });
    }
    
    // Event modal close handlers
    const closeEventModal = document.getElementById('closeEventModal');
    const cancelEventModal = document.getElementById('cancelEventModal');
    const eventModalOverlay = document.getElementById('eventModal');
    
    if (closeEventModal) closeEventModal.addEventListener('click', () => eventModalOverlay?.classList.add('hidden'));
    if (cancelEventModal) cancelEventModal.addEventListener('click', () => eventModalOverlay?.classList.add('hidden'));
    if (eventModalOverlay) {
        eventModalOverlay.addEventListener('click', (e) => {
            if (e.target === eventModalOverlay) eventModalOverlay.classList.add('hidden');
        });
    }
    
    // Form submissions
    const contestantForm = document.getElementById('contestantForm');
    if (contestantForm) contestantForm.addEventListener('submit', saveContestant);
    
    const eventForm = document.getElementById('eventForm');
    if (eventForm) eventForm.addEventListener('submit', saveEvent);
    
    // Contestant image preview
    const imageInput = document.getElementById('contestantImage');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const preview = document.getElementById('imagePreview');
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.innerHTML = `<img src="${event.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                };
                reader.readAsDataURL(e.target.files[0]);
            } else {
                preview.innerHTML = '<i class="fas fa-user-circle upload-placeholder"></i>';
            }
        });
    }
    
    // Event image preview
    const eventImageInput = document.getElementById('eventImage');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', (e) => {
            const preview = document.getElementById('eventImagePreview');
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.innerHTML = `<img src="${event.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                };
                reader.readAsDataURL(e.target.files[0]);
            } else {
                preview.innerHTML = '<i class="fas fa-calendar-alt upload-placeholder"></i>';
            }
        });
    }
}

function setupEventListeners() {
    // Add contestant button
    const addContestantBtn = document.getElementById('addContestantBtn');
    if (addContestantBtn) addContestantBtn.addEventListener('click', showAddContestantModal);
    
    // Add event button
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) addEventBtn.addEventListener('click', showAddEventModal);
    
    // Transaction filters
    const filterBadges = document.querySelectorAll('.filter-badge');
    const searchInput = document.getElementById('transactionSearch');
    
    if (filterBadges.length) {
        filterBadges.forEach(badge => {
            badge.addEventListener('click', () => {
                filterBadges.forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
                const status = badge.dataset.status;
                let filtered = allTransactions;
                if (status !== 'all') {
                    filtered = allTransactions.filter(t => t.payment_status === status);
                }
                renderTransactionsTable(filtered);
            });
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            let filtered = allTransactions;
            const activeStatus = document.querySelector('.filter-badge.active')?.dataset.status;
            if (activeStatus && activeStatus !== 'all') {
                filtered = filtered.filter(t => t.payment_status === activeStatus);
            }
            filtered = filtered.filter(t =>
                (t.voter_name || '').toLowerCase().includes(search) ||
                (t.voter_email || '').toLowerCase().includes(search) ||
                (t.contestant_name || '').toLowerCase().includes(search)
            );
            renderTransactionsTable(filtered);
        });
    }
    
    // Contestant search
    const contestantSearch = document.getElementById('contestantSearch');
    if (contestantSearch) {
        contestantSearch.addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            const filtered = allContestants.filter(c =>
                c.full_name.toLowerCase().includes(search) ||
                (c.category || '').toLowerCase().includes(search)
            );
            renderContestantsTable(filtered);
        });
    }
}

function showSection(section) {
    currentSection = section;
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === section) link.classList.add('active');
    });
    
    document.querySelectorAll('.dashboard-section').forEach(sectionEl => {
        sectionEl.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`section-${section}`);
    if (targetSection) targetSection.classList.add('active');
    
    const breadcrumb = document.getElementById('breadcrumbText');
    const sectionNames = {
        overview: 'Dashboard Overview',
        contestants: 'Manage Contestants',
        transactions: 'Transaction History',
        events: 'Manage Events'
    };
    if (breadcrumb) breadcrumb.textContent = sectionNames[section] || section;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Make showSection global for onclick
window.showSection = showSection;