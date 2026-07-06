import mongoose from 'mongoose';

const alarmSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  time: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  snoozeDuration: { type: Number, default: 5 },
  medicineCompartment: { type: Number, required: true },
  notes: { type: String },
  snoozesUsed: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('Alarm', alarmSchema);
