/**
 * TekVotes Voting Page
 * Handles contestant selection, voter details, and Paystack payment
 */

let selectedContestant = null;
let allContestants = [];
let currentVotePrice = 1.00;
let currentCurrency = 'GHS';
let currentVotesCount = 1;

// DOM Elements
const contestantSelector = document.getElementById('contestantSelector');
const selectedPreview = document.getElementById('selectedPreview');
const selectedImage = document.getElementById('selectedImage');
const selectedName = document.getElementById('selectedName');
const selectedCategory = document.getElementById('selectedCategory');
const selectedVotes = document.getElementById('selectedVotes');
const changeContestantBtn = document.getElementById('changeContestant');
const voterName = document.getElementById('voterName');
const voterEmail = document.getElementById('voterEmail');
const voterPhone = document.getElementById('voterPhone');
const votesCount = document.getElementById('votesCount');
const votePriceInfo = document.getElementById('votePriceInfo');
const summaryContestant = document.getElementById('summaryContestant');
const summaryVotes = document.getElementById('summaryVotes');
const summaryPrice = document.getElementById('summaryPrice');
const summaryTotal = document.getElementById('summaryTotal');
const payBtnTotal = document.getElementById('payBtnTotal');
const payBtn = document.getElementById('payBtn');
const voteForm = document.getElementById('voteForm');
const formLoading = document.getElementById('formLoading');

// Load initial data
async function loadInitialData() {
    await loadEventInfo();
    await loadContestants();
    await loadSidebarLeaderboard();

    // Check for pre-selected contestant from URL or session
    const urlParams = new URLSearchParams(window.location.search);
    const contestantId = urlParams.get('contestant');
    const presetVotes = urlParams.get('votes');

    if (presetVotes) {
        currentVotesCount = Math.min(1000, Math.max(1, parseInt(presetVotes)));
        if (votesCount) votesCount.value = currentVotesCount;
        updateTotal();
    }

    if (contestantId) {
        const preSelected = allContestants.find(c => c.id == contestantId);
        if (preSelected) {
            selectContestant(preSelected);
        }
    }

    // Load from session storage
    const storedData = sessionStorage.getItem('voteData');
    if (storedData && !contestantId) {
        const data = JSON.parse(storedData);
        const storedContestant = allContestants.find(c => c.id == data.contestant_id);
        if (storedContestant) {
            selectContestant(storedContestant);
            if (data.votes_count) {
                currentVotesCount = data.votes_count;
                if (votesCount) votesCount.value = currentVotesCount;
                updateTotal();
            }
        }
        sessionStorage.removeItem('voteData');
    }
}

// Load event info for vote price
async function loadEventInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/events/active`);
        const result = await response.json();

        if (result.success && result.data) {
            currentVotePrice = parseFloat(result.data.vote_price);
            currentCurrency = result.data.currency || 'GHS';
            if (votePriceInfo) {
                votePriceInfo.innerHTML = `<i class="fas fa-info-circle"></i> 1 vote = ${formatCurrency(currentVotePrice, currentCurrency)}`;
            }
            if (summaryPrice) {
                summaryPrice.textContent = formatCurrency(currentVotePrice, currentCurrency);
            }
            updateTotal();
        }
    } catch (error) {
        console.error('Error loading event info:', error);
    }
}

// Load contestants
async function loadContestants() {
    if (!contestantSelector) return;

    try {
        const response = await fetch(`${API_BASE_URL}/contestants`);
        const result = await response.json();

        if (result.success && result.data) {
            allContestants = result.data;
            renderContestantSelector();
        } else {
            contestantSelector.innerHTML = '<p class="error">Failed to load contestants.</p>';
        }
    } catch (error) {
        console.error('Error loading contestants:', error);
        contestantSelector.innerHTML = '<p class="error">Failed to load contestants. Please refresh.</p>';
    }
}

// Render contestant selection grid
function renderContestantSelector() {
    if (!contestantSelector) return;

    contestantSelector.innerHTML = `
        <div class="contestant-selector-grid">
            ${allContestants.map(contestant => `
                <div class="contestant-option ${selectedContestant?.id === contestant.id ? 'selected' : ''}"
                     data-id="${contestant.id}">
                    <img src="${contestant.image ? `/uploads/${contestant.image}` : 'https://placehold.co/80x80/eee/333?text=?'}"
                         alt="${escapeHtml(contestant.full_name)}"
                         class="contestant-option-img">
                    <div class="contestant-option-name">${escapeHtml(contestant.full_name)}</div>
                    <div class="contestant-option-votes">${contestant.votes.toLocaleString()} votes</div>
                </div>
            `).join('')}
        </div>
    `;

    // Add click handlers
    document.querySelectorAll('.contestant-option').forEach(option => {
        option.addEventListener('click', () => {
            const id = parseInt(option.dataset.id);
            const contestant = allContestants.find(c => c.id === id);
            if (contestant) selectContestant(contestant);
        });
    });
}

// Select a contestant
function selectContestant(contestant) {
    selectedContestant = contestant;

    // Update preview
    if (selectedPreview) selectedPreview.classList.remove('hidden');
    if (contestantSelector) contestantSelector.classList.add('hidden');

    if (selectedImage) {
        selectedImage.src = contestant.image ? `/uploads/${contestant.image}` : 'https://placehold.co/60x60/eee/333?text=?';
    }
    if (selectedName) selectedName.textContent = contestant.full_name;
    if (selectedCategory) selectedCategory.textContent = contestant.category || 'Contestant';
    if (selectedVotes) selectedVotes.textContent = `${contestant.votes.toLocaleString()} votes`;

    if (summaryContestant) summaryContestant.textContent = contestant.full_name;

    // Update selected option styling
    document.querySelectorAll('.contestant-option').forEach(opt => {
        opt.classList.remove('selected');
        if (parseInt(opt.dataset.id) === contestant.id) {
            opt.classList.add('selected');
        }
    });

    updateTotal();
}

// Change contestant (back to selector)
function changeContestant() {
    selectedContestant = null;
    if (selectedPreview) selectedPreview.classList.add('hidden');
    if (contestantSelector) contestantSelector.classList.remove('hidden');
    if (summaryContestant) summaryContestant.textContent = 'Not selected';
}

// Update vote total
function updateTotal() {
    const total = currentVotePrice * currentVotesCount;
    if (summaryVotes) summaryVotes.textContent = currentVotesCount;
    if (summaryTotal) summaryTotal.textContent = formatCurrency(total, currentCurrency);
    if (payBtnTotal) payBtnTotal.textContent = formatCurrency(total, currentCurrency);
}

// Handle vote quantity changes
function initVoteQuantity() {
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    const votesCountInput = votesCount;

    if (decreaseBtn && increaseBtn && votesCountInput) {
        decreaseBtn.addEventListener('click', () => {
            let val = parseInt(votesCountInput.value) || 1;
            if (val > 1) {
                val--;
                votesCountInput.value = val;
                currentVotesCount = val;
                updateTotal();
            }
        });

        increaseBtn.addEventListener('click', () => {
            let val = parseInt(votesCountInput.value) || 1;
            if (val < 1000) {
                val++;
                votesCountInput.value = val;
                currentVotesCount = val;
                updateTotal();
            }
        });

        votesCountInput.addEventListener('change', () => {
            let val = parseInt(votesCountInput.value) || 1;
            val = Math.min(1000, Math.max(1, val));
            votesCountInput.value = val;
            currentVotesCount = val;
            updateTotal();
        });
    }

    // Quick vote options
    document.querySelectorAll('.quick-vote-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const votes = parseInt(btn.dataset.votes);
            if (votesCountInput) votesCountInput.value = votes;
            currentVotesCount = votes;
            updateTotal();
        });
    });
}

// Validate form
function validateForm() {
    let isValid = true;

    if (!selectedContestant) {
        showToast('Please select a contestant', 'error');
        isValid = false;
    }

    const name = voterName?.value.trim();
    if (!name) {
        showToast('Please enter your full name', 'error');
        isValid = false;
    }

    const email = voterEmail?.value.trim();
    if (!email || !isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        isValid = false;
    }

    return isValid;
}

// Initialize Paystack payment
async function initializePayment() {
    if (!validateForm()) return;

    const payload = {
        contestant_id: selectedContestant.id,
        voter_name: voterName.value.trim(),
        voter_email: voterEmail.value.trim(),
        voter_phone: voterPhone?.value.trim() || null,
        votes_count: currentVotesCount
    };

    // Show loading state
    if (payBtn) payBtn.disabled = true;
    if (formLoading) formLoading.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/payments/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success && result.data) {
            // Open Paystack popup
            const paystackData = result.data;

            const handler = PaystackPop.setup({
                key: paystackData.public_key,
                email: paystackData.email,
                amount: paystackData.amount,
                currency: paystackData.currency,
                ref: paystackData.reference,
                callback: function(response) {
                    // Redirect to success page for verification
                    window.location.href = `success.html?reference=${response.reference}`;
                },
                onClose: function() {
                    showToast('Payment cancelled', 'info');
                    if (payBtn) payBtn.disabled = false;
                    if (formLoading) formLoading.classList.add('hidden');
                }
            });

            handler.openIframe();
        } else {
            throw new Error(result.message || 'Payment initialization failed');
        }

    } catch (error) {
        console.error('Payment init error:', error);
        showToast(error.message || 'Failed to initialize payment', 'error');
        if (payBtn) payBtn.disabled = false;
        if (formLoading) formLoading.classList.add('hidden');
    }
}

// Load sidebar leaderboard
async function loadSidebarLeaderboard() {
    const leaderboardContainer = document.getElementById('sidebarLeaderboard');
    if (!leaderboardContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/contestants`);
        const result = await response.json();

        if (result.success && result.data) {
            const top5 = result.data.slice(0, 5);
            leaderboardContainer.innerHTML = top5.map((c, idx) => `
                <div class="leaderboard-mini-item">
                    <span class="rank">${idx + 1}</span>
                    <span class="name">${escapeHtml(c.full_name)}</span>
                    <span class="votes">${c.votes.toLocaleString()}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading sidebar leaderboard:', error);
    }
}

// Helper functions
function formatCurrency(amount, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize change contestant button
if (changeContestantBtn) {
    changeContestantBtn.addEventListener('click', changeContestant);
}

// Form submit
if (voteForm) {
    voteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        initializePayment();
    });
}

// Initialize navbar
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.remove('scrolled');
        else navbar.classList.remove('scrolled');
        // Always add scrolled on vote page by default
        if (navbar) navbar.classList.add('scrolled');
    });
    // Set initial state
    if (navbar) navbar.classList.add('scrolled');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    initVoteQuantity();
    initNavbar();
});