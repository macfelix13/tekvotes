/**
 * TekVotes Contestants Page - COMPLETE WORKING VERSION
 */

const API_URL = window.location.origin + '/api';

let allContestants = [];
let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'votes';

// DOM Elements
const contestantsGrid = document.getElementById('contestantsGrid');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');
const sortSelect = document.getElementById('sortSelect');
const resultsCount = document.getElementById('resultsCount');
const noResults = document.getElementById('noResults');

// Load contestants
async function loadContestants() {
    if (!contestantsGrid) return;

    try {
        console.log('Loading contestants from:', `${API_URL}/contestants`);
        contestantsGrid.innerHTML = '<div class="loader-spinner" style="margin:2rem auto;"></div>';
        
        const response = await fetch(`${API_URL}/contestants`);
        const result = await response.json();
        
        console.log('Contestants response:', result);

        if (result.success && result.data) {
            allContestants = result.data;
            console.log(`Loaded ${allContestants.length} contestants`);
            buildFilters();
            filterAndRender();
        } else {
            contestantsGrid.innerHTML = `
                <div style="text-align:center; padding:3rem;">
                    <p>No contestants found.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading contestants:', error);
        contestantsGrid.innerHTML = `
            <div style="text-align:center; padding:3rem; color:red;">
                <p>Error loading contestants. Make sure the server is running on port 3000.</p>
                <p style="font-size:0.875rem;">${error.message}</p>
            </div>
        `;
    }
}

// Build category filters
function buildFilters() {
    if (!filterTabs) return;

    const categories = ['all', ...new Set(allContestants.map(c => c.category).filter(Boolean))];
    filterTabs.innerHTML = categories.map(cat => `
        <button class="filter-tab ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">
            ${cat === 'all' ? 'All' : escapeHtml(cat)}
        </button>
    `).join('');

    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterAndRender();
        });
    });
}

// Filter and sort
function filterAndRender() {
    let filtered = [...allContestants];

    if (currentCategory !== 'all') {
        filtered = filtered.filter(c => c.category === currentCategory);
    }

    if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(c =>
            c.full_name.toLowerCase().includes(searchLower) ||
            (c.category && c.category.toLowerCase().includes(searchLower))
        );
    }

    if (currentSort === 'votes') {
        filtered.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    } else if (currentSort === 'name') {
        filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    if (resultsCount) {
        resultsCount.textContent = `Showing ${filtered.length} contestant${filtered.length !== 1 ? 's' : ''}`;
    }

    if (noResults) {
        if (filtered.length === 0) {
            noResults.classList.remove('hidden');
            contestantsGrid.classList.add('hidden');
        } else {
            noResults.classList.add('hidden');
            contestantsGrid.classList.remove('hidden');
        }
    }

    renderContestants(filtered);
}

// Render contestants
function renderContestants(contestants) {
    if (!contestantsGrid) return;

    if (contestants.length === 0) {
        contestantsGrid.innerHTML = '';
        return;
    }

    contestantsGrid.innerHTML = contestants.map(contestant => `
        <div class="contestant-card">
            <div class="contestant-image">
                <img src="${contestant.image ? `/uploads/${contestant.image}` : 'https://placehold.co/400x500/1a1a1a/D4AF37?text=No+Image'}"
                     alt="${escapeHtml(contestant.full_name)}"
                     onerror="this.src='https://placehold.co/400x500/1a1a1a/D4AF37?text=No+Image'">
                <div class="contestant-overlay">
                    <span class="contestant-votes">${(contestant.votes || 0).toLocaleString()} votes</span>
                </div>
            </div>
            <div class="contestant-info">
                <h3 class="contestant-name">${escapeHtml(contestant.full_name)}</h3>
                <p class="contestant-category">${escapeHtml(contestant.category || 'Contestant')}</p>
                <div class="contestant-actions">
                    <a href="profile.html?id=${contestant.id}" class="btn btn-outline small">View Profile</a>
                    <a href="vote.html?contestant=${contestant.id}" class="btn btn-primary small">Vote Now</a>
                </div>
            </div>
        </div>
    `).join('');
}

// Search handler
function initSearch() {
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        filterAndRender();
    });
}

// Sort handler
function initSort() {
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndRender();
    });
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Navbar
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
}

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadContestants();
    initSearch();
    initSort();
    initNavbar();
    initMobileMenu();
});