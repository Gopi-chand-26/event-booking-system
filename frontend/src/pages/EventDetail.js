import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { toast } from 'react-toastify';
import './EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState(1);
  const [booking, setBooking] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID;

  const fetchEvent = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Event not found');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  }, [API_URL, id, navigate]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleBookNow = async () => {
    if (!user) {
      toast.info('Please login to book tickets');
      navigate('/login');
      return;
    }

    if (tickets > event.availableTickets) {
      toast.error('Not enough tickets available');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/bookings`, {
        eventId: event._id,
        tickets
      });
      setBooking(response.data);
      setShowPayment(true);
      toast.success('Booking created. Please complete payment.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
    }
  };


  if (loading) {
    return <div className="loading">Loading event details...</div>;
  }

  if (!event) {
    return null;
  }

  const totalPrice = event.price * tickets;

  return (
    <div className="event-detail">
      <div className="container">
        <div className="event-detail-content">
          <div className="event-image-section">
            {event.image ? (
              <img src={event.image} alt={event.title} />
            ) : (
              <div className="event-image-placeholder-large">
                {event.category.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="event-info-section">
            <h1>{event.title}</h1>
            <p className="event-category">{event.category}</p>
            <p className="event-description">{event.description}</p>

            <div className="event-details">
              <div className="detail-item">
                <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
              </div>
              <div className="detail-item">
                <strong>Time:</strong> {event.time}
              </div>
              <div className="detail-item">
                <strong>Venue:</strong> {event.venue.name}
              </div>
              <div className="detail-item">
                <strong>Address:</strong> {event.venue.address}, {event.venue.city}
              </div>
              <div className="detail-item">
                <strong>Price:</strong> ${event.price} per ticket
              </div>
              <div className="detail-item">
                <strong>Available Tickets:</strong> {event.availableTickets} / {event.totalTickets}
              </div>
            </div>

            {!showPayment ? (
              <div className="booking-section">
                <h2>Book Tickets</h2>
                <div className="ticket-selector">
                  <label>Number of Tickets:</label>
                  <div className="ticket-controls">
                    <button
                      onClick={() => setTickets(Math.max(1, tickets - 1))}
                      disabled={tickets <= 1}
                    >
                      -
                    </button>
                    <span>{tickets}</span>
                    <button
                      onClick={() => setTickets(Math.min(event.availableTickets, tickets + 1))}
                      disabled={tickets >= event.availableTickets}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="total-price">
                  <strong>Total: ${totalPrice.toFixed(2)}</strong>
                </div>
                <button
                  onClick={handleBookNow}
                  className="book-button"
                  disabled={event.availableTickets === 0 || event.status !== 'active'}
                >
                  {event.availableTickets === 0 ? 'Sold Out' : 'Book Now'}
                </button>
              </div>
            ) : (
              <div className="payment-section">
                <h2>Complete Payment</h2>
                <p>Total Amount: ${totalPrice.toFixed(2)}</p>
                <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD' }}>
                  <PayPalButtons
                    createOrder={async (data, actions) => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.post(`${API_URL}/payments/create`, {
                          bookingId: booking._id
                        }, {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        return response.data.orderId;
                      } catch (error) {
                        console.error('Payment creation error:', error);
                        if (error.response?.status === 401) {
                          toast.error('Please login again to complete payment');
                        } else if (error.response?.status === 404) {
                          toast.error('Booking not found. Please try booking again.');
                        } else {
                          toast.error('Failed to create payment. Please try again.');
                        }
                        throw error;
                      }
                    }}
                    onApprove={async (data, actions) => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.post(`${API_URL}/payments/capture`, {
                          orderId: data.orderID,
                          bookingId: booking._id
                        }, {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });

                        if (response.data.success) {
                          toast.success('Payment successful! Booking confirmed.');
                          setTimeout(() => {
                            navigate('/dashboard');
                          }, 2000);
                        } else {
                          toast.error('Payment was not completed. Please contact support.');
                        }
                      } catch (error) {
                        console.error('Payment capture error:', error);
                        if (error.response?.status === 401) {
                          toast.error('Please login again');
                        } else if (error.response?.status === 400) {
                          toast.error('Payment verification failed. Please contact support if payment was charged.');
                        } else {
                          toast.error('Payment verification failed. Please check your bookings.');
                        }
                      }
                    }}
                    onError={(err) => {
                      // Ignore popup close errors - these are expected when user closes the popup
                      const errorMessage = err?.message || err?.toString() || '';
                      if (errorMessage.includes('popup close') || errorMessage.includes('Popup closed')) {
                        // User closed the popup - this is normal, don't show error
                        console.log('PayPal popup was closed by user');
                        return;
                      }
                      // Only show error for actual payment errors
                      console.error('PayPal error:', err);
                      toast.error('Payment error occurred. Please try again.');
                    }}
                    onCancel={() => {
                      toast.info('Payment cancelled');
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;

