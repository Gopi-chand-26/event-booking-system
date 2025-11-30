const axios = require('axios');

// Alternative method: Create admin via API (if server is running)
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Admin User';

if (!email || !password) {
  console.log('Usage: node createAdminViaAPI.js <email> <password> [name]');
  console.log('Example: node createAdminViaAPI.js admin@example.com mypassword123 "Admin Name"');
  console.log('\nNote: This requires the backend server to be running.');
  process.exit(1);
}

async function createAdmin() {
  try {
    // Step 1: Register the user
    console.log('Registering user...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      name,
      email,
      password,
    });
    
    console.log('✓ User registered successfully');
    
    // Step 2: Get the token
    const token = registerResponse.data.token;
    
    // Note: To promote to admin, you still need to run the MongoDB script
    // or manually update in database
    console.log('\n⚠️  User created, but needs to be promoted to admin.');
    console.log('Run this command to promote:');
    console.log(`node scripts/createAdmin.js ${email}`);
    console.log('\nOr manually update the role in MongoDB to "admin"');
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message === 'User already exists') {
      console.log('User already exists. Promoting to admin...');
      console.log('Run this command to promote:');
      console.log(`node scripts/createAdmin.js ${email}`);
    } else {
      console.error('Error:', error.response?.data || error.message);
      console.log('\nMake sure the backend server is running on http://localhost:5000');
    }
    process.exit(1);
  }
}

createAdmin();

