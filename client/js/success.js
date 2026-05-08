/**
 * TekVotes Success Page
 * Verifies payment and displays receipt
 */

const successLoading = document.getElementById('successLoading');
const successContent = document.getElementById('successContent');
const errorContent = document.getElementById('errorContent');
const errorMessage = document.getElementById('errorMessage');

// Get reference from URL
function getReference() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('reference');
}

// Verify payment
async function verifyPayment() {
    const reference = getReference();

    if (!reference) {
        showError('No transaction reference found');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/payments/verify/${reference}`);
        const result = await response.json();

        if (result.success) {
            displaySuccess(result.data);
        } else {
            showError(result.message || 'Payment verification failed');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showError('Failed to verify payment. Please contact support.');
    }
}

// Display success receipt
function displaySuccess(data) {
    if (successLoading) successLoading.style.display = 'none';
    if (successContent) successContent.style.display = 'block';

    // Fill receipt
    const receiptContestant = document.getElementById('receiptContestant');
    const receiptVotes = document.getElementById('receiptVotes');
    const receiptVoterName = document.getElementById('receiptVoterName');
    const receiptEmail = document.getElementById('receiptEmail');
    const receiptAmount = document.getElementById('receiptAmount');
    const receiptRef = document.getElementById('receiptRef');
    const receiptDate = document.getElementById('receiptDate');

    if (receiptContestant) receiptContestant.textContent = data.contestant_name || 'Contestant';
    if (receiptVotes) receiptVotes.textContent = data.votes_added || 0;
    if (receiptVoterName) receiptVoterName.textContent = data.voter_name || '—';
    if (receiptEmail) receiptEmail.textContent = data.voter_email || '—';
    if (receiptAmount) receiptAmount.textContent = formatCurrency(data.amount_paid || 0);
    if (receiptRef) receiptRef.textContent = data.reference || '—';
    if (receiptDate) receiptDate.textContent = formatDate(data.transaction_date || new Date());
}

// Show error state
function showError(message) {
    if (successLoading) successLoading.style.display = 'none';
    if (errorContent) errorContent.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message || 'Something went wrong. Please contact support.';
}

// Format currency
function formatCurrency(amount, currency = 'GHS') {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return new Date().toLocaleString();
    return date.toLocaleString();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    verifyPayment();
});