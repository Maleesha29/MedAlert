import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Patient from '../models/Patient.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'patient', phone } = req.body;
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
};

export const login = async (req, res, next) => {
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
};
