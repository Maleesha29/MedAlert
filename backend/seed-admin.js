import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Use dynamic imports since the project uses ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedAdmin() {
  try {
    dotenv.config();
    const User = (await import('./src/models/User.js')).default;
    const Patient = (await import('./src/models/Patient.js')).default;
    
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medalert');
    console.log('MongoDB connected.');

    const existingAdmin = await User.findOne({ email: 'admin@medalert.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@medalert.com',
      password: 'adminpassword123',
      role: 'caregiver',
      phone: '0000000000'
    });

    const patient = await Patient.create({ user: admin._id, fullName: 'System Admin', phoneNumber: '0000000000' });
    admin.profile = patient._id;
    await admin.save();

    console.log('Successfully created Admin Account!');
    console.log('Email: admin@medalert.com');
    console.log('Password: adminpassword123');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  }
}

seedAdmin();
