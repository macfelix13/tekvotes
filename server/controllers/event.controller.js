/**
 * Event Controller
 * Manages voting events
 */

const { Event } = require('../models/db');

const getAllEvents = async (req, res) => {
    try {
        const events = await Event.findAll();
        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch events' });
    }
};

const getActiveEvent = async (req, res) => {
    try {
        const event = await Event.findActive();
        res.json({ success: true, data: event || null });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch active event' });
    }
};

const createEvent = async (req, res) => {
    try {
        const { event_name, description, start_date, end_date, vote_price, currency } = req.body;

        if (!event_name || !start_date || !end_date || !vote_price) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const id = await Event.create({ event_name, description, start_date, end_date, vote_price, currency });
        const newEvent = await Event.findById(id);

        res.status(201).json({ success: true, message: 'Event created successfully', data: newEvent });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create event' });
    }
};

const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await Event.update(id, req.body);
        const updated = await Event.findById(id);
        res.json({ success: true, message: 'Event updated successfully', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update event' });
    }
};

module.exports = { getAllEvents, getActiveEvent, createEvent, updateEvent };
