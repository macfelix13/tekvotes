/**
 * Paystack Configuration
 * Handles Paystack payment gateway integration
 */

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Determine which keys to use based on mode
const isTestMode = process.env.PAYSTACK_MODE === 'test';
const SECRET_KEY = isTestMode ? process.env.PAYSTACK_TEST_SECRET_KEY : process.env.PAYSTACK_SECRET_KEY;
const PUBLIC_KEY = isTestMode ? process.env.PAYSTACK_TEST_PUBLIC_KEY : process.env.PAYSTACK_PUBLIC_KEY;

// Paystack API base URL
const PAYSTACK_API_URL = 'https://api.paystack.co';

// Create axios instance for Paystack API calls
const paystackApi = axios.create({
    baseURL: PAYSTACK_API_URL,
    headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

/**
 * Initialize a transaction
 * @param {Object} params - Transaction parameters
 * @param {string} params.email - Customer email
 * @param {number} params.amount - Amount in pesewas/kobo (smallest currency unit)
 * @param {string} params.reference - Unique transaction reference
 * @param {string} params.callback_url - URL to redirect after payment
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Paystack response
 */
async function initializeTransaction(params) {
    try {
        const payload = {
            email: params.email,
            amount: params.amount, // Already in kobo/pesewas
            reference: params.reference,
            callback_url: params.callback_url || `${process.env.FRONTEND_URL}/success.html`,
            metadata: params.metadata || {},
            currency: params.currency || 'GHS',
            channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
        };

        const response = await paystackApi.post('/transaction/initialize', payload);
        
        if (response.data.status) {
            return {
                success: true,
                authorization_url: response.data.data.authorization_url,
                access_code: response.data.data.access_code,
                reference: response.data.data.reference
            };
        } else {
            throw new Error(response.data.message || 'Transaction initialization failed');
        }
    } catch (error) {
        console.error('Paystack initialize error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || error.message
        };
    }
}

/**
 * Verify a transaction
 * @param {string} reference - Transaction reference
 * @returns {Promise<Object>} Verification result
 */
async function verifyTransaction(reference) {
    try {
        const response = await paystackApi.get(`/transaction/verify/${reference}`);
        
        if (response.data.status) {
            const transaction = response.data.data;
            return {
                success: true,
                status: transaction.status,
                amount: transaction.amount,
                currency: transaction.currency,
                customer: transaction.customer,
                reference: transaction.reference,
                paid_at: transaction.paid_at,
                channel: transaction.channel,
                metadata: transaction.metadata
            };
        } else {
            return {
                success: false,
                message: response.data.message || 'Verification failed'
            };
        }
    } catch (error) {
        console.error('Paystack verify error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || error.message
        };
    }
}

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - x-paystack-signature header
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(payload, signature) {
    const expectedSignature = crypto
        .createHmac('sha512', SECRET_KEY)
        .update(payload)
        .digest('hex');
    
    return signature === expectedSignature;
}

/**
 * List all banks
 * @param {string} country - Country code (NG, GH, ZA, KE)
 * @returns {Promise<Array>} List of banks
 */
async function listBanks(country = 'GH') {
    try {
        const response = await paystackApi.get(`/bank?country=${country}`);
        return response.data.status ? response.data.data : [];
    } catch (error) {
        console.error('Error fetching banks:', error);
        return [];
    }
}

/**
 * Convert amount to pesewas/kobo (smallest currency unit)
 * @param {number} amount - Amount in main currency
 * @returns {number} Amount in pesewas/kobo
 */
function convertToSubUnit(amount) {
    return Math.round(amount * 100);
}

/**
 * Convert amount from pesewas/kobo to main currency
 * @param {number} amount - Amount in pesewas/kobo
 * @returns {number} Amount in main currency
 */
function convertToMainUnit(amount) {
    return amount / 100;
}

module.exports = {
    paystackApi,
    initializeTransaction,
    verifyTransaction,
    verifyWebhookSignature,
    listBanks,
    convertToSubUnit,
    convertToMainUnit,
    PUBLIC_KEY,
    SECRET_KEY,
    isTestMode
};