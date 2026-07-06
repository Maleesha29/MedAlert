import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  bloodGroup: { type: String },
  profilePicture: { type: String },
  phoneNumber: { type: String },
  address: { type: String },
  caregiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Patient', patientSchema);
