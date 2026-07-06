import { useState } from 'react';
import { AppBar, Box, Toolbar, Typography, Button, Stack, Container, IconButton, useTheme, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';

export default function Header({ mode, onToggleMode }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // controls the profile dropdown menu
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // only Dashboard left in the nav bar now
  const navItems = [
    { label: 'Dashboard', to: '/' }
  ];

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static" color="primary" elevation={0} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ py: 1 }}>
          {/* Logo + title navigates to dashboard */}
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexGrow: 1, cursor: 'pointer' }}
          >
            <MedicationRoundedIcon sx={{ color: 'white' }} />
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'white' }}>MedAlert</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>Smart medicine companion</Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {user && navItems.map((item) => (
              <Button
                key={item.to}
                component={Link}
                to={item.to}
                color={location.pathname === item.to ? 'secondary' : 'inherit'}
                sx={{ borderRadius: 999, px: 1.5, fontWeight: 600, color: 'white' }}
              >
                {item.label}
              </Button>
            ))}
            {!user && (
              <>
                <Button component={Link} to="/login" color={location.pathname === '/login' ? 'secondary' : 'inherit'} sx={{ borderRadius: 999, px: 1.5, fontWeight: 600, color: 'white' }}>
                  Login
                </Button>
                <Button component={Link} to="/register" color={location.pathname === '/register' ? 'secondary' : 'inherit'} sx={{ borderRadius: 999, px: 1.5, fontWeight: 600, color: 'white' }}>
                  Register
                </Button>
              </>
            )}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={onToggleMode} color="inherit" aria-label="toggle theme">
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>

            {/* Profile icon - only shown when logged in */}
            {user && (
              <>
                <IconButton onClick={handleProfileClick} color="inherit" aria-label="profile menu">
                  <AccountCircleIcon />
                </IconButton>
                <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {user.name || user.username || user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={handleEditProfile}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    Edit Profile
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}