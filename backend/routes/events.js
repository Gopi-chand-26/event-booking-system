const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { auth, adminAuth } = require('../middleware/auth');

// @route   GET /api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    else query.status = 'active';

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Try to get events, handle populate errors gracefully
    let events;
    try {
      events = await Event.find(query)
        .populate('organizer', 'name email')
        .sort({ date: 1 });
    } catch (populateError) {
      // If populate fails (e.g., organizer doesn't exist), get events without populate
      console.warn('Populate error, fetching without organizer:', populateError.message);
      events = await Event.find(query).sort({ date: 1 });
    }

    res.json(events);
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch events',
      error: error.message 
    });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events
// @desc    Create new event
// @access  Private (Admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    // Validate required fields
    const { title, description, category, date, time, venue, price, totalTickets } = req.body;
    
    if (!title || !description || !category || !date || !time || !venue || !price || !totalTickets) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!venue.name || !venue.address || !venue.city) {
      return res.status(400).json({ message: 'Venue name, address, and city are required' });
    }

    // Ensure price and totalTickets are numbers
    const eventPrice = parseFloat(price);
    const eventTotalTickets = parseInt(totalTickets);

    if (isNaN(eventPrice) || eventPrice < 0) {
      return res.status(400).json({ message: 'Price must be a valid positive number' });
    }

    if (isNaN(eventTotalTickets) || eventTotalTickets < 1) {
      return res.status(400).json({ message: 'Total tickets must be a valid number greater than 0' });
    }

    const eventData = {
      title,
      description,
      category,
      date: new Date(date),
      time,
      venue: {
        name: venue.name,
        address: venue.address,
        city: venue.city
      },
      price: eventPrice,
      totalTickets: eventTotalTickets,
      availableTickets: eventTotalTickets,
      organizer: req.user._id,
      status: req.body.status || 'active',
      image: req.body.image || ''
    };

    const event = new Event(eventData);
    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('organizer', 'name email');

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Event creation error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (Admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Update available tickets if total tickets changed
    if (req.body.totalTickets && req.body.totalTickets !== event.totalTickets) {
      const difference = req.body.totalTickets - event.totalTickets;
      req.body.availableTickets = Math.max(0, event.availableTickets + difference);
    }

    Object.assign(event, req.body);
    await event.save();

    const updatedEvent = await Event.findById(event._id)
      .populate('organizer', 'name email');

    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private (Admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.deleteOne();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

