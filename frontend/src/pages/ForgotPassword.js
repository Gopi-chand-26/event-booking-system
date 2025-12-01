import React from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Forgot Password</h2>
        <div className="forgot-password-content">
          <div className="forgot-password-icon">🔒</div>
          <p className="forgot-password-message">
            Contact <a href="mailto:bodapatigopichand6@gmail.com" className="email-link">bodapatigopichand6@gmail.com</a> for further assistance.
          </p>
          <Link to="/login" className="back-to-login-btn">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

