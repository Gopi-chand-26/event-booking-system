const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get parameters from command line
    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || 'Admin User';
    
    if (!email || !password) {
      console.log('Usage: node createAdminUser.js <email> <password> [name]');
      console.log('Example: node createAdminUser.js admin@example.com mypassword123 "Admin Name"');
      process.exit(1);
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // Update existing user to admin
      existingUser.role = 'admin';
      existingUser.password = password; // Will be hashed by pre-save hook
      existingUser.markModified('password'); // Ensure password is hashed
      await existingUser.save();
      console.log(`✓ User ${email} has been updated to admin role`);
    } else {
      // Create new admin user
      const adminUser = new User({
        name,
        email,
        password,
        role: 'admin'
      });
      await adminUser.save();
      console.log(`✓ Admin user created successfully!`);
      console.log(`  Email: ${email}`);
      console.log(`  Name: ${name}`);
      console.log(`  Role: admin`);
    }
    
    console.log('\nYou can now login with these credentials at http://localhost:3000/login');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

