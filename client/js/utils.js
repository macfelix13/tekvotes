/**
 * TekVotes Utilities
 * Shared helper functions for all pages
 */

// API Base URL - Auto-detect based on current host
const API_BASE_URL = (() => {
    // If running on same server (Node.js serving frontend)
    if (window.location.port === '3000' || window.location.port === '') {
        return `${window.location.protocol}//${window.location.hostname}:3000/api`;
    }
    // If running on different port (e.g., live server)
    return 'http://localhost:3000/api';
})();

console.log('API_BASE_URL:', API_BASE_URL);

// Helper: Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Create container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
    }
    
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Helper: Format currency
function formatCurrency(amount, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount || 0);
}

// Helper: Format date
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Helper: API request
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    // Add auth token if available
    const token = localStorage.getItem('adminToken');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Helper: GET request
async function apiGet(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}

// Helper: POST request
async function apiPost(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

// Helper: Number animator
function animateNumber(element, target, duration = 1000) {
    if (!element) return;
    let start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const update = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.floor(current).toLocaleString();
            requestAnimationFrame(update);
        } else {
            element.textContent = target.toLocaleString();
        }
    };
    
    update();
}

// Helper: Validate email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper: Validate phone
function isValidPhone(phone) {
    return /^[+\d\s-]{10,20}$/.test(phone);
}

// Helper: Get URL parameter
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Helper: Countdown timer
function startCountdown(targetDate, elements) {
    const updateTimer = () => {
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
            if (elements.days) elements.days.textContent = '00';
            if (elements.hours) elements.hours.textContent = '00';
            if (elements.minutes) elements.minutes.textContent = '00';
            if (elements.seconds) elements.seconds.textContent = '00';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (elements.days) elements.days.textContent = days.toString().padStart(2, '0');
        if (elements.hours) elements.hours.textContent = hours.toString().padStart(2, '0');
        if (elements.minutes) elements.minutes.textContent = minutes.toString().padStart(2, '0');
        if (elements.seconds) elements.seconds.textContent = seconds.toString().padStart(2, '0');
    };
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// Helper: Show/hide loading state
function showLoading(element, show) {
    if (!element) return;
    if (show) {
        element.disabled = true;
        element.classList.add('loading');
    } else {
        element.disabled = false;
        element.classList.remove('loading');
    }
}

// Helper: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Make functions globally available
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.apiRequest = apiRequest;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.animateNumber = animateNumber;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.getUrlParam = getUrlParam;
window.startCountdown = startCountdown;
window.showLoading = showLoading;
window.debounce = debounce;
window.escapeHtml = escapeHtml;
window.API_BASE_URL = API_BASE_URL;