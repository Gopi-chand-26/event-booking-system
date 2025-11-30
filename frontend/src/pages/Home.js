import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchFeaturedEvents = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/events?status=active`);
      const allEvents = response.data;
      // Get first 6 events
      setEvents(allEvents.slice(0, 6));
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchFeaturedEvents();
  }, [fetchFeaturedEvents]);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Discover Amazing Events</h1>
          <p>Book tickets for concerts, conferences, workshops, and more</p>
          <Link to="/events" className="cta-button">Browse Events</Link>
        </div>
      </section>

      <section className="featured-events">
        <div className="container">
          <h2>Featured Events</h2>
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
                    <p className="event-price">${event.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p>No events available at the moment.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;

