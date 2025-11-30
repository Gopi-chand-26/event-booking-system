# Event Booking System

A full-stack MERN (MongoDB, Express.js, React, Node.js) application for booking event tickets with secure PayPal payment integration, real-time notifications, and comprehensive admin management.

## Screenshots

### Home Page

<img src="https://image2url.com/images/1764478829762-536d9ce8-0144-4320-9d79-b0830faf5525.png" alt="home page" width="800" style="max-width: 100%; height: auto;" />

### Login Page

<img src="https://image2url.com/images/1764480626434-447c44c1-3fd1-491f-afc3-86eae438fac6.png" alt="login-page" width="800" style="max-width: 100%; height: auto;" />

### Register Page

<img src="https://image2url.com/images/1764480668174-68f2c6d6-3bff-4f49-8980-1fa75ea57348.png" alt="register-page" width="800" style="max-width: 100%; height: auto;" />

### User Dashboard

<img src="https://image2url.com/images/1764480798742-27de88e1-00fe-4de9-9357-54e27b6164a6.png" alt="user-dashboard" width="800" style="max-width: 100%; height: auto;" />

### Events Page

<img src="https://image2url.com/images/1764480868378-939e0f09-52f3-4e7f-89fa-f4def84d3315.png" alt="events-page" width="800" style="max-width: 100%; height: auto;" />

### Booking Page

<img src="https://image2url.com/images/1764480933756-d200458b-1955-46f0-a156-0ae73207d6d8.png" alt="booking-page" width="800" style="max-width: 100%; height: auto;" />

### PayPal Secure Browser

<img src="https://image2url.com/images/1764480988855-5d5f657e-7f08-404d-982c-9f4bff903c03.png" alt="paypal-secure-browser" width="800" style="max-width: 100%; height: auto;" />

### Admin Dashboard

<img src="https://image2url.com/images/1764481037957-21623ce7-707f-46a7-8fde-2a8e2893c7fa.png" alt="admin-dashboard" width="800" style="max-width: 100%; height: auto;" />

### Admin Create Event Page

<img src="https://image2url.com/images/1764481143238-275dcc62-6c56-457c-ba23-a6abc7061dbb.png" alt="admin-create-event-page" width="800" style="max-width: 100%; height: auto;" />



## Features

- **User Authentication**: Secure registration and login with JWT tokens, password confirmation, and show/hide password toggle
- **Event Browsing**: Browse and search events by category with real-time availability
- **Booking System**: Book tickets with real-time availability checks and booking confirmation
- **PayPal Integration**: Secure payment processing with PayPal SDK
- **Admin Dashboard**: Complete event management, statistics, and booking oversight
- **Email Notifications**: 
  - Payment reminders for pending bookings (every 15 minutes)
  - Booking confirmations after successful payment
  - Event reminders for upcoming events (daily at 9 AM)
- **Responsive Design**: Modern, mobile-friendly UI that works on all devices

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher (v20.x recommended)
- **npm**: v9.x or higher (comes with Node.js)
- **MongoDB Atlas Account**: For cloud database (or local MongoDB)
- **PayPal Developer Account**: For payment integration
- **Gmail Account**: For email notifications (or any SMTP service)

## Tech Stack & Versions

### Frontend
- **React**: ^18.2.0
- **React Router DOM**: ^6.16.0
- **Axios**: ^1.5.0
- **PayPal React SDK**: ^8.1.3
- **React Toastify**: ^9.1.3
- **date-fns**: ^2.30.0
- **React Scripts**: 5.0.1

### Backend
- **Node.js**: v18.x or v20.x (recommended)
- **Express**: ^4.18.2
- **Mongoose**: ^7.5.0
- **bcryptjs**: ^2.4.3
- **jsonwebtoken**: ^9.0.2
- **CORS**: ^2.8.5
- **PayPal Checkout Server SDK**: ^1.0.3
- **Nodemailer**: ^6.9.4
- **node-cron**: ^3.0.2
- **dotenv**: ^16.3.1
- **express-validator**: ^7.0.1

### Database
- **MongoDB**: Latest (via MongoDB Atlas)

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd event-booking-system
```

### Step 2: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file** in the `backend` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/eventbooking?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   PAYPAL_MODE=sandbox
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_specific_password
   ```

   **Important Notes:**
   - **MONGODB_URI**: Get your connection string from MongoDB Atlas
   - **JWT_SECRET**: Generate a secure random string (minimum 32 characters). You can use:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - **PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET**: Get from PayPal Developer Dashboard
   - **EMAIL_USER & EMAIL_PASS**: For Gmail, use an App Password (not your regular password)
     - Enable 2FA on Gmail
     - Generate App Password: Google Account → Security → App Passwords

4. **Start the backend server:**
   ```bash
   # Production mode
   npm start
   
   # Development mode (with auto-reload)
   npm run dev
   ```

   The backend will run on `http://localhost:5000`

   **Verify backend is running:**
   - Check console for: `✓ Server running on port 5000`
   - Check console for: `✓ MongoDB connected successfully`
   - Visit: `http://localhost:5000/api/health` (should return server status)

### Step 3: Frontend Setup

1. **Navigate to frontend directory** (in a new terminal):
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file** in the `frontend` directory (optional):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_PAYPAL_CLIENT_ID=your_paypal_client_id
   ```

4. **Start the frontend development server:**
   ```bash
   npm start
   ```

   The frontend will automatically open at `http://localhost:3000`

### Step 4: Create Admin User

After setting up the backend, create an admin user:

**Option 1: Via MongoDB Atlas (Recommended)**
1. Register a regular user through the frontend
2. Go to MongoDB Atlas → Collections → `users`
3. Find your user document
4. Change `role` field from `"user"` to `"admin"`

**Option 2: Via Script (if MongoDB connection works)**
```bash
cd backend
node scripts/createAdminUser.js
```

## Usage Guide

### For Regular Users

1. **Register**: Create a new account with email, password, and optional phone number
2. **Login**: Access your account with email and password
3. **Browse Events**: View all available events on the home page or events page
4. **View Event Details**: Click on any event to see full details
5. **Book Tickets**: 
   - Select number of tickets
   - Click "Book Now"
   - Complete payment via PayPal
   - Receive booking confirmation email
6. **View Bookings**: Check your dashboard to see all your bookings

### For Admin Users

1. **Login**: Use your admin account credentials
2. **Admin Dashboard**: Access `/admin` route
3. **Manage Events**:
   - Create new events with title, description, date, time, venue, price, and tickets
   - Edit existing events
   - Delete events
   - Upload event images
4. **View Statistics**: See total events, bookings, revenue, and users
5. **Manage Bookings**: View all user bookings and their status
6. **Test Email**: Use the test email endpoint to verify email configuration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Events
- `GET /api/events` - Get all events (query: `?status=active`)
- `GET /api/events/:id` - Get single event details
- `POST /api/events` - Create event (Admin only)
- `PUT /api/events/:id` - Update event (Admin only)
- `DELETE /api/events/:id` - Delete event (Admin only)

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get current user's bookings
- `GET /api/bookings/:id` - Get single booking details

### Payments
- `POST /api/payments/create` - Create PayPal payment order
- `POST /api/payments/capture` - Capture PayPal payment

### Admin
- `GET /api/admin/stats` - Get dashboard statistics (Admin only)
- `GET /api/admin/bookings` - Get all bookings (Admin only)
- `GET /api/admin/pending-bookings` - Get pending bookings for debugging (Admin only)
- `POST /api/admin/send-payment-reminders` - Manually trigger payment reminders (Admin only)
  - Query param: `?force=true` to bypass 1-hour requirement
- `POST /api/admin/test-email` - Test email configuration (Admin only)

### Health Check
- `GET /api/health` - Check server and database status

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- Protected API routes
- Secure payment processing
- Environment variables for sensitive data

## Email Configuration

The system sends three types of emails:

1. **Payment Reminders**: Sent every 15 minutes for pending bookings older than 1 hour
2. **Booking Confirmations**: Sent immediately after successful payment
3. **Event Reminders**: Sent daily at 9 AM for events happening in 24 hours

**Gmail Setup:**
1. Enable 2-Factor Authentication on your Google Account
2. Go to Google Account → Security → App Passwords
3. Generate an App Password for "Mail"
4. Use this App Password as `EMAIL_PASS` in `.env`

**For other email providers**, update SMTP settings in `backend/utils/notifications.js`

## Troubleshooting

### MongoDB Connection Issues

**Error: SSL/TLS connection error**
- Ensure Node.js is v18.x or higher (v20.x recommended)
- Check MongoDB Atlas Network Access (whitelist your IP or allow all IPs)
- Verify connection string is correct
- Check firewall/antivirus settings

**Error: Authentication failed**
- Verify MongoDB username and password in connection string
- Check database user permissions in MongoDB Atlas

### PayPal Integration Issues

**Error: Detected popup close**
- This is normal if user closes PayPal popup
- Payment will remain pending until completed

**Error: Invalid client credentials**
- Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env`
- Ensure PayPal app is in correct mode (sandbox/live)

### Email Not Sending

1. **Check email credentials:**
   ```bash
   POST http://localhost:5000/api/admin/test-email
   ```

2. **Verify transporter initialization:**
   - Check backend console for email transporter status
   - Ensure `EMAIL_USER` and `EMAIL_PASS` are set correctly

3. **Check payment reminders:**
   ```bash
   GET http://localhost:5000/api/admin/pending-bookings
   POST http://localhost:5000/api/admin/send-payment-reminders?force=true
   ```

### Admin Access Issues

- Verify user role is set to `"admin"` in MongoDB
- Check JWT token is being sent in request headers
- Ensure `adminAuth` middleware is working (check backend logs)


## Project Structure

```
event-booking-system/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Event.js
│   │   └── Booking.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── events.js
│   │   ├── bookings.js
│   │   ├── payments.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── notifications.js
│   ├── scripts/
│   │   ├── createAdmin.js
│   │   └── createAdminUser.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env
└── README.md






