import mongoose from 'mongoose';

const nameRegex = /^[A-Za-z\s]+$/;
const phoneRegex = /^0\d{9}$/;

const patientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true, match: [nameRegex, 'Full name may only contain letters and spaces'] },
  age: { type: Number },
  gender: { type: String },
  bloodGroup: { type: String },
  profilePicture: { type: String },
  phoneNumber: { type: String, validate: { validator: v => !v || phoneRegex.test(v), message: 'Phone must start with 0 and be 10 digits' } },
  address: { type: String, validate: { validator: v => !v || v.length >= 5, message: 'Address must be at least 5 characters' } },
  caregiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caregiverInfo: {
    name: { type: String, match: [nameRegex, 'Caregiver name may only contain letters and spaces'] },
    phone: { type: String, validate: { validator: v => !v || phoneRegex.test(v), message: 'Caregiver phone must start with 0 and be 10 digits' } },
    email: { type: String, validate: { validator: v => !v || /.+@.+\..+/.test(v), message: 'Invalid caregiver email' } }
  }
}, { timestamps: true });

export default mongoose.model('Patient', patientSchema);
