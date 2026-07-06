import { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Stack, MenuItem, Divider, Alert, useTheme } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { register, setError, error } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'patient', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Card sx={{ width: '100%', maxWidth: 500, p: 1, bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <PersonOutlineRoundedIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>Create account</Typography>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Set up a patient or caregiver profile to start managing reminders and care coordination securely.
          </Typography>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Full name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="Email address" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <TextField label="Phone number" fullWidth value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} fullWidth>
              <MenuItem value="patient">Patient</MenuItem>
              <MenuItem value="caregiver">Caregiver</MenuItem>
            </TextField>
            <TextField label="Password" type="password" fullWidth value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Button variant="contained" size="large" type="submit" disabled={loading}>Create account</Button>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              Already registered? <Link to="/login">Sign in</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
