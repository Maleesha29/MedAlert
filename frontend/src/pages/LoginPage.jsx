import { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Stack, Checkbox, FormControlLabel, Divider, Alert } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setError, error } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Card sx={{ width: '100%', maxWidth: 460, p: 1 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <LockOutlinedIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>Welcome back</Typography>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Access your medication schedule, device monitoring, and care updates from one secure dashboard.
          </Typography>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Email address" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <TextField label="Password" type="password" fullWidth value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <FormControlLabel control={<Checkbox defaultChecked />} label="Remember me" />
            <Button variant="contained" size="large" type="submit" disabled={loading}>Sign in</Button>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              New here? <Link to="/register">Create a secure account</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
