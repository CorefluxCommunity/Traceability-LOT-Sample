import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  ArrowForward as ArrowIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import mqttService from '../services/mqttService';

const PartHistory = ({ partId, open, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Sample stations for display (in real app, this would come from stations list)
  const sampleStations = {
    'STATION001': 'Assembly Station 1',
    'STATION002': 'Quality Check Station',
    'STATION003': 'Testing Station',
    'STATION004': 'Packaging Station'
  };

  // Sample operators for display
  const sampleOperators = {
    'OP001': 'John Smith',
    'OP002': 'Jane Doe',
    'OP003': 'Bob Wilson'
  };

  const movementTypeColors = {
    transfer: 'primary',
    quality_check: 'warning',
    assembly: 'info',
    testing: 'secondary',
    packaging: 'success',
    shipping: 'error'
  };

  useEffect(() => {
    if (open && partId) {
      loadPartHistory();
    }
  }, [open, partId]);

  const loadPartHistory = () => {
    try {
      setLoading(true);
      console.log('📋 Loading history for part:', partId);
      mqttService.getPartHistory(partId);
    } catch (error) {
      console.error('Error loading part history:', error);
      setSnackbar({
        open: true,
        message: 'Error loading part history',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Subscribe to part history results
  useEffect(() => {
    mqttService.subscribe('coreflux/factory01/traceability/part/history/result', handlePartHistoryResult);
    
    return () => {
      mqttService.unsubscribe('coreflux/factory01/traceability/part/history/result', handlePartHistoryResult);
    };
  }, []);

  const handlePartHistoryResult = (data) => {
    console.log('📋 Received part history:', data);
    setLoading(false);
    
    if (Array.isArray(data)) {
      setMovements(data);
    } else if (data && Array.isArray(data)) {
      setMovements(data);
    } else {
      console.warn('Unexpected part history format:', data);
      setMovements([]);
    }
  };

  const getStationName = (stationId) => {
    return sampleStations[stationId] || stationId;
  };

  const getOperatorName = (operatorId) => {
    return sampleOperators[operatorId] || operatorId;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMovementIcon = (movementType) => {
    switch (movementType) {
      case 'transfer':
        return <ArrowIcon />;
      case 'quality_check':
        return <LocationIcon />;
      case 'assembly':
        return <LocationIcon />;
      case 'testing':
        return <LocationIcon />;
      case 'packaging':
        return <LocationIcon />;
      case 'shipping':
        return <LocationIcon />;
      default:
        return <LocationIcon />;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Part History: {partId}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadPartHistory}
              disabled={loading}
              size="small"
            >
              Refresh
            </Button>
            <Button
              startIcon={<CloseIcon />}
              onClick={onClose}
              size="small"
            >
              Close
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : movements.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No movement history found for this part
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This part hasn't been moved between stations yet.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Movement Timeline ({movements.length} movements)
            </Typography>
            
            <Timeline position="alternate">
              {movements.map((movement, index) => (
                <TimelineItem key={movement.id}>
                  <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
                    {formatTimestamp(movement.timestamp)}
                  </TimelineOppositeContent>
                  
                  <TimelineSeparator>
                    <TimelineDot color={movementTypeColors[movement.movement_type] || 'primary'}>
                      {getMovementIcon(movement.movement_type)}
                    </TimelineDot>
                    {index < movements.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  
                  <TimelineContent sx={{ py: '12px', px: 2 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Chip
                            label={movement.movement_type.replace('_', ' ').toUpperCase()}
                            color={movementTypeColors[movement.movement_type] || 'primary'}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            #{movement.id}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={1} sx={{ mt: 1 }}>
                          {movement.from_station_id && (
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  From:
                                </Typography>
                                <Chip
                                  label={getStationName(movement.from_station_id)}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            </Grid>
                          )}
                          
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                To:
                              </Typography>
                              <Chip
                                label={getStationName(movement.to_station_id)}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            </Box>
                          </Grid>
                          
                          {movement.operator_id && (
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {getOperatorName(movement.operator_id)}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          
                          {movement.notes && (
                            <Grid item xs={12}>
                              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                "{movement.notes}"
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Summary:</strong> This part has been moved {movements.length} time(s) between {new Set(movements.map(m => m.to_station_id)).size} different stations.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default PartHistory; 