import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import dayjs from 'dayjs';
import api from '../services/api';

export default function DoseHistory() {
  const [history, setHistory] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const loadHistory = async () => {
    try {
      const { data } = await api.get('/notifications/history');
      if (data && data.success && data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleClearHistory = async () => {
    setDeleting(true);
    try {
      await api.delete('/notifications/history');
      setHistory([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // Refresh history every 30 seconds
    const interval = setInterval(loadHistory, 30000);
    const onHistoryChanged = () => loadHistory();
    window.addEventListener('history:changed', onHistoryChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('history:changed', onHistoryChanged);
    };
  }, []);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Dose History</Typography>
          {history.length > 0 && (
            <Tooltip title="Clear History">
              <IconButton size="small" onClick={() => setShowDeleteConfirm(true)} color="error">
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {history.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No dose history available.</Typography>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
            {(showAll ? history : history.slice(0, 5)).map((event) => {
              const isTaken = event.type === 'dose_taken';
              return (
                <ListItem key={event._id} sx={{ px: 0, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: isTaken ? 'success.main' : 'error.main', 
                      color: 'white',
                      width: 36,
                      height: 36
                    }}>
                      {isTaken ? <CheckCircleOutlineRoundedIcon fontSize="small" /> : <ErrorOutlineRoundedIcon fontSize="small" />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={700}>{event.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 2 }}>
                          {dayjs(event.createdAt).format('MMM D, h:mm A')}
                        </Typography>
                      </Box>
                    }
                    secondary={event.message}
                    secondaryTypographyProps={{ variant: 'body2', mt: 0.5 }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
        {history.length > 5 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button size="small" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'See less' : 'See more'}
            </Button>
          </Box>
        )}
      </CardContent>

      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle>Clear Dose History</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all your dose history? This will remove all records permanently and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowDeleteConfirm(false)} color="inherit">Cancel</Button>
          <Button onClick={handleClearHistory} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Clearing…' : 'Clear History'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
