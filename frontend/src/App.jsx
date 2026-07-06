import { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AlarmWatcher from './components/AlarmWatcher';
import { AuthProvider } from './context/AuthContext';

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#2563eb' },
      secondary: { main: '#0f766e' },
      background: {
        default: mode === 'dark' ? '#020617' : '#f8fafc',
        paper: mode === 'dark' ? '#0f172a' : '#ffffff'
      }
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: 'Inter, Roboto, sans-serif'
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)'
          }
        }
      }
    }
  });

export default function App() {
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Layout mode={mode} onToggleMode={() => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))}>
            <Routes>
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
