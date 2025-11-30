const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');
const { auth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { sendBookingConfirmation } = require('../utils/notifications');

// PayPal environment setup
const environment = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (process.env.PAYPAL_MODE === 'production') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  } else {
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
  }
};

const client = () => {
  return new paypal.core.PayPalHttpClient(environment());
};

// @route   POST /api/payments/create
// @desc    Create PayPal payment
// @access  Private
router.post('/create', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('event')
      .populate('user');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Booking already paid' });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: booking.totalAmount.toFixed(2)
        },
        description: `Booking for ${booking.event.title} - ${booking.tickets} ticket(s)`
      }],
      application_context: {
        brand_name: 'Event Booking System',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${req.protocol}://${req.get('host')}/payment/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel`
      }
    });

    const order = await client().execute(request);

    res.json({
      orderId: order.result.id,
      approvalUrl: order.result.links.find(link => link.rel === 'approve').href
    });
  } catch (error) {
    console.error('PayPal error:', error);
    res.status(500).json({ message: 'Payment creation failed', error: error.message });
  }
});

// @route   POST /api/payments/capture
// @desc    Capture PayPal payment
// @access  Private
router.post('/capture', auth, async (req, res) => {
  try {
    const { orderId, bookingId } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const capture = await client().execute(request);

    if (capture.result.status === 'COMPLETED') {
      // Update booking status
      const booking = await Booking.findById(bookingId)
        .populate('event');

      if (booking) {
        booking.paymentStatus = 'completed';
        booking.paymentId = capture.result.id;
        await booking.save();

        // Update event availability
        const event = await Event.findById(booking.event._id);
        event.availableTickets -= booking.tickets;
        await event.save();

        // Send confirmation email after payment is completed
        const populatedBooking = await Booking.findById(booking._id)
          .populate('user', 'name email')
          .populate('event');
        
        if (populatedBooking.user && populatedBooking.user.email) {
          sendBookingConfirmation(populatedBooking, populatedBooking.event, populatedBooking.user)
            .catch(err => console.error('Email sending error:', err));
        }
      }

      res.json({
        success: true,
        paymentId: capture.result.id,
        booking
      });
    } else {
      res.status(400).json({ message: 'Payment not completed' });
    }
  } catch (error) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ message: 'Payment capture failed', error: error.message });
  }
});

module.exports = router;

