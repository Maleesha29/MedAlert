import { Box, Container, useTheme } from '@mui/material';
import Header from './Header';

export default function Layout({ children, mode, onToggleMode }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #020617 0%, #111827 100%)'
          : 'linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)'
      }}
    >
      <Header mode={mode} onToggleMode={onToggleMode} />
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}
