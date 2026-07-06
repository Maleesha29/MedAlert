import express from 'express';
import Alarm from '../models/Alarm.js';
import Medicine from '../models/Medicine.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const alarms = await Alarm.find({ user: req.user._id }).populate('medicine', 'name compartment remainingPillCount');
    res.json({ success: true, alarms });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const payload = { ...req.body, user: req.user._id };

    if (payload.medicine) {
      const medicine = await Medicine.findOne({ _id: payload.medicine, user: req.user._id });
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Selected medicine not found' });
      }
      if (medicine.remainingPillCount <= 0) {
        return res.status(400).json({ success: false, message: 'Selected medicine is out of stock' });
      }
    }

    const alarm = await Alarm.create(payload);
    const populatedAlarm = await Alarm.findById(alarm._id).populate('medicine', 'name compartment remainingPillCount');
    res.status(201).json({ success: true, alarm: populatedAlarm });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const payload = req.body;

    if (payload.medicine) {
      const medicine = await Medicine.findOne({ _id: payload.medicine, user: req.user._id });
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Selected medicine not found' });
      }
      if (medicine.remainingPillCount <= 0) {
        return res.status(400).json({ success: false, message: 'Selected medicine is out of stock' });
      }
    }

    const alarm = await Alarm.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      payload,
      { new: true }
    ).populate('medicine', 'name compartment remainingPillCount');

    res.json({ success: true, alarm });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/taken', protect, async (req, res, next) => {
  try {
    const alarm = await Alarm.findOne({ _id: req.params.id, user: req.user._id });

    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    if (alarm.medicine) {
      const medicine = await Medicine.findOne({ _id: alarm.medicine, user: req.user._id });
      if (medicine && medicine.remainingPillCount > 0) {
        medicine.remainingPillCount = Math.max(0, medicine.remainingPillCount - 1);
        await medicine.save();
      }
    }

    const updatedAlarm = await Alarm.findByIdAndUpdate(
      alarm._id,
      { status: 'completed' },
      { new: true }
    ).populate('medicine', 'name compartment remainingPillCount');

    res.json({ success: true, alarm: updatedAlarm });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/mark-taken', protect, async (req, res, next) => {
  try {
    const alarm = await Alarm.findOne({ _id: req.params.id, user: req.user._id });

    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    if (alarm.medicine) {
      const medicine = await Medicine.findOne({ _id: alarm.medicine, user: req.user._id });
      if (medicine && medicine.remainingPillCount > 0) {
        medicine.remainingPillCount = Math.max(0, medicine.remainingPillCount - 1);
        await medicine.save();
      }
    }

    const updatedAlarm = await Alarm.findByIdAndUpdate(
      alarm._id,
      { status: 'completed' },
      { new: true }
    ).populate('medicine', 'name compartment remainingPillCount');

    res.json({ success: true, alarm: updatedAlarm });
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
