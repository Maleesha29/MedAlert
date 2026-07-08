import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
});

router.get('/history', protect, async (req, res, next) => {
  try {
    const history = await Notification.find({ 
      user: req.user._id,
      type: { $in: ['dose_taken', 'dose_missed'] }
    })
    .sort({ createdAt: -1 })
    .limit(50);
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true }, { new: true });
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
});

export default router;
