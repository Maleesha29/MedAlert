import { Box, Card, CardContent, Typography, Stack, Chip, Grid, Divider, LinearProgress, Avatar } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import MedicineManager from '../components/MedicineManager';
import AlarmManager from '../components/AlarmManager';
import AlarmWatcher from '../components/AlarmWatcher';
import api from '../services/api';

// Below this % of the original stock, a medicine is flagged as low.
const LOW_STOCK_THRESHOLD_PCT = 20;
// Absolute fallback threshold for medicines with no recorded initial count.
const LOW_STOCK_THRESHOLD_ABS = 5;

export default function DashboardPage() {
  const [medicines, setMedicines] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const fmtTime = (t) => (t && dayjs(t, 'HH:mm').isValid() ? dayjs(t, 'HH:mm').format('h:mm A') : '—');

  const loadData = async () => {
    try {
      const [{ data: medData }, { data: alarmData }] = await Promise.all([api.get('/medicines'), api.get('/alarms')]);
      const medList = medData.medicines || [];
      const medicineMap = medList.reduce((map, m) => { map[m._id] = m; return map; }, {});
      const alarms = (alarmData.alarms || []).map((a) => ({ ...a, medicine: a.medicine ? medicineMap[a.medicine._id] || a.medicine : null }));

      const sorted = alarms.slice().sort((a, b) => a.time.localeCompare(b.time));
      setMedicines(medList);
      setSchedule(sorted);
    } catch (err) {
      // ignore - keep last known state
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadData();
    const onAlarmsChanged = () => loadData();
    const onMedsChanged = () => loadData();
    window.addEventListener('alarms:changed', onAlarmsChanged);
    window.addEventListener('medicines:changed', onMedsChanged);
    return () => {
      window.removeEventListener('alarms:changed', onAlarmsChanged);
      window.removeEventListener('medicines:changed', onMedsChanged);
    };
  }, []);

  // Refresh the "now" marker every minute so next-dose / schedule status stays accurate.
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const id = setInterval(() => setNow(dayjs()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = useMemo(() => {
    const h = now.hour();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  const enabledSchedule = useMemo(() => schedule.filter((a) => a.enabled), [schedule]);

  const nextReminder = useMemo(() => {
    const upcoming = enabledSchedule.find((a) => dayjs(a.time, 'HH:mm').isAfter(now));
    return upcoming || enabledSchedule[0] || null;
  }, [enabledSchedule, now]);

  const dosesTakenSoFar = useMemo(
    () => enabledSchedule.filter((a) => dayjs(a.time, 'HH:mm').isBefore(now)).length,
    [enabledSchedule, now]
  );

  const scheduleProgressPct = enabledSchedule.length
    ? Math.round((dosesTakenSoFar / enabledSchedule.length) * 100)
    : 0;

  const lowStockMedicines = useMemo(() => {
    return medicines.filter((m) => {
      if (m.remainingPillCount == null) return false;
      if (m.initialPillCount) {
        return (m.remainingPillCount / Math.max(1, m.initialPillCount)) * 100 <= LOW_STOCK_THRESHOLD_PCT;
      }
      return m.remainingPillCount <= LOW_STOCK_THRESHOLD_ABS;
    });
  }, [medicines]);

  const disabledAlarmsCount = useMemo(() => schedule.filter((a) => !a.enabled).length, [schedule]);

  const alerts = useMemo(() => {
    const list = [];
    lowStockMedicines.forEach((m) => {
      list.push({ key: `low-${m._id}`, text: `${m.remainingPillCount} pills left for ${m.name}`, severity: 'warning' });
    });
    if (disabledAlarmsCount > 0) {
      list.push({
        key: 'disabled-alarms',
        text: `${disabledAlarmsCount} reminder${disabledAlarmsCount > 1 ? 's are' : ' is'} currently turned off`,
        severity: 'info',
      });
    }
    if (list.length === 0 && loaded) {
      list.push({ key: 'all-good', text: 'No alerts right now — everything looks on track', severity: 'success' });
    }
    return list;
  }, [lowStockMedicines, disabledAlarmsCount, loaded]);

  const nextDoseProgressPct = nextReminder?.medicine?.initialPillCount
    ? Math.round((nextReminder.medicine.remainingPillCount / Math.max(1, nextReminder.medicine.initialPillCount)) * 100)
    : 0;

  const headlineSubtext = enabledSchedule.length
    ? `${now.format('dddd, MMMM D, YYYY')} · ${enabledSchedule.length} dose${enabledSchedule.length > 1 ? 's' : ''} scheduled today`
    : `${now.format('dddd, MMMM D, YYYY')} · No reminders scheduled yet`;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #0f766e 100%)', color: 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.9 }}>Care overview</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                {greeting}{nextReminder ? `, your next reminder is at ${fmtTime(nextReminder.time)}.` : ', you have no upcoming reminders.'}
              </Typography>
              <Typography sx={{ maxWidth: 600, opacity: 0.95 }}>{headlineSubtext}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
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
                  <Typography color="text.secondary">
                    {nextReminder.medicine?.name || nextReminder.name}
                    {nextReminder.medicine?.remainingPillCount != null ? ` · ${nextReminder.medicine.remainingPillCount} pills remaining` : ''}
                  </Typography>
                  <LinearProgress value={nextDoseProgressPct} variant="determinate" sx={{ mt: 2, height: 8, borderRadius: 999 }} />
                </>
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700}>—</Typography>
                  <Typography color="text.secondary">No upcoming doses</Typography>
                  <LinearProgress value={0} variant="determinate" sx={{ mt: 2, height: 8, borderRadius: 999 }} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><EventAvailableRoundedIcon /></Avatar>
                <Box>
                  <Typography variant="h6">Today's progress</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {enabledSchedule.length ? `${dosesTakenSoFar} of ${enabledSchedule.length} doses due` : 'Nothing scheduled'}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="h3" fontWeight={700}>{scheduleProgressPct}%</Typography>
              <LinearProgress value={scheduleProgressPct} variant="determinate" sx={{ mt: 2, height: 8, borderRadius: 999 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: alerts.some((a) => a.severity === 'warning') ? 'warning.main' : 'success.main' }}>
                  {alerts.some((a) => a.severity === 'warning') ? <WarningAmberRoundedIcon /> : <NotificationsActiveRoundedIcon />}
                </Avatar>
                <Box>
                  <Typography variant="h6">Alerts</Typography>
                  <Typography variant="body2" color="text.secondary">{alerts.length} active</Typography>
                </Box>
              </Stack>
              <Stack spacing={1.2}>
                {alerts.map((a) => (
                  <Typography key={a.key} variant="body2">• {a.text}</Typography>
                ))}
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
              <Typography variant="h6" sx={{ mb: 2 }}>Today's schedule</Typography>
              {schedule.length === 0 ? (
                <Typography color="text.secondary">No reminders set up yet.</Typography>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}