import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'https://event-booking-system-dwxq.onrender.com/api';

  useEffect(() => {
    fetchEvents();
  }, [categoryFilter, searchTerm]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = { status: 'active' };
      if (categoryFilter) params.category = categoryFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${API_URL}/events`, { params });
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'concert', 'conference', 'workshop', 'sports', 'theater', 'other'];

  return (
    <div className="events-page">
      <div className="container">
        <h1>All Events</h1>

        <div className="filters">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === 'all' ? '' : cat)}
                className={`category-btn ${categoryFilter === cat || (cat === 'all' && !categoryFilter) ? 'active' : ''}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading events...</div>
        ) : events.length > 0 ? (
          <div className="events-grid">
            {events.map(event => (
              <Link key={event._id} to={`/events/${event._id}`} className="event-card">
                <div className="event-image">
                  {event.image ? (
                    <img src={event.image} alt={event.title} />
                  ) : (
                    <div className="event-image-placeholder">
                      {event.category.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="event-info">
                  <h3>{event.title}</h3>
                  <p className="event-category">{event.category}</p>
                  <p className="event-date">
                    {new Date(event.date).toLocaleDateString()} at {event.time}
                  </p>
                  <p className="event-venue">{event.venue.name}</p>
                  <div className="event-footer">
                    <p className="event-price">${event.price}</p>
                    <p className="event-availability">
                      {event.availableTickets} tickets left
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="no-events">No events found.</p>
        )}
      </div>
    </div>
  );
};

export default Events;

