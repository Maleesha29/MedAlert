import { Box, Card, CardContent, Typography, Stack, Chip, Grid, Divider, LinearProgress, Avatar, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import BatteryChargingFullRoundedIcon from '@mui/icons-material/BatteryChargingFullRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import MedicineManager from '../components/MedicineManager';
import AlarmManager from '../components/AlarmManager';
import AlarmWatcher from '../components/AlarmWatcher';
import api from '../services/api';

export default function DashboardPage() {
  const [schedule, setSchedule] = useState([]);
  const [nextReminder, setNextReminder] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState({
    boxStatus: 'closed',
    alarmState: 'IDLE',
    buzzerStatus: false,
    missedDoseCount: 0,
    lastDoseTaken: 'No doses taken today',
  });
  const [notifications, setNotifications] = useState([]);
  const fmtTime = (t) => (t && dayjs(t, 'HH:mm').isValid() ? dayjs(t, 'HH:mm').format('h:mm A') : '—');

  const loadData = async () => {
    try {
      const [{ data: medData }, { data: alarmData }] = await Promise.all([api.get('/medicines'), api.get('/alarms')]);
      const medicines = (medData.medicines || []).reduce((map, m) => { map[m._id] = m; return map; }, {});
      const alarms = (alarmData.alarms || []).map((a) => ({ ...a, medicine: a.medicine ? medicines[a.medicine._id] || a.medicine : null }));

      // sort alarms by time
      const sorted = alarms.slice().sort((a, b) => a.time.localeCompare(b.time));
      setSchedule(sorted);

      // find next upcoming alarm (enabled)
      const now = dayjs();
      const upcoming = sorted.find((a) => a.enabled && dayjs(a.time, 'HH:mm').isAfter(now));
      setNextReminder(upcoming || sorted[0] || null);
    } catch (err) {
      // ignore
    }
  };

  const loadDeviceStatus = async () => {
    try {
      const { data } = await api.get('/device/live-status');
      if (data && data.success && data.status) {
        setDeviceStatus(data.status);
      }
    } catch (err) {
      // ignore
    }
  };

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      if (data && data.success && data.notifications) {
        setNotifications(data.notifications.slice(0, 5));
      }
    } catch (err) {
      // ignore
    }
  };

  const handleSnooze = async () => {
    try {
      await api.post('/device/snooze');
      loadDeviceStatus();
    } catch (err) {
      console.error('Failed to trigger remote snooze', err);
    }
  };

  useEffect(() => {
    loadData();
    loadDeviceStatus();
    loadNotifications();

    const pollInterval = setInterval(() => {
      loadDeviceStatus();
      loadNotifications();
    }, 5000);

    const onAlarmsChanged = () => {
      loadData();
      loadNotifications();
    };
    const onMedsChanged = () => {
      loadData();
      loadNotifications();
    };
    window.addEventListener('alarms:changed', onAlarmsChanged);
    window.addEventListener('medicines:changed', onMedsChanged);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('alarms:changed', onAlarmsChanged);
      window.removeEventListener('medicines:changed', onMedsChanged);
    };
  }, []);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #0f766e 100%)', color: 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.9 }}>Care overview</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Good morning, your care plan is on track.</Typography>
              <Typography sx={{ maxWidth: 600, opacity: 0.95 }}>
                {dayjs().format('dddd, MMMM D, YYYY')} · {nextReminder ? `Next reminder is scheduled for ${fmtTime(nextReminder.time)}${nextReminder.medicine?.name ? ` · ${nextReminder.medicine.name}` : ''}` : 'No upcoming reminders scheduled.'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: { md: 260 } }}>
              <Chip label="Device online" color="success" sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'white' }} />
              <Typography variant="h2" fontWeight={700} sx={{ mt: 1.5 }}>92%</Typography>
              <Typography sx={{ opacity: 0.9 }}>Weekly adherence</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><MonitorHeartRoundedIcon /></Avatar>
                <Box>
                  <Typography variant="h6">Device status</Typography>
                  <Typography variant="body2" color="text.secondary">ESP32 Smart Box</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap gap={1}>
                <Chip
                  label={deviceStatus.boxStatus === 'open' ? 'Lid Open' : 'Lid Closed'}
                  color={deviceStatus.boxStatus === 'open' ? 'success' : 'default'}
                  variant="outlined"
                />
                <Chip
                  label={
                    deviceStatus.alarmState === 'BUZZING'
                      ? 'Ringing!'
                      : deviceStatus.alarmState === 'SNOOZING'
                      ? 'Snoozed'
                      : 'Idle'
                  }
                  color={
                    deviceStatus.alarmState === 'BUZZING'
                      ? 'error'
                      : deviceStatus.alarmState === 'SNOOZING'
                      ? 'warning'
                      : 'info'
                  }
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Last Dose: {deviceStatus.lastDoseTaken}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Missed Doses Today: {deviceStatus.missedDoseCount}
              </Typography>
              {deviceStatus.alarmState === 'BUZZING' && (
                <Button
                  onClick={handleSnooze}
                  variant="contained"
                  color="warning"
                  size="small"
                  fullWidth
                  sx={{ mt: 2, fontWeight: 700, animation: 'pulse 1.5s infinite' }}
                >
                  Snooze Device Alarm
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}><MedicationRoundedIcon /></Avatar>
                <Box>
                  <Typography variant="h6">Next dose</Typography>
                </Box>
              </Stack>
              {nextReminder ? (
                <>
                  <Typography variant="h3" fontWeight={700}>{fmtTime(nextReminder.time)}</Typography>
                  <Typography color="text.secondary">{nextReminder.medicine?.name || nextReminder.name} · {nextReminder.medicine?.remainingPillCount ?? 'N/A'} pills remaining</Typography>
                  <LinearProgress value={nextReminder.medicine && nextReminder.medicine.initialPillCount ? Math.round((nextReminder.medicine.remainingPillCount / Math.max(1, nextReminder.medicine.initialPillCount)) * 100) : 0} sx={{ mt: 2, height: 8, borderRadius: 999 }} />
                </>
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700}>—</Typography>
                  <Typography color="text.secondary">No next dose</Typography>
                  <LinearProgress value={0} sx={{ mt: 2, height: 8, borderRadius: 999 }} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}><NotificationsActiveRoundedIcon /></Avatar>
                <Box>
                  <Typography variant="h6">Notifications</Typography>
                  <Typography variant="body2" color="text.secondary">Recent alerts</Typography>
                </Box>
              </Stack>
              <Stack spacing={1.2}>
                {notifications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No recent alerts</Typography>
                ) : (
                  notifications.map((notif) => (
                    <Typography key={notif._id} variant="body2">
                      • {notif.message}
                    </Typography>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <MedicineManager />
        </Grid>
        <Grid item xs={12}>
          <AlarmManager />
        </Grid>
        <Grid item xs={12}>
          <AlarmWatcher />
        </Grid>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Today’s schedule</Typography>
              <Stack spacing={2}>
                {schedule.map((item) => (
                  <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                    <Box>
                      <Typography fontWeight={700}>{item.medicine?.name || item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">Compartment {item.medicine?.compartment ?? item.medicineCompartment}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={fmtTime(item.time)} color="primary" variant="outlined" />
                      <CheckCircleOutlineRoundedIcon color={item.enabled ? 'success' : 'disabled'} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
