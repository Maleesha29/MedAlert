import mongoose from 'mongoose';

const nameRegex = /^[A-Za-z\s]+$/;

const medicineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, match: [nameRegex, 'Medicine name may only contain letters and spaces'] },
  image: { type: String },
  compartment: { type: Number, required: true, min: [1, 'Compartment must be at least 1'] },
  initialPillCount: { type: Number, required: true, min: [0, 'Initial pill count cannot be negative'] },
  remainingPillCount: { type: Number, required: true, min: [0, 'Remaining pill count cannot be negative'] },
  lowStockThreshold: { type: Number, default: 3, min: [0, 'Low stock threshold cannot be negative'] },
  instructions: { type: String },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('Medicine', medicineSchema);
