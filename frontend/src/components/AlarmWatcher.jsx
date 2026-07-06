import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog, Box, Typography, Button, Stack, Chip, GlobalStyles, IconButton
} from '@mui/material';
import dayjs from 'dayjs';
import AlarmRoundedIcon from '@mui/icons-material/AlarmRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SnoozeRoundedIcon from '@mui/icons-material/SnoozeRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import api from '../services/api';

const POLL_INTERVAL_MS = 15000; // check every 15s

export default function AlarmWatcher() {
  const [alarms, setAlarms] = useState([]);
  const [queue, setQueue] = useState([]); // alarms currently ringing, oldest first
  const [muted, setMuted] = useState(false);

  const firedRef = useRef(new Set());       // keys already fired this minute, avoids re-triggering
  const snoozedUntilRef = useRef({});        // alarmId -> dayjs timestamp to re-check after
  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);

  const current = queue[0] || null;

  const loadAlarms = useCallback(async () => {
    try {
      const { data } = await api.get('/alarms');
      setAlarms(data.alarms || []);
    } catch {
      // Silent fail here — the AlarmManager page already surfaces load errors
    }
  }, []);

  useEffect(() => {
    loadAlarms();
    const alarmListInterval = setInterval(loadAlarms, 60000); // refresh alarm list every minute
    return () => clearInterval(alarmListInterval);
  }, [loadAlarms]);

  // Core polling loop: check if any enabled alarm matches the current time
  useEffect(() => {
    const tick = () => {
      const now = dayjs();
      const nowKey = now.format('YYYY-MM-DD HH:mm');
      const nowTime = now.format('HH:mm');

      alarms.forEach((alarm) => {
        if (!alarm.enabled) return;

        const snoozedUntil = snoozedUntilRef.current[alarm._id];
        const isSnoozed = snoozedUntil && now.isBefore(snoozedUntil);
        if (isSnoozed) return;

        const fireKey = `${alarm._id}-${snoozedUntil ? 'snooze-' + now.format('HH:mm') : nowKey}`;
        const matchesScheduledTime = !snoozedUntil && alarm.time === nowTime;
        const matchesSnoozeWakeup = snoozedUntil && now.isAfter(snoozedUntil);

        if ((matchesScheduledTime || matchesSnoozeWakeup) && !firedRef.current.has(fireKey)) {
          firedRef.current.add(fireKey);
          delete snoozedUntilRef.current[alarm._id];
          setQueue((prev) => (prev.some((a) => a._id === alarm._id) ? prev : [...prev, alarm]));
        }
      });
    };

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [alarms]);

  // Sound: simple repeating beep via Web Audio API, no external asset needed
  useEffect(() => {
    if (!current || muted) {
      stopBeeping();
      return;
    }
    startBeeping();
    return stopBeeping;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, muted]);

  const startBeeping = () => {
    stopBeeping();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const beepOnce = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    };

    beepOnce();
    beepIntervalRef.current = setInterval(beepOnce, 900);
  };

  const stopBeeping = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const dismissCurrent = () => {
    setQueue((prev) => prev.slice(1));
    setMuted(false);
  };

  const handleTaken = async () => {
    if (!current) return;
    try {
      await api.post(`/alarms/${current._id}/taken`, { takenAt: new Date().toISOString() });
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error('Unable to mark alarm as taken', error);
      } else {
        try {
          await api.post(`/alarms/${current._id}/mark-taken`, { takenAt: new Date().toISOString() });
        } catch (fallbackError) {
          console.error('Unable to mark alarm as taken via fallback route', fallbackError);
        }
      }
    }
    dismissCurrent();
  };

  const handleSnooze = () => {
    if (!current) return;
    const minutes = current.snoozeDuration || 5;
    snoozedUntilRef.current[current._id] = dayjs().add(minutes, 'minute');
    dismissCurrent();
  };

  return (
    <>
      <GlobalStyles
        styles={{
          '@keyframes alarmPulse': {
            '0%': { transform: 'scale(1)', opacity: 1 },
            '50%': { transform: 'scale(1.15)', opacity: 0.7 },
            '100%': { transform: 'scale(1)', opacity: 1 }
          }
        }}
      />
      <Dialog
        open={Boolean(current)}
        fullScreen
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #dc2626 0%, #7c2d12 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        {current && (
          <Box sx={{ textAlign: 'center', maxWidth: 420, px: 3 }}>
            <IconButton
              onClick={() => setMuted((m) => !m)}
              sx={{ position: 'absolute', top: 20, right: 20, color: 'white' }}
              aria-label="mute sound"
            >
              <VolumeOffRoundedIcon />
            </IconButton>

            <AlarmRoundedIcon sx={{ fontSize: 96, animation: 'alarmPulse 1s ease-in-out infinite' }} />

            <Typography variant="h4" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
              Time for your medicine
            </Typography>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
              {current.name}
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 4 }}>
              <Chip label={current.time} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              <Chip label={`Compartment ${current.medicineCompartment}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              {current.medicine?.name && (
                <Chip label={current.medicine.name} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              )}
            </Stack>
            {current.notes && (
              <Typography sx={{ opacity: 0.9, mb: 4 }}>{current.notes}</Typography>
            )}

            <Typography variant="h6" sx={{ mb: 3 }}>Did you take the medicine?</Typography>

            <Stack spacing={1.5}>
              <Button
                onClick={handleTaken}
                variant="contained"
                size="large"
                startIcon={<CheckCircleRoundedIcon />}
                sx={{
                  bgcolor: 'white', color: '#7c2d12', fontWeight: 700, py: 1.5, borderRadius: 999,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
              >
                Yes, I took it
              </Button>
              <Button
                onClick={handleSnooze}
                variant="outlined"
                startIcon={<SnoozeRoundedIcon />}
                sx={{ borderColor: 'rgba(255,255,255,0.6)', color: 'white', borderRadius: 999 }}
              >
                Snooze {current.snoozeDuration || 5} min
              </Button>
            </Stack>

            {queue.length > 1 && (
              <Typography variant="caption" sx={{ display: 'block', mt: 3, opacity: 0.8 }}>
                {queue.length - 1} more alarm{queue.length - 1 > 1 ? 's' : ''} waiting
              </Typography>
            )}
          </Box>
        )}
      </Dialog>
    </>
  );
}