const nodemailer = require('nodemailer');
const Booking = require('../models/Booking');
const Event = require('../models/Event');

// Email transporter setup
let transporter = null;

const initializeTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Email notifications will not work.');
    console.warn('   Please set EMAIL_USER and EMAIL_PASS in your .env file');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Fix SSL certificate issues
      tls: {
        rejectUnauthorized: false
      },
      // Additional options for better compatibility
      secure: false,
      requireTLS: true
    });
    console.log('✓ Email transporter initialized');
    return transporter;
  } catch (error) {
    console.error('Error initializing email transporter:', error);
    return null;
  }
};

// Initialize on module load
transporter = initializeTransporter();

// Send booking confirmation email
const sendBookingConfirmation = async (booking, event, user) => {
  try {
    if (!transporter) {
      console.warn('⚠️  Cannot send booking confirmation - email transporter not initialized');
      return;
    }

    if (!user || !user.email) {
      console.log('Skipping booking confirmation - no email address');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Booking Confirmation - ${event.title}`,
      html: `
        <h2>Booking Confirmed!</h2>
        <p>Dear ${user.name},</p>
        <p>Your booking has been confirmed successfully.</p>
        <h3>Event Details:</h3>
        <ul>
          <li><strong>Event:</strong> ${event.title}</li>
          <li><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${event.time}</li>
          <li><strong>Venue:</strong> ${event.venue.name}, ${event.venue.address}</li>
          <li><strong>Tickets:</strong> ${booking.tickets}</li>
          <li><strong>Total Amount:</strong> $${booking.totalAmount}</li>
        </ul>
        <p>Thank you for your booking!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Booking confirmation email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }
};

// Send event reminders
const sendEventReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find events happening tomorrow
    const upcomingEvents = await Event.find({
      date: {
        $gte: tomorrow,
        $lt: dayAfter
      },
      status: 'active'
    });

    for (const event of upcomingEvents) {
      // Find all bookings for this event that haven't received reminders
      const bookings = await Booking.find({
        event: event._id,
        paymentStatus: 'completed',
        reminderSent: false
      }).populate('user');

      for (const booking of bookings) {
        try {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.user.email,
            subject: `Reminder: ${event.title} is Tomorrow!`,
            html: `
              <h2>Event Reminder</h2>
              <p>Dear ${booking.user.name},</p>
              <p>This is a reminder that you have an event tomorrow!</p>
              <h3>Event Details:</h3>
              <ul>
                <li><strong>Event:</strong> ${event.title}</li>
                <li><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${event.time}</li>
                <li><strong>Venue:</strong> ${event.venue.name}, ${event.venue.address}</li>
                <li><strong>Tickets:</strong> ${booking.tickets}</li>
              </ul>
              <p>We look forward to seeing you there!</p>
            `
          };

          await transporter.sendMail(mailOptions);
          booking.reminderSent = true;
          await booking.save();
          console.log(`Reminder sent to ${booking.user.email} for ${event.title}`);
        } catch (error) {
          console.error(`Error sending reminder to ${booking.user.email}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in sendEventReminders:', error);
  }
};

// Send payment reminder for pending bookings
const sendPaymentReminders = async (forceSend = false) => {
  const results = {
    totalFound: 0,
    emailsSent: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Check if email is configured
    if (!transporter) {
      const errorMsg = '⚠️  Cannot send payment reminders - email transporter not initialized. Check EMAIL_USER and EMAIL_PASS in .env';
      console.warn(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }

    // Verify email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      const errorMsg = '⚠️  Email credentials not configured. Set EMAIL_USER and EMAIL_PASS in .env file';
      console.warn(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }

    // Test email connection
    try {
      await transporter.verify();
      console.log('✓ Email transporter verified - connection successful');
    } catch (verifyError) {
      const errorMsg = `⚠️  Email transporter verification failed: ${verifyError.message}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }

    // Build query for pending bookings
    const query = {
      paymentStatus: 'pending',
      $or: [
        { paymentReminderSent: false },
        { paymentReminderSent: { $exists: false } } // Handle old bookings without this field
      ]
    };

    // Only require 1 hour old if not forcing
    if (!forceSend) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      query.createdAt = { $lte: oneHourAgo };
    }

    // Find pending bookings
    const pendingBookings = await Booking.find(query)
      .populate('user', 'name email')
      .populate('event');

    results.totalFound = pendingBookings.length;
    
    // Debug logging
    console.log(`\n[${new Date().toISOString()}] Payment Reminder Query:`);
    console.log(`   Force send: ${forceSend}`);
    if (!forceSend) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      console.log(`   One hour ago: ${oneHourAgo.toISOString()}`);
    }
    console.log(`   Current time: ${new Date().toISOString()}`);
    
    // Also check total pending bookings (for debugging)
    const totalPending = await Booking.countDocuments({ paymentStatus: 'pending' });
    const totalPendingWithReminder = await Booking.countDocuments({ 
      paymentStatus: 'pending',
      paymentReminderSent: true 
    });
    console.log(`   Total pending bookings: ${totalPending}`);
    console.log(`   Pending with reminder sent: ${totalPendingWithReminder}`);
    console.log(`   Pending bookings found by query: ${pendingBookings.length}`);
    
    // Log each booking found
    if (pendingBookings.length > 0) {
      console.log('\n   Found bookings:');
      pendingBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. Booking ID: ${booking._id}`);
        console.log(`      User: ${booking.user?.email || 'No user email'}`);
        console.log(`      Event: ${booking.event?.title || 'No event'}`);
        console.log(`      Created: ${booking.createdAt.toISOString()}`);
        console.log(`      Reminder sent: ${booking.paymentReminderSent || false}`);
      });
    }
    console.log('');

    if (pendingBookings.length === 0) {
      console.log(`[${new Date().toISOString()}] No pending bookings found requiring payment reminders`);
      return results;
    }

    console.log(`[${new Date().toISOString()}] Found ${pendingBookings.length} pending booking(s) requiring payment reminders`);

    for (const booking of pendingBookings) {
      try {
        // Only send if user has an email
        if (!booking.user || !booking.user.email) {
          console.log(`⚠️  Skipping booking ${booking._id} - no email address for user`);
          results.skipped++;
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(booking.user.email)) {
          console.log(`⚠️  Skipping booking ${booking._id} - invalid email format: ${booking.user.email}`);
          results.skipped++;
          continue;
        }

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: booking.user.email,
          subject: `Payment Pending - Complete Your Booking for ${booking.event.title}`,
          html: `
            <h2>Payment Reminder</h2>
            <p>Dear ${booking.user.name},</p>
            <p>You have a pending booking that requires payment completion.</p>
            <h3>Booking Details:</h3>
            <ul>
              <li><strong>Event:</strong> ${booking.event.title}</li>
              <li><strong>Date:</strong> ${new Date(booking.event.date).toLocaleDateString()}</li>
              <li><strong>Time:</strong> ${booking.event.time}</li>
              <li><strong>Venue:</strong> ${booking.event.venue.name}, ${booking.event.venue.address}</li>
              <li><strong>Tickets:</strong> ${booking.tickets}</li>
              <li><strong>Total Amount:</strong> $${booking.totalAmount.toFixed(2)}</li>
              <li><strong>Booking Date:</strong> ${new Date(booking.createdAt).toLocaleDateString()}</li>
            </ul>
            <p><strong>Please complete your payment to confirm your booking.</strong></p>
            <p>If you have already made the payment, please ignore this email.</p>
            <p>Thank you!</p>
          `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        // Mark reminder as sent
        booking.paymentReminderSent = true;
        booking.paymentReminderSentAt = new Date();
        await booking.save();
        
        results.emailsSent++;
        console.log(`[${new Date().toISOString()}] ✓ Payment reminder sent to ${booking.user.email} for booking ${booking._id}`);
        console.log(`   Email message ID: ${info.messageId}`);
      } catch (error) {
        const errorMsg = `Error sending payment reminder for booking ${booking._id} to ${booking.user?.email}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
        // Continue with next booking even if one fails
      }
    }

    // Summary log
    console.log(`\n[${new Date().toISOString()}] Payment Reminder Summary:`);
    console.log(`   Total found: ${results.totalFound}`);
    console.log(`   Emails sent: ${results.emailsSent}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Errors: ${results.errors.length}\n`);

    return results;
  } catch (error) {
    const errorMsg = `Error in sendPaymentReminders: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    results.errors.push(errorMsg);
    return results;
  }
};

module.exports = {
  sendBookingConfirmation,
  sendEventReminders,
  sendPaymentReminders
};

