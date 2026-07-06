import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  image: { type: String },
  compartment: { type: Number, required: true },
  initialPillCount: { type: Number, required: true },
  remainingPillCount: { type: Number, required: true },
  lowStockThreshold: { type: Number, default: 3 },
  instructions: { type: String },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('Medicine', medicineSchema);
