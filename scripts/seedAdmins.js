#!/usr/bin/env node
import readline from 'readline';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { USER_ROLES } from '../src/utils/constants.js';

dotenv.config({ path: '../.env' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const promptPassword = (roleName) => {
  return new Promise((resolve) => {
    rl.question(`Enter password for ${roleName}: `, (answer) => {
      resolve(answer);
    });
  });
};

const adminUsers = [
  {
    name: 'Super Admin',
    email: 'dushyantkhandelwal4665@gmail.com',
    role: USER_ROLES.SUPER_ADMIN,
  },
  {
    name: 'Campaign Manager',
    email: 'dushyant4665fixlsolution@gmail.com',
    role: USER_ROLES.CAMPAIGN_MANAGER,
  },
  {
    name: 'Finance Manager',
    email: 'dushyant4665@gmail.com',
    role: USER_ROLES.FINANCE_MANAGER,
  },
  {
    name: 'Onboarding Specialist',
    email: 'dushyant22062003@gmail.com',
    role: USER_ROLES.ONBOARDING_SPECIALIST,
  },
];

async function seedAdmins() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!\n');

    console.log('=== Triple F Media - Admin User Seeder ===\n');
    console.log('This will create 4 admin users with the following roles:');
    adminUsers.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (${u.email}) - ${u.role}`);
    });
    console.log('');

    const passwords = [];
    for (const user of adminUsers) {
      const password = await promptPassword(`${user.name} (${user.role})`);
      if (!password || password.length < 8) {
        console.error(`\nPassword must be at least 8 characters. Exiting...`);
        process.exit(1);
      }
      passwords.push(password);
    }

    console.log('\nCreating admin users...\n');

    for (let i = 0; i < adminUsers.length; i++) {
      const userData = adminUsers[i];
      const password = passwords[i];

      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️  ${userData.email} already exists, skipping...`);
        continue;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        isActive: true,
      });

      console.log(`✅ Created: ${user.name} (${user.email}) - ${user.role}`);
    }

    console.log('\n✨ Admin users seeded successfully!');
    console.log('\nLogin with any of these accounts:');
    adminUsers.forEach((u) => {
      console.log(`  Email: ${u.email}`);
    });

    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding admin users:', error.message);
    await mongoose.disconnect();
    rl.close();
    process.exit(1);
  }
}

seedAdmins();
