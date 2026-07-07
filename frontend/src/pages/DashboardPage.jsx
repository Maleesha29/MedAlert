import { Box, Card, CardContent, Typography, Stack, Chip, Grid, Divider, LinearProgress, Avatar } from '@mui/material';
import dayjs from 'dayjs';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import BatteryChargingFullRoundedIcon from '@mui/icons-material/BatteryChargingFullRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import MedicineManager from '../components/MedicineManager';
import AlarmManager from '../components/AlarmManager';
import AlarmWatcher from '../components/AlarmWatcher';

const schedule = [
  { time: '08:30', name: 'Paracetamol', compartment: 'Compartment 1' },
  { time: '13:00', name: 'Vitamin D', compartment: 'Compartment 2' },
  { time: '20:00', name: 'Blood Pressure Tablet', compartment: 'Compartment 3' }
];

export default function DashboardPage() {
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #0f766e 100%)', color: 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.9 }}>Care overview</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Good morning, your care plan is on track.</Typography>
              <Typography sx={{ maxWidth: 600, opacity: 0.95 }}>
                {dayjs().format('dddd, MMMM D, YYYY')} · Next reminder is scheduled for 08:30 AM with proactive alerts for missed doses.
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
                  <Typography variant="body2" color="text.secondary">ESP32 connected</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="Online" color="success" />
                <Chip label="WiFi connected" color="info" />
              </Stack>
              <Typography variant="body2" color="text.secondary">Battery 86% · Last sync 2 min ago</Typography>
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
                  <Typography variant="body2" color="text.secondary">Compartment 1</Typography>
                </Box>
              </Stack>
              <Typography variant="h3" fontWeight={700}>08:30 AM</Typography>
              <Typography color="text.secondary">Paracetamol · 2 pills remaining</Typography>
              <LinearProgress value={72} sx={{ mt: 2, height: 8, borderRadius: 999 }} />
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
                <Typography variant="body2">• Low pill alert for Vitamin D</Typography>
                <Typography variant="body2">• Reminder delivered successfully</Typography>
                <Typography variant="body2">• Caregiver notified</Typography>
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
                  <Box key={item.time} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                    <Box>
                      <Typography fontWeight={700}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.compartment}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={item.time} color="primary" variant="outlined" />
                      <CheckCircleOutlineRoundedIcon color="success" />
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
