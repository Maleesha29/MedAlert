import express from 'express';
const router = express.Router();

const deviceApiKey = process.env.DEVICE_API_KEY || 'medalert-device-key';

const authenticateDevice = (req, res, next) => {
  const apiKey = req.headers['x-device-key'];
  if (apiKey !== deviceApiKey) {
    return res.status(401).json({ success: false, message: 'Invalid device API key' });
  }
  next();
};

router.post('/heartbeat', authenticateDevice, (_req, res) => {
  res.json({ success: true, message: 'Heartbeat received' });
});

router.post('/status', authenticateDevice, (_req, res) => {
  res.json({ success: true, message: 'Status received' });
});

router.post('/box-open', authenticateDevice, (_req, res) => {
  res.json({ success: true, message: 'Box opening recorded' });
});

router.post('/alarm-response', authenticateDevice, (_req, res) => {
  res.json({ success: true, message: 'Alarm response recorded' });
});

router.get('/alarm-config', authenticateDevice, (_req, res) => {
  res.json({ success: true, alarms: [] });
});

router.get('/time', authenticateDevice, (_req, res) => {
  res.json({ success: true, time: new Date().toISOString() });
});

router.post('/power-status', authenticateDevice, (_req, res) => {
  res.json({ success: true, message: 'Power status received' });
});

export default router;
