import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import alarmRoutes from './routes/alarmRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import path from 'path';
import { startFirebasePolling } from './services/firebaseService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000 }));

app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'MedAlert API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medalert')
  .then(() => {
    console.log('MongoDB connected');
    startFirebasePolling();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => console.error('MongoDB connection failed', error));
