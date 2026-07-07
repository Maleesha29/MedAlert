import mongoose from 'mongoose';

const nameRegex = /^[A-Za-z\s]+$/;

const alarmSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, match: [nameRegex, 'Alarm name may only contain letters and spaces'] },
  time: { type: String, required: true, validate: { validator: v => /^\d{2}:\d{2}$/.test(v), message: 'Time must be in HH:MM format' } },
  enabled: { type: Boolean, default: true },
  snoozeDuration: { type: Number, default: 5, min: [0, 'Snooze duration cannot be negative'] },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineCompartment: { type: Number, required: true, min: [1, 'Medicine compartment must be at least 1'] },
  notes: { type: String },
  snoozesUsed: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('Alarm', alarmSchema);
