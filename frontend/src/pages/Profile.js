import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Profile.css';

const Profile = () => {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: ''
  });
  const [avatarPreview, setAvatarPreview] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      avatar: user.avatar || ''
    });
    setAvatarPreview(user.avatar || '');
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update preview if avatar URL changes
    if (name === 'avatar') {
      setAvatarPreview(value);
    }
  };

  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB. Please use a smaller image or provide an image URL instead.');
      return;
    }

    try {
      // Compress and convert to base64
      const compressedBase64 = await compressImage(file);
      
      // Check if compressed size is still too large (max 2MB base64)
      if (compressedBase64.length > 2 * 1024 * 1024) {
        toast.warning('Image is still large after compression. Consider using an image URL instead for better performance.');
      }

      setFormData(prev => ({
        ...prev,
        avatar: compressedBase64
      }));
      setAvatarPreview(compressedBase64);
      toast.success('Image loaded successfully!');
    } catch (error) {
      console.error('Image processing error:', error);
      toast.error('Failed to process image. Please try again or use an image URL.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/auth/profile`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      toast.success('Profile updated successfully!');
      // Refresh user data
      await fetchUser();
    } catch (error) {
      console.error('Profile update error:', error);
      
      if (error.response?.status === 413) {
        toast.error('Image is too large. Please use a smaller image or provide an image URL instead.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>My Profile</h1>
        
        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">
                  {getInitials(formData.name)}
                </div>
              )}
            </div>
            <div className="avatar-upload">
              <label htmlFor="avatar-upload" className="upload-btn">
                Upload Image
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            <p className="avatar-hint">Or enter image URL below</p>
            <p className="avatar-warning">
              💡 Tip: For best results, use image URLs or keep uploaded images under 1MB
            </p>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="disabled-input"
              />
              <small className="form-hint">Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="form-group">
              <label>Avatar URL</label>
              <input
                type="url"
                name="avatar"
                value={formData.avatar}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
              />
              <small className="form-hint">Enter a direct image URL or upload an image above</small>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

