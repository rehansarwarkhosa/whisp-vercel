import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const initAdmin = async () => {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const adminExists = await User.findOne({ username: adminUsername, isAdmin: true });

    if (!adminExists) {
      const admin = new User({
        username: adminUsername,
        password: adminPassword,
        isAdmin: true,
        status: 'approved'
      });

      await admin.save();
      console.log('Admin account created successfully');
    } else {
      console.log('Admin account already exists');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
};

export default initAdmin;
