/**
 * TekVotes Profile Page
 * Displays single contestant profile with voting widget
 */

let currentContestant = null;
let currentVotePrice = 1.00;
let currentVotesCount = 1;

// DOM Elements
const profileContent = document.getElementById('profileContent');
const pageLoader = document.getElementById('pageLoader');
const profileImage = document.getElementById('profileImage');
const profileName = document.getElementById('profileName');
const profileCategory = document.getElementById('profileCategory');
const profileEvent = document.getElementById('profileEvent');
const profileBio = document.getElementById('profileBio');
const profileVotes = document.getElementById('profileVotes');
const profileRanking = document.getElementById('profileRanking');
const profileRank = document.getElementById('profileRank');
const profileSocial = document.getElementById('profileSocial');
const otherContestants = document.getElementById('otherContestants');
const quickVoteName = document.getElementById('quickVoteName');
const votePriceDisplay = document.getElementById('votePriceDisplay');
const quickVoteCount = document.getElementById('quickVoteCount');
const quickVoteTotal = document.getElementById('quickVoteTotal');
const quickVoteBtnTotal = document.getElementById('quickVoteBtnTotal');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');

// Get contestant ID from URL
function getContestantId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load contestant profile
async function loadProfile() {
    const contestantId = getContestantId();

    if (!contestantId) {
        showToast('No contestant selected', 'error');
        setTimeout(() => window.location.href = 'contestants.html', 2000);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/contestants/${contestantId}`);
        const result = await response.json();

        if (result.success && result.data) {
            currentContestant = result.data;
            await loadVotePrice();
            renderProfile();
            await loadOtherContestants();
            if (pageLoader) pageLoader.style.display = 'none';
            if (profileContent) profileContent.style.display = 'block';
        } else {
            throw new Error('Contestant not found');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load contestant profile', 'error');
        setTimeout(() => window.location.href = 'contestants.html', 2000);
    }
}

// Load vote price from active event
async function loadVotePrice() {
    try {
        const response = await fetch(`${API_BASE_URL}/events/active`);
        const result = await response.json();

        if (result.success && result.data) {
            currentVotePrice = parseFloat(result.data.vote_price);
            if (votePriceDisplay) {
                votePriceDisplay.textContent = `${result.data.currency || 'GHS'} ${currentVotePrice.toFixed(2)} per vote`;
            }
        }
    } catch (error) {
        console.error('Error loading vote price:', error);
    }
}

// Render profile
function renderProfile() {
    if (!currentContestant) return;

    // Basic info
    if (profileName) profileName.textContent = currentContestant.full_name;
    if (profileCategory) profileCategory.textContent = currentContestant.category || 'Contestant';
    if (profileEvent) profileEvent.textContent = currentContestant.event_name || 'Miss TekVotes 2024';
    if (profileBio) profileBio.textContent = currentContestant.biography || 'No biography provided yet.';
    if (profileVotes) profileVotes.textContent = currentContestant.votes.toLocaleString();

    // Image
    if (profileImage) {
        profileImage.src = currentContestant.image ? `/uploads/${currentContestant.image}` : 'https://placehold.co/600x700/eee/333?text=No+Image';
        profileImage.alt = currentContestant.full_name;
    }

    // Quick vote name
    if (quickVoteName) quickVoteName.textContent = currentContestant.full_name;

    // Social links
    renderSocialLinks();

    // Vote progress (mock - based on ranking)
    // In real app, you'd compare to top contestant
    updateVoteProgress();

    // Update vote total display
    updateVoteTotal();
}

// Render social links
function renderSocialLinks() {
    if (!profileSocial) return;

    const socials = [];
    if (currentContestant.instagram) {
        socials.push(`<a href="https://instagram.com/${currentContestant.instagram.replace('@', '')}" target="_blank" class="social-link"><i class="fab fa-instagram"></i></a>`);
    }
    if (currentContestant.twitter) {
        socials.push(`<a href="https://twitter.com/${currentContestant.twitter.replace('@', '')}" target="_blank" class="social-link"><i class="fab fa-twitter"></i></a>`);
    }
    if (currentContestant.facebook) {
        socials.push(`<a href="https://facebook.com/${currentContestant.facebook}" target="_blank" class="social-link"><i class="fab fa-facebook"></i></a>`);
    }

    if (socials.length === 0) {
        profileSocial.innerHTML = '<p class="no-social">No social links added</p>';
    } else {
        profileSocial.innerHTML = socials.join('');
    }
}

// Update vote progress (percentage of top contestant)
async function updateVoteProgress() {
    try {
        const response = await fetch(`${API_BASE_URL}/contestants`);
        const result = await response.json();

        if (result.success && result.data) {
            const topVotes = Math.max(...result.data.map(c => c.votes));
            const percentage = topVotes > 0 ? (currentContestant.votes / topVotes) * 100 : 0;
            if (progressFill) progressFill.style.width = `${percentage}%`;
            if (progressPercent) progressPercent.textContent = `${Math.round(percentage)}%`;

            // Calculate rank
            const sorted = result.data.sort((a, b) => b.votes - a.votes);
            const rank = sorted.findIndex(c => c.id === currentContestant.id) + 1;
            if (profileRanking) profileRanking.textContent = `#${rank}`;
            if (profileRank) profileRank.textContent = `#${rank}`;
        }
    } catch (error) {
        console.error('Error updating vote progress:', error);
    }
}

// Load other contestants
async function loadOtherContestants() {
    if (!otherContestants) return;

    try {
        const response = await fetch(`${API_BASE_URL}/contestants`);
        const result = await response.json();

        if (result.success && result.data) {
            const others = result.data.filter(c => c.id !== currentContestant?.id).slice(0, 4);
            otherContestants.innerHTML = others.map(c => `
                <div class="contestant-card mini">
                    <div class="contestant-image">
                        <img src="${c.image ? `/uploads/${c.image}` : 'https://placehold.co/200x250/eee/333?text=No+Image'}" alt="${escapeHtml(c.full_name)}">
                        <div class="contestant-overlay">
                            <span class="contestant-votes">${c.votes.toLocaleString()} votes</span>
                        </div>
                    </div>
                    <div class="contestant-info">
                        <h3 class="contestant-name">${escapeHtml(c.full_name)}</h3>
                        <a href="profile.html?id=${c.id}" class="btn btn-outline small btn-block">View Profile</a>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading other contestants:', error);
    }
}

// Update vote total
function updateVoteTotal() {
    const total = currentVotePrice * currentVotesCount;
    if (quickVoteTotal) quickVoteTotal.textContent = formatCurrency(total);
    if (quickVoteBtnTotal) quickVoteBtnTotal.textContent = formatCurrency(total);
}

// Handle vote quantity changes
function initVoteControls() {
    const decreaseBtn = document.getElementById('decreaseVotes');
    const increaseBtn = document.getElementById('increaseVotes');
    const voteCountInput = quickVoteCount;

    if (decreaseBtn && increaseBtn && voteCountInput) {
        decreaseBtn.addEventListener('click', () => {
            let val = parseInt(voteCountInput.value) || 1;
            if (val > 1) {
                val--;
                voteCountInput.value = val;
                currentVotesCount = val;
                updateVoteTotal();
            }
        });

        increaseBtn.addEventListener('click', () => {
            let val = parseInt(voteCountInput.value) || 1;
            if (val < 1000) {
                val++;
                voteCountInput.value = val;
                currentVotesCount = val;
                updateVoteTotal();
            }
        });

        voteCountInput.addEventListener('change', () => {
            let val = parseInt(voteCountInput.value) || 1;
            val = Math.min(1000, Math.max(1, val));
            voteCountInput.value = val;
            currentVotesCount = val;
            updateVoteTotal();
        });
    }
}

// Handle vote button click
function initVoteButton() {
    const voteBtn = document.getElementById('quickVoteBtn');
    const profileVoteBtn = document.getElementById('profileVoteBtn');

    const voteHandler = (e) => {
        e.preventDefault();
        if (!currentContestant) return;

        // Store in session storage for vote page
        sessionStorage.setItem('voteData', JSON.stringify({
            contestant_id: currentContestant.id,
            contestant_name: currentContestant.full_name,
            votes_count: currentVotesCount,
            vote_price: currentVotePrice
        }));

        window.location.href = `vote.html?contestant=${currentContestant.id}&votes=${currentVotesCount}`;
    };

    if (voteBtn) voteBtn.addEventListener('click', voteHandler);
    if (profileVoteBtn) profileVoteBtn.addEventListener('click', voteHandler);
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

// Format currency
function formatCurrency(amount, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    if (container) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } else {
        alert(message);
    }
}

// Initialize navbar and mobile menu
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
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    initVoteControls();
    initVoteButton();
    initNavbar();
    initMobileMenu();
});