/**
 * Contestant Controller
 * CRUD operations for contestants
 */

const { Contestant } = require('../models/db');
const path = require('path');
const fs = require('fs');

// Get all contestants
const getAllContestants = async (req, res) => {
    try {
        const contestants = await Contestant.findAll();
        res.json({ success: true, data: contestants });
    } catch (error) {
        console.error('Get contestants error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contestants' });
    }
};

// Get single contestant
const getContestant = async (req, res) => {
    try {
        const { id } = req.params;
        const contestant = await Contestant.findById(id);

        if (!contestant) {
            return res.status(404).json({ success: false, message: 'Contestant not found' });
        }

        res.json({ success: true, data: contestant });
    } catch (error) {
        console.error('Get contestant error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contestant' });
    }
};

// Create contestant (Admin only)
const createContestant = async (req, res) => {
    try {
        const { full_name, biography, category, event_id, instagram, twitter, facebook } = req.body;

        if (!full_name) {
            return res.status(400).json({ success: false, message: 'Full name is required' });
        }

        // Get image filename if uploaded
        const image = req.file ? req.file.filename : null;

        const id = await Contestant.create({
            full_name,
            image,
            biography,
            category,
            event_id,
            instagram,
            twitter,
            facebook
        });

        const newContestant = await Contestant.findById(id);
        res.status(201).json({
            success: true,
            message: 'Contestant created successfully',
            data: newContestant
        });

    } catch (error) {
        console.error('Create contestant error:', error);
        res.status(500).json({ success: false, message: 'Failed to create contestant' });
    }
};

// Update contestant (Admin only)
const updateContestant = async (req, res) => {
    try {
        const { id } = req.params;
        const contestant = await Contestant.findById(id);

        if (!contestant) {
            return res.status(404).json({ success: false, message: 'Contestant not found' });
        }

        // Update image if new one uploaded
        if (req.file) {
            // Delete old image
            if (contestant.image) {
                const oldImagePath = path.join(__dirname, '../uploads', contestant.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            await Contestant.updateImage(id, req.file.filename);
        }

        await Contestant.update(id, {
            full_name: req.body.full_name || contestant.full_name,
            biography: req.body.biography || contestant.biography,
            category: req.body.category || contestant.category,
            instagram: req.body.instagram || contestant.instagram,
            twitter: req.body.twitter || contestant.twitter,
            facebook: req.body.facebook || contestant.facebook,
            is_active: req.body.is_active !== undefined ? req.body.is_active : contestant.is_active
        });

        const updated = await Contestant.findById(id);
        res.json({ success: true, message: 'Contestant updated successfully', data: updated });

    } catch (error) {
        console.error('Update contestant error:', error);
        res.status(500).json({ success: false, message: 'Failed to update contestant' });
    }
};

// Delete contestant (Admin only)
const deleteContestant = async (req, res) => {
    try {
        const { id } = req.params;
        const contestant = await Contestant.findById(id);

        if (!contestant) {
            return res.status(404).json({ success: false, message: 'Contestant not found' });
        }

        await Contestant.delete(id);
        res.json({ success: true, message: 'Contestant removed successfully' });

    } catch (error) {
        console.error('Delete contestant error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete contestant' });
    }
};

// Get contestant stats
const getStats = async (req, res) => {
    try {
        const stats = await Contestant.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
};

module.exports = {
    getAllContestants,
    getContestant,
    createContestant,
    updateContestant,
    deleteContestant,
    getStats
};
