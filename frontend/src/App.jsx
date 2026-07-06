import { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#2563eb' },
      secondary: { main: '#0f766e' },
      success: { main: '#16a34a' },
      warning: { main: '#f59e0b' },
      background: {
        default: mode === 'dark' ? '#020617' : '#f5f7fb',
        paper: mode === 'dark' ? '#111827' : '#ffffff'
      },
      text: {
        primary: mode === 'dark' ? '#f9fafb' : '#0f172a',
        secondary: mode === 'dark' ? '#cbd5e1' : '#475569'
      }
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: 'Inter, Roboto, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 }
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
            border: '1px solid rgba(148, 163, 184, 0.18)'
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: 'none',
            boxShadow: 'none'
          },
          containedPrimary: {
            boxShadow: 'none'
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined'
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
