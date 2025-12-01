import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, fetchBookings]);

  if (loading) {
    return <div className="loading">Loading your bookings...</div>;
  }

  return (
    <div className="dashboard">
      <div className="container">
        <h1>My Dashboard</h1>
        <p className="welcome-message">Welcome, {user?.name}!</p>

        <div className="bookings-section">
          <h2>My Bookings</h2>
          {bookings.length > 0 ? (
            <div className="bookings-list">
              {bookings.map(booking => (
                <div key={booking._id} className="booking-card">
                  <div className="booking-content">
                    <div className="booking-image">
                      {booking.event?.image ? (
                        <img src={booking.event.image} alt={booking.event?.title} />
                      ) : (
                        <div className="booking-image-placeholder">
                          {booking.event?.category?.charAt(0).toUpperCase() || 'E'}
                        </div>
                      )}
                    </div>
                    <div className="booking-info">
                      <div className="booking-header">
                        <h3>{booking.event?.title}</h3>
                        <div className="booking-header-right">
                          <span className={`status-badge ${booking.paymentStatus}`}>
                            {booking.paymentStatus}
                          </span>
                          {booking.paymentStatus === 'pending' && (
                            <Link to={`/events/${booking.event?._id}`} className="pay-now-btn">
                              Pay Now
                            </Link>
                          )}
                          {booking.paymentStatus === 'completed' && (
                            <Link to={`/events/${booking.event?._id}`} className="view-event-btn">
                              View Event
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="booking-details">
                    <p><strong>Date:</strong> {format(new Date(booking.event?.date), 'MMM dd, yyyy')}</p>
                    <p><strong>Time:</strong> {booking.event?.time}</p>
                    <p><strong>Venue:</strong> {booking.event?.venue?.name}</p>
                    <p><strong>Tickets:</strong> {booking.tickets}</p>
                    <p><strong>Total Amount:</strong> ${booking.totalAmount.toFixed(2)}</p>
                    <p><strong>Booking Date:</strong> {format(new Date(booking.createdAt), 'MMM dd, yyyy')}</p>
                    <p><strong>Booking Time:</strong> {format(new Date(booking.createdAt), 'hh:mm a')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-bookings">
              <p>You haven't made any bookings yet.</p>
              <Link to="/events" className="browse-events-btn">Browse Events</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

