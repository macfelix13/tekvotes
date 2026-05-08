/**
 * Payment Controller - REAL PAYSTACK INTEGRATION
 */

const axios = require('axios');
const pool = require('../config/database');
const { generateVoteId } = require('../config/database');
require('dotenv').config();

// Paystack configuration
const isTestMode = process.env.PAYSTACK_MODE === 'test';
const SECRET_KEY = isTestMode ? process.env.PAYSTACK_TEST_SECRET_KEY : process.env.PAYSTACK_SECRET_KEY;
const PUBLIC_KEY = isTestMode ? process.env.PAYSTACK_TEST_PUBLIC_KEY : process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

// Initialize payment
const initializePayment = async (req, res) => {
    try {
        const { contestant_id, voter_name, voter_email, voter_phone, votes_count } = req.body;

        console.log('📝 Payment initialization request:', { contestant_id, voter_name, voter_email, votes_count });

        if (!contestant_id || !voter_name || !voter_email || !votes_count) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (votes_count < 1 || votes_count > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Votes must be between 1 and 1000'
            });
        }

        // Get contestant with event_id
        const [contestants] = await pool.query(
            'SELECT * FROM contestants WHERE id = ? AND is_active = 1',
            [contestant_id]
        );
        
        if (contestants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contestant not found'
            });
        }
        
        const contestant = contestants[0];
        const event_id = contestant.event_id;

        // Get event details
        const [events] = await pool.query(
            'SELECT * FROM events WHERE id = ? AND is_active = 1',
            [event_id]
        );
        
        const votePrice = events.length > 0 ? parseFloat(events[0].vote_price) : 1.00;
        const currency = events.length > 0 ? events[0].currency : 'GHS';
        const totalAmount = votePrice * votes_count;
        const amountInSubUnits = Math.round(totalAmount * 100);
        const reference = `TEKV-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Save pending vote record
        const voteUniqueId = await generateVoteId();
        await pool.query(
            `INSERT INTO votes (vote_unique_id, contestant_id, event_id, voter_name, voter_email, voter_phone, votes_count, amount_paid, transaction_reference, payment_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [voteUniqueId, contestant_id, event_id, voter_name, voter_email, voter_phone || null, votes_count, totalAmount, reference]
        );

        console.log('💾 Vote record saved with reference:', reference);

        // Initialize Paystack transaction
        const paystackPayload = {
            email: voter_email,
            amount: amountInSubUnits,
            reference: reference,
            currency: currency,
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success.html`,
            metadata: {
                contestant_id: contestant_id,
                contestant_name: contestant.full_name,
                event_id: event_id,
                votes_count: votes_count,
                voter_name: voter_name,
                voter_phone: voter_phone || ''
            }
        };

        const paystackResponse = await axios.post(
            `${PAYSTACK_API_URL}/transaction/initialize`,
            paystackPayload,
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        if (paystackResponse.data.status) {
            res.json({
                success: true,
                message: 'Payment initialized successfully',
                data: {
                    authorization_url: paystackResponse.data.data.authorization_url,
                    reference: reference,
                    amount: totalAmount,
                    currency: currency,
                    public_key: PUBLIC_KEY,
                    is_test_mode: isTestMode
                }
            });
        } else {
            await pool.query(
                'UPDATE votes SET payment_status = "failed" WHERE transaction_reference = ?',
                [reference]
            );
            res.status(400).json({
                success: false,
                message: paystackResponse.data.message || 'Payment initialization failed'
            });
        }

    } catch (error) {
        console.error('❌ Initialize payment error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize payment: ' + (error.response?.data?.message || error.message)
        });
    }
};

// Verify payment
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;

        if (!reference) {
            return res.status(400).json({ success: false, message: 'Reference is required' });
        }

        const [votes] = await pool.query(
            'SELECT * FROM votes WHERE transaction_reference = ?',
            [reference]
        );
        
        if (votes.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        
        const voteRecord = votes[0];

        if (voteRecord.payment_status === 'success') {
            const [contestants] = await pool.query(
                'SELECT * FROM contestants WHERE id = ?',
                [voteRecord.contestant_id]
            );
            const contestant = contestants[0];
            return res.json({
                success: true,
                message: 'Payment already verified',
                data: {
                    reference,
                    votes_added: voteRecord.votes_count,
                    contestant_name: contestant.full_name,
                    amount_paid: voteRecord.amount_paid,
                    voter_name: voteRecord.voter_name,
                    voter_email: voteRecord.voter_email
                }
            });
        }

        const verificationResponse = await axios.get(
            `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
            {
                headers: { Authorization: `Bearer ${SECRET_KEY}` },
                timeout: 30000
            }
        );

        if (verificationResponse.data.status && verificationResponse.data.data.status === 'success') {
            await pool.query(
                'UPDATE votes SET payment_status = "success" WHERE transaction_reference = ?',
                [reference]
            );
            await pool.query(
                'UPDATE contestants SET votes = votes + ? WHERE id = ?',
                [voteRecord.votes_count, voteRecord.contestant_id]
            );

            const [contestants] = await pool.query(
                'SELECT * FROM contestants WHERE id = ?',
                [voteRecord.contestant_id]
            );
            const contestant = contestants[0];

            res.json({
                success: true,
                message: '✅ Payment verified successfully! Votes added.',
                data: {
                    reference,
                    votes_added: voteRecord.votes_count,
                    contestant_name: contestant.full_name,
                    amount_paid: voteRecord.amount_paid,
                    voter_name: voteRecord.voter_name,
                    voter_email: voteRecord.voter_email,
                    transaction_date: verificationResponse.data.data.paid_at || new Date().toISOString()
                }
            });
        } else {
            await pool.query(
                'UPDATE votes SET payment_status = "failed" WHERE transaction_reference = ?',
                [reference]
            );
            res.status(400).json({
                success: false,
                message: verificationResponse.data.message || 'Payment verification failed'
            });
        }

    } catch (error) {
        console.error('❌ Verify payment error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed: ' + (error.response?.data?.message || error.message)
        });
    }
};

// Webhook
const webhook = async (req, res) => {
    try {
        const event = req.body;
        console.log('📨 Paystack webhook event:', event.event);

        if (event.event === 'charge.success') {
            const reference = event.data.reference;
            const [votes] = await pool.query(
                'SELECT * FROM votes WHERE transaction_reference = ?',
                [reference]
            );
            if (votes.length > 0 && votes[0].payment_status !== 'success') {
                await pool.query(
                    'UPDATE votes SET payment_status = "success" WHERE transaction_reference = ?',
                    [reference]
                );
                await pool.query(
                    'UPDATE contestants SET votes = votes + ? WHERE id = ?',
                    [votes[0].votes_count, votes[0].contestant_id]
                );
                console.log(`✅ Webhook: Payment successful for ${reference}`);
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ success: false });
    }
};

const getAllTransactions = async (req, res) => {
    try {
        const [votes] = await pool.query(`
            SELECT v.*, c.full_name as contestant_name, e.event_name 
            FROM votes v 
            JOIN contestants c ON v.contestant_id = c.id 
            LEFT JOIN events e ON v.event_id = e.id
            ORDER BY v.created_at DESC
        `);
        res.json({ success: true, data: votes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(votes_count) as total_votes,
                SUM(amount_paid) as total_revenue,
                COUNT(DISTINCT voter_email) as unique_voters
            FROM votes 
            WHERE payment_status = 'success'
        `);
        res.json({ success: true, data: stats[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getTransactionStatus = async (req, res) => {
    try {
        const [votes] = await pool.query(
            'SELECT * FROM votes WHERE transaction_reference = ?',
            [req.params.reference]
        );
        if (votes.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, data: { status: votes[0].payment_status, amount: votes[0].amount_paid } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    initializePayment,
    verifyPayment,
    getAllTransactions,
    getDashboardStats,
    webhook,
    getTransactionStatus
};