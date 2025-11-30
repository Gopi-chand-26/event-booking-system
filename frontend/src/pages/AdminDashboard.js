import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if not admin (handled by AdminRoute, but double-check here)
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      // This should be handled by AdminRoute, but as a safety check
      console.warn('Unauthorized access attempt to admin dashboard');
      navigate('/');
    }
  }, [user, authLoading, navigate]);
  
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: 'concert',
    date: '',
    time: '',
    venue: { name: '', address: '', city: '' },
    price: '',
    totalTickets: '',
    image: ''
  });

  const API_URL = process.env.REACT_APP_API_URL || 'https://event-booking-system-dwxq.onrender.com/api';

  // Ensure axios has the auth token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        setLoading(false);
        return;
      }

      // Ensure axios has the token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const authHeaders = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Fetch data with error handling for each request
      try {
        const statsRes = await axios.get(`${API_URL}/admin/stats`, authHeaders);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Stats error:', err.response?.data || err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          toast.error('Admin access required. Please verify your role in MongoDB.');
        }
      }

      try {
        const eventsRes = await axios.get(`${API_URL}/events`);
        setEvents(eventsRes.data);
      } catch (err) {
        console.error('Events error:', err.response?.data || err.message);
      }

      try {
        const bookingsRes = await axios.get(`${API_URL}/admin/bookings`, authHeaders);
        setBookings(bookingsRes.data);
      } catch (err) {
        console.error('Bookings error:', err.response?.data || err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Don't show error if we already showed one for stats
          if (!stats) {
            toast.error('Admin access required for bookings.');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data. Check backend connection.');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debug: Log user role
  useEffect(() => {
    if (user) {
      console.log('Current user:', user);
      if (user.role !== 'admin') {
        toast.warning(`Your role is: ${user.role}. Admin access required. Please update your role in MongoDB.`);
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('venue.')) {
      const venueField = name.split('.')[1];
      setEventForm({
        ...eventForm,
        venue: { ...eventForm.venue, [venueField]: value }
      });
    } else {
      setEventForm({ ...eventForm, [name]: value });
    }
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    try {
      // Ensure token is set
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      // Ensure axios has the token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Prepare event data with proper types
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        category: eventForm.category,
        date: eventForm.date, // Keep as string, backend will convert
        time: eventForm.time,
        venue: {
          name: eventForm.venue.name.trim(),
          address: eventForm.venue.address.trim(),
          city: eventForm.venue.city.trim()
        },
        price: parseFloat(eventForm.price), // Convert to number
        totalTickets: parseInt(eventForm.totalTickets), // Convert to number
        image: eventForm.image?.trim() || '',
        status: 'active'
      };

      // Validate required fields
      if (!eventData.title || !eventData.description || !eventData.date || 
          !eventData.time || !eventData.venue.name || !eventData.venue.address || 
          !eventData.venue.city || isNaN(eventData.price) || isNaN(eventData.totalTickets)) {
        toast.error('Please fill in all required fields with valid values');
        return;
      }

      if (eventData.price <= 0) {
        toast.error('Price must be greater than 0');
        return;
      }

      if (eventData.totalTickets <= 0) {
        toast.error('Total tickets must be greater than 0');
        return;
      }

      const authHeaders = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      if (editingEvent) {
        await axios.put(`${API_URL}/events/${editingEvent._id}`, eventData, authHeaders);
        toast.success('Event updated successfully');
      } else {
        await axios.post(`${API_URL}/events`, eventData, authHeaders);
        toast.success('Event created successfully');
      }
      setShowEventForm(false);
      setEditingEvent(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Event save error:', error);
      if (error.response?.status === 401) {
        toast.error('Unauthorized. Please logout and login again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Check backend logs and MongoDB connection.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save event';
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      category: event.category,
      date: new Date(event.date).toISOString().split('T')[0],
      time: event.time,
      venue: event.venue,
      price: event.price,
      totalTickets: event.totalTickets,
      image: event.image || ''
    });
    setShowEventForm(true);
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        toast.success('Event deleted successfully');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete event');
      }
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      category: 'concert',
      date: '',
      time: '',
      venue: { name: '', address: '', city: '' },
      price: '',
      totalTickets: '',
      image: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <h1>Admin Dashboard</h1>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Events</h3>
              <p className="stat-number">{stats.totalEvents}</p>
            </div>
            <div className="stat-card">
              <h3>Active Events</h3>
              <p className="stat-number">{stats.activeEvents}</p>
            </div>
            <div className="stat-card">
              <h3>Total Bookings</h3>
              <p className="stat-number">{stats.totalBookings}</p>
            </div>
            <div className="stat-card">
              <h3>Completed Bookings</h3>
              <p className="stat-number">{stats.completedBookings}</p>
            </div>
            <div className="stat-card">
              <h3>Total Users</h3>
              <p className="stat-number">{stats.totalUsers}</p>
            </div>
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p className="stat-number">${stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="admin-actions">
          <button onClick={() => { setShowEventForm(true); setEditingEvent(null); resetForm(); }} className="add-event-btn">
            Add New Event
          </button>
        </div>

        {showEventForm && (
          <div className="event-form-modal">
            <div className="event-form-content">
              <h2>{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
              <form onSubmit={handleSubmitEvent}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" name="title" value={eventForm.title} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={eventForm.category} onChange={handleInputChange} required>
                      <option value="concert">Concert</option>
                      <option value="conference">Conference</option>
                      <option value="workshop">Workshop</option>
                      <option value="sports">Sports</option>
                      <option value="theater">Theater</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={eventForm.description} onChange={handleInputChange} required rows="4" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" name="date" value={eventForm.date} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Time</label>
                    <input type="time" name="time" value={eventForm.time} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Venue Name</label>
                  <input type="text" name="venue.name" value={eventForm.venue.name} onChange={handleInputChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Address</label>
                    <input type="text" name="venue.address" value={eventForm.venue.address} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="venue.city" value={eventForm.venue.city} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Price ($)</label>
                    <input type="number" name="price" value={eventForm.price} onChange={handleInputChange} min="0" step="0.01" required />
                  </div>
                  <div className="form-group">
                    <label>Total Tickets</label>
                    <input type="number" name="totalTickets" value={eventForm.totalTickets} onChange={handleInputChange} min="1" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Image URL (Optional)</label>
                  <input type="url" name="image" value={eventForm.image} onChange={handleInputChange} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">Save Event</button>
                  <button type="button" onClick={() => { setShowEventForm(false); setEditingEvent(null); resetForm(); }} className="cancel-btn">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="admin-sections">
          <div className="admin-section">
            <h2>Events Management</h2>
            <div className="events-list">
              {events.map(event => (
                <div key={event._id} className="admin-event-card">
                  <div className="event-info">
                    <h3>{event.title}</h3>
                    <p>{event.category} • {new Date(event.date).toLocaleDateString()}</p>
                    <p>Available: {event.availableTickets} / {event.totalTickets}</p>
                  </div>
                  <div className="event-actions">
                    <button onClick={() => handleEdit(event)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDelete(event._id)} className="delete-btn">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-section">
            <h2>Recent Bookings</h2>
            <div className="bookings-list">
              {bookings.slice(0, 10).map(booking => (
                <div key={booking._id} className="admin-booking-card">
                  <p><strong>{booking.event?.title}</strong></p>
                  <p>{booking.user?.name} • {booking.tickets} ticket(s) • ${booking.totalAmount.toFixed(2)}</p>
                  <p className={`status ${booking.paymentStatus}`}>{booking.paymentStatus}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

