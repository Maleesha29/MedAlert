import express from 'express';
import Medicine from '../models/Medicine.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const upload = multer({ storage });

router.get('/', protect, async (req, res, next) => {
  try {
    const medicines = await Medicine.find({ user: req.user._id });
    res.json({ success: true, medicines });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, upload.single('image'), async (req, res, next) => {
  try {
    const medicineData = { ...req.body, user: req.user._id };
    if (req.file) medicineData.image = `/uploads/${req.file.filename}`;
    const medicine = await Medicine.create(medicineData);
    res.status(201).json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, upload.single('image'), async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (req.file) update.image = `/uploads/${req.file.filename}`;

    const medicine = await Medicine.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, update, { new: true });
    res.json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const med = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
    if (!med) return res.status(404).json({ success: false, message: 'Not found' });
    if (med.image) {
      const imgPath = path.join(process.cwd(), med.image.replace(/^\//, ''));
      fs.unlink(imgPath, (err) => { if (err) console.warn('Failed to remove image', err); });
    }
    await Medicine.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
