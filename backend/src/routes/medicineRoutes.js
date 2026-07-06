import express from 'express';
import Medicine from '../models/Medicine.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const medicines = await Medicine.find({ user: req.user._id });
    res.json({ success: true, medicines });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const medicine = await Medicine.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const medicine = await Medicine.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    await Medicine.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
