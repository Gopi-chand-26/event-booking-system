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
    
    // Get email from command line argument or use default
    const email = process.argv[2] || 'admin@example.com';
    
    const user = await User.findOne({ email });
    
    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`User ${email} has been updated to admin role`);
    } else {
      console.log(`User with email ${email} not found.`);
      console.log('Please register the user first, then run this script again.');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

