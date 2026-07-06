import express from 'express';
import Alarm from '../models/Alarm.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const alarms = await Alarm.find({ user: req.user._id });
    res.json({ success: true, alarms });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const alarm = await Alarm.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, alarm });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const alarm = await Alarm.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
    res.json({ success: true, alarm });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/taken', protect, async (req, res, next) => {
  try {
    const alarm = await Alarm.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: 'completed' },
      { new: true }
    );

    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    res.json({ success: true, alarm });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    await Alarm.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
