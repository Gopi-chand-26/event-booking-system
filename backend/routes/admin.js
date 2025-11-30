const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
// @access  Private (Admin)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ status: 'active' });
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ paymentStatus: 'completed' });
    const totalUsers = await User.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalEvents,
      activeEvents,
      totalBookings,
      completedBookings,
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings
// @access  Private (Admin)
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('event')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/send-payment-reminders
// @desc    Manually trigger payment reminders (for testing)
// @access  Private (Admin)
router.post('/send-payment-reminders', adminAuth, async (req, res) => {
  try {
    const { sendPaymentReminders } = require('../utils/notifications');
    
    // Allow override of time requirement for testing (query param)
    const forceSend = req.query.force === 'true'; // ?force=true to send regardless of time
    
    const results = await sendPaymentReminders(forceSend);
    
    if (results.errors.length > 0 && results.emailsSent === 0 && results.totalFound === 0) {
      return res.status(500).json({ 
        message: 'Failed to send payment reminders',
        results: results
      });
    }
    
    res.json({ 
      message: 'Payment reminder process completed',
      results: {
        totalFound: results.totalFound,
        emailsSent: results.emailsSent,
        skipped: results.skipped,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('Error in send-payment-reminders endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/pending-bookings
// @desc    Get all pending bookings (for debugging)
// @access  Private (Admin)
router.get('/pending-bookings', adminAuth, async (req, res) => {
  try {
    const allPending = await Booking.find({ paymentStatus: 'pending' })
      .populate('user', 'name email')
      .populate('event')
      .sort({ createdAt: -1 });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const eligibleForReminder = allPending.filter(booking => {
      const createdAt = new Date(booking.createdAt);
      const reminderNotSent = !booking.paymentReminderSent;
      return createdAt <= oneHourAgo && reminderNotSent;
    });

    res.json({
      totalPending: allPending.length,
      eligibleForReminder: eligibleForReminder.length,
      oneHourAgo: oneHourAgo.toISOString(),
      currentTime: new Date().toISOString(),
      allPending: allPending.map(booking => ({
        id: booking._id,
        userEmail: booking.user?.email,
        eventTitle: booking.event?.title,
        createdAt: booking.createdAt,
        reminderSent: booking.paymentReminderSent || false,
        eligible: new Date(booking.createdAt) <= oneHourAgo && !booking.paymentReminderSent
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/admin/test-email
// @desc    Test email configuration
// @access  Private (Admin)
router.post('/test-email', adminAuth, async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ 
        message: 'Email credentials not configured',
        error: 'Please set EMAIL_USER and EMAIL_PASS in .env file'
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Fix SSL certificate issues
      tls: {
        rejectUnauthorized: false
      },
      secure: false,
      requireTLS: true
    });

    // Verify connection
    await transporter.verify();
    
    // Send test email
    const testEmail = req.body.testEmail || process.env.EMAIL_USER;
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Test Email - Event Booking System',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from your Event Booking System.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `
    });

    res.json({ 
      message: 'Test email sent successfully',
      messageId: info.messageId,
      to: testEmail
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      message: 'Failed to send test email',
      error: error.message,
      details: 'Check your EMAIL_USER and EMAIL_PASS in .env file. For Gmail, use an App Password.'
    });
  }
});

module.exports = router;

