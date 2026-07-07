import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, role, phone });
    const patient = await Patient.create({ user: user._id, fullName: name, phoneNumber: phone });
    user.profile = patient._id;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: { id: user._id, name, email, role } });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

router.get('/me', protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });
    const userData = req.user.toObject();

    res.json({
      success: true,
      user: {
        ...userData,
        fullName: patient?.fullName || userData.name,
        age: patient?.age ?? '',
        gender: patient?.gender || '',
        bloodGroup: patient?.bloodGroup || '',
        phoneNumber: patient?.phoneNumber || userData.phone || '',
        address: patient?.address || '',
        caregiverName: patient?.caregiverInfo?.name || '',
        caregiverPhone: patient?.caregiverInfo?.phone || '',
        caregiverEmail: patient?.caregiverInfo?.email || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', protect, async (req, res, next) => {
  try {
    const { fullName, age, gender, bloodGroup, phoneNumber, address, caregiverName, caregiverPhone, caregiverEmail } = req.body;
    const user = await User.findById(req.user._id).select('-password');

    let patient = await Patient.findOne({ user: user._id });
    if (!patient) {
      patient = await Patient.create({
        user: user._id,
        fullName: fullName || user.name,
        phoneNumber: phoneNumber || user.phone || ''
      });
    }

    if (fullName) {
      user.name = fullName;
      patient.fullName = fullName;
    }

    if (age !== undefined && age !== '') {
      patient.age = Number(age);
    }

    if (gender !== undefined) patient.gender = gender;
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
    if (phoneNumber !== undefined) {
      user.phone = phoneNumber;
      patient.phoneNumber = phoneNumber;
    }
    if (address !== undefined) patient.address = address;
    // caregiver info
    if (!patient.caregiverInfo) patient.caregiverInfo = {};
    if (caregiverName !== undefined) patient.caregiverInfo.name = caregiverName;
    if (caregiverPhone !== undefined) patient.caregiverInfo.phone = caregiverPhone;
    if (caregiverEmail !== undefined) patient.caregiverInfo.email = caregiverEmail;

    await user.save();
    await patient.save();

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        fullName: patient.fullName,
        age: patient.age ?? '',
        gender: patient.gender || '',
        bloodGroup: patient.bloodGroup || '',
        phoneNumber: patient.phoneNumber || '',
        address: patient.address || ''
        ,
        caregiverName: patient.caregiverInfo?.name || '',
        caregiverPhone: patient.caregiverInfo?.phone || '',
        caregiverEmail: patient.caregiverInfo?.email || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
