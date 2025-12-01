import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          EventBooking
        </Link>
        <ul className="navbar-menu">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/events">Events</Link></li>
          {user ? (
            <>
              <li><Link to="/dashboard">Dashboard</Link></li>
              {user.role === 'admin' && (
                <li><Link to="/admin">Admin</Link></li>
              )}
              <li className="navbar-user">
                <Link to="/profile" className="profile-link">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="navbar-avatar" />
                  ) : (
                    <div className="navbar-avatar-placeholder">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register" className="register-btn">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

