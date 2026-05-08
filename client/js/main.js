/**
 * TekVotes Homepage - Complete with Events and Working Sections
 */

const API_URL = window.location.origin + '/api';

// Load all homepage data
async function loadHomeData() {
    console.log('Loading homepage data...');
    await loadFeaturedEvents();
    await loadFeaturedContestants();
    await loadLeaderboard();
    await loadStats();
}

// Load featured events
async function loadFeaturedEvents() {
    const grid = document.getElementById('featuredEventsGrid');
    if (!grid) return;

    try {
        const response = await fetch(`${API_URL}/events/featured`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            grid.innerHTML = result.data.map(event => `
                <div class="event-featured-card glass-card animate-on-scroll">
                    <div class="event-featured-image">
                        <img src="${event.event_image || 'https://placehold.co/400x250/1a1a1a/D4AF37?text=Event'}" 
                             alt="${escapeHtml(event.event_name)}"
                             onerror="this.src='https://placehold.co/400x250/1a1a1a/D4AF37?text=Event'">
                        <div class="event-featured-badge">${event.is_active ? 'Active' : 'Upcoming'}</div>
                    </div>
                    <div class="event-featured-info">
                        <h3>${escapeHtml(event.event_name)}</h3>
                        <p>${escapeHtml(event.description?.substring(0, 100) || 'No description')}</p>
                        <div class="event-featured-details">
                            <span><i class="fas fa-tag"></i> ${formatCurrency(event.vote_price, event.currency)}/vote</span>
                            <span><i class="fas fa-calendar"></i> Ends: ${formatDate(event.end_date)}</span>
                        </div>
                        <a href="vote.html" class="btn btn-primary small">Vote Now</a>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<p class="no-data">No active events at the moment. Check back soon!</p>';
        }
    } catch (error) {
        console.error('Error loading events:', error);
        grid.innerHTML = '<p class="error">Error loading events</p>';
    }
}

// Load featured contestants
async function loadFeaturedContestants() {
    const grid = document.getElementById('featuredContestants');
    if (!grid) return;

    try {
        const response = await fetch(`${API_URL}/contestants`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            const contestants = result.data.slice(0, 6);
            grid.innerHTML = contestants.map(contestant => `
                <div class="contestant-card animate-on-scroll">
                    <div class="contestant-image">
                        <img src="${contestant.image || 'https://placehold.co/400x500/1a1a1a/D4AF37?text=No+Image'}" 
                             alt="${escapeHtml(contestant.full_name)}"
                             onerror="this.src='https://placehold.co/400x500/1a1a1a/D4AF37?text=No+Image'">
                        <div class="contestant-overlay"><span class="contestant-votes">${(contestant.votes || 0).toLocaleString()} votes</span></div>
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
        } else {
            grid.innerHTML = '<p class="no-data">No contestants yet. Check back soon!</p>';
        }
    } catch (error) {
        console.error('Error loading contestants:', error);
        grid.innerHTML = '<p class="error">Error loading contestants</p>';
    }
}

// Load leaderboard
async function loadLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard');
    if (!leaderboardEl) return;

    try {
        const response = await fetch(`${API_URL}/contestants`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            const top5 = [...result.data].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 5);
            leaderboardEl.innerHTML = top5.map((contestant, index) => `
                <div class="leaderboard-item animate-on-scroll">
                    <div class="leaderboard-rank ${index === 0 ? 'rank-1' : ''}">${index === 0 ? '🏆' : (index + 1)}</div>
                    <img src="${contestant.image || 'https://placehold.co/50x50/1a1a1a/D4AF37?text=?'}" alt="${escapeHtml(contestant.full_name)}" class="leaderboard-img" onerror="this.src='https://placehold.co/50x50/1a1a1a/D4AF37?text=?'">
                    <div class="leaderboard-info"><div class="leaderboard-name">${escapeHtml(contestant.full_name)}</div><div class="leaderboard-category">${escapeHtml(contestant.category || 'Contestant')}</div></div>
                    <div class="leaderboard-votes">${(contestant.votes || 0).toLocaleString()} votes</div>
                </div>
            `).join('');
        } else {
            leaderboardEl.innerHTML = '<p class="no-data">No votes yet. Be the first to vote!</p>';
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardEl.innerHTML = '<p class="error">Error loading leaderboard</p>';
    }
}

// Load stats
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/contestants`);
        const result = await response.json();

        if (result.success && result.data) {
            const totalContestants = result.data.length;
            const totalVotes = result.data.reduce((sum, c) => sum + (c.votes || 0), 0);
            document.getElementById('statContestants').textContent = totalContestants;
            document.getElementById('statVotes').textContent = totalVotes.toLocaleString();
            document.getElementById('statVoters').textContent = Math.floor(totalVotes * 0.7).toLocaleString();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Helper functions
function formatCurrency(amount, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: currency }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Navbar scroll effect
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
}

// Mobile menu
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}

// Scroll animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    animatedElements.forEach(el => observer.observe(el));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHomeData();
    initNavbar();
    initMobileMenu();
    initScrollAnimations();
});