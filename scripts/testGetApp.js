import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Application from '../src/models/Application.js';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function testGetApplication() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Create test application
    const testApp = await Application.create({
      name: 'Test Creator',
      age: 22,
      city: 'Mumbai',
      platform: 'instagram',
      followers: '10k-50k',
      niche: 'beauty',
      profileLink: 'https://instagram.com/testcreator',
      whatsapp: '+919876543210',
      email: 'test@example.com',
      status: 'pending'
    });
    
    console.log('Created test application:', testApp._id.toString());

    // Try to fetch it
    const found = await Application.findById(testApp._id);
    console.log('Found application:', found ? 'YES' : 'NO');

    if (found) {
      console.log('\n✅ Get Application API will work with this ID!');
      console.log(`Test with: GET /api/admin/applications/${testApp._id}`);
    }

    // Cleanup
    await Application.findByIdAndDelete(testApp._id);
    console.log('\nCleaned up test data');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testGetApplication();
