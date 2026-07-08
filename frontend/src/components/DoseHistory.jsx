import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Box } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import dayjs from 'dayjs';
import api from '../services/api';

export default function DoseHistory() {
  const [history, setHistory] = useState([]);

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

  useEffect(() => {
    loadHistory();
    // Refresh history every 30 seconds
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Dose History</Typography>
        {history.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No dose history available.</Typography>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
            {history.map((event) => {
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
      </CardContent>
    </Card>
  );
}
