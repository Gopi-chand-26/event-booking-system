const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { sendBookingConfirmation } = require('../utils/notifications');
const { auth } = require('../middleware/auth');

// @route   POST /api/bookings
// @desc    Create a booking
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { eventId, tickets } = req.body;

    if (!eventId || !tickets || tickets < 1) {
      return res.status(400).json({ message: 'Invalid booking data' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'active') {
      return res.status(400).json({ message: 'Event is not available for booking' });
    }

    if (event.availableTickets < tickets) {
      return res.status(400).json({ message: 'Not enough tickets available' });
    }

    const totalAmount = event.price * tickets;

    const booking = new Booking({
      user: req.user._id,
      event: eventId,
      tickets,
      totalAmount,
      paymentStatus: 'pending'
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('event');

    // Don't send confirmation email yet - wait for payment completion
    // Confirmation email will be sent when payment is completed

    res.status(201).json(populatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('event')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('event');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns the booking or is admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/bookings/:id/confirm
// @desc    Confirm booking after payment
// @access  Private
router.put('/:id/confirm', auth, async (req, res) => {
  try {
    const { paymentId } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('event');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Booking already confirmed' });
    }

    // Update booking
    booking.paymentStatus = 'completed';
    booking.paymentId = paymentId;
    await booking.save();

    // Update event availability
    const event = await Event.findById(booking.event._id);
    event.availableTickets -= booking.tickets;
    await event.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('event');

    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

