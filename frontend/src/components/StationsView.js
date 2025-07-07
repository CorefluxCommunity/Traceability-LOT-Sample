import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import mqttService from '../services/mqttService';

const StationsView = () => {
  const [stations, setStations] = useState([]);
  const [stationActivity, setStationActivity] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [activityDialog, setActivityDialog] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [freeTierDialog, setFreeTierDialog] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [retryCount, setRetryCount] = useState(0);

  const [formData, setFormData] = useState({
    station_id: '',
    station_name: '',
    station_type: '',
    location: ''
  });

  const stationTypes = [
    'assembly',
    'testing',
    'quality_check',
    'packaging',
    'shipping',
    'maintenance'
  ];

  const statusColors = {
    'active': 'success',
    'inactive': 'error',
    'maintenance': 'warning'
  };

  useEffect(() => {
    // Subscribe to station results
    mqttService.subscribe('coreflux/factory01/traceability/station/activity/result', handleStationActivity);
    mqttService.subscribe('coreflux/factory01/traceability/station/list/result', handleStationsList);
    mqttService.subscribe('coreflux/factory01/traceability/station/info', handleStationInfo);
    
    // Monitor connection status and auto-reconnect
    const checkConnectionStatus = () => {
      const isReady = mqttService.isConnectionReady();
      const wasConnected = connectionStatus === 'connected';
      
      if (isReady && !wasConnected) {
        // Just connected
        setConnectionStatus('connected');
        console.log('🟢 Auto-connected to broker, loading stations...');
        loadStations();
      } else if (!isReady && wasConnected) {
        // Just disconnected
        setConnectionStatus('connecting');
        console.log('🔴 Connection lost, attempting auto-reconnect...');
        // Try to reconnect
        mqttService.connect().catch(err => {
          console.log('⚠️ Auto-reconnect failed, will retry...');
        });
      } else if (!isReady && connectionStatus === 'connecting') {
        // Still trying to connect - try force reconnect after 10 seconds
        console.log('🟡 Still connecting...');
        // Force reconnect if stuck in connecting state for too long
        setTimeout(() => {
          if (connectionStatus === 'connecting' && !mqttService.isConnectionReady()) {
            console.log('⏰ Connection timeout, forcing reconnect...');
            mqttService.forceReconnect().catch(err => {
              console.log('⚠️ Force reconnect failed');
            });
          }
        }, 10000);
      }
    };
    
    // Check connection status every 2 seconds
    const connectionInterval = setInterval(checkConnectionStatus, 2000);
    
    // Initial connection attempt
    const initialConnect = () => {
      if (!mqttService.isConnectionReady()) {
        setConnectionStatus('connecting');
        console.log('🟡 Initial connection attempt...');
        mqttService.connect().then(() => {
          setConnectionStatus('connected');
          loadStations();
        }).catch(err => {
          console.log('⚠️ Initial connection failed, will retry...');
          setConnectionStatus('connecting');
        });
      } else {
        setConnectionStatus('connected');
        loadStations();
      }
    };
    
    // Start initial connection
    initialConnect();
    
    // Cleanup interval on unmount
    return () => clearInterval(connectionInterval);
  }, [connectionStatus]);

  const loadStations = () => {
    try {
      if (!mqttService.isConnectionReady()) {
        console.log('⚠️ MQTT not connected, retrying in 2 seconds...');
        setSnackbar({
          open: true,
          message: 'Connecting to broker... Please wait.',
          severity: 'info'
        });
        setTimeout(loadStations, 2000);
        return;
      }
      
      console.log('🏭 Requesting stations list from broker...');
      mqttService.listStations();
    } catch (error) {
      console.error('Error loading stations:', error);
      setSnackbar({
        open: true,
        message: 'Error loading stations from broker',
        severity: 'error'
      });
    }
  };

  const handleStationsList = (data) => {
    console.log('🏭 Received stations list:', data);
    
    // Handle the data format - it comes as an array
    if (Array.isArray(data)) {
      setStations(data);
    } else if (Array.isArray(data) && data.length > 0) {
      setStations(data[0]);
    } else {
      console.warn('Unexpected stations list format:', data);
      setStations([]);
    }
  };

  const handleStationInfo = (data) => {
    console.log('🏭 Received station info:', data);
    // Handle individual station info if needed
  };

  const handleStationActivity = (data) => {
    if (data && selectedStation) {
      setStationActivity(prev => ({
        ...prev,
        [selectedStation.station_id]: data
      }));
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      station_id: '',
      station_name: '',
      station_type: '',
      location: ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      station_id: '',
      station_name: '',
      station_type: '',
      location: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setFreeTierDialog(true);
    handleCloseDialog();
  };

  const handleViewActivity = (station) => {
    setSelectedStation(station);
    setActivityDialog(true);
    
    // Request station activity
    mqttService.getStationActivity(station.station_id);
  };

  const handleRecordMovement = (station) => {
    // This would open a movement recording dialog
    setSnackbar({
      open: true,
      message: `Movement recording for ${station.station_name} - Use the movement tracking feature`,
      severity: 'info'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Stations Management
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={connectionStatus !== 'connected'}
          >
            Add Station
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6">Stations List</Typography>
                  <Chip
                    label={
                      connectionStatus === 'connected' ? 'Connected' : 
                      connectionStatus === 'connecting' ? `Connecting... (${retryCount})` : 
                      'Disconnected'
                    }
                    color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'error'}
                    size="small"
                    icon={connectionStatus === 'connected' ? <span>🟢</span> : connectionStatus === 'connecting' ? <span>🟡</span> : <span>🔴</span>}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={loadStations}
                    disabled={connectionStatus !== 'connected'}
                  >
                    Refresh
                  </Button>
                  {connectionStatus !== 'connected' && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setConnectionStatus('connecting');
                        mqttService.forceReconnect().then(() => {
                          setConnectionStatus('connected');
                          loadStations();
                        }).catch(err => {
                          console.log('Manual reconnect failed:', err);
                          setConnectionStatus('connecting');
                        });
                      }}
                      size="small"
                    >
                      Reconnect
                    </Button>
                  )}
                </Box>
              </Box>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Station ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stations.map((station) => (
                      <TableRow key={station.id}>
                        <TableCell>{station.station_id}</TableCell>
                        <TableCell>{station.station_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={station.station_type.replace('_', ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                            {station.location}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={station.status}
                            color={statusColors[station.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(station.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<TimelineIcon />}
                              onClick={() => handleViewActivity(station)}
                            >
                              Activity
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleRecordMovement(station)}
                            >
                              Record Movement
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Station Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Station</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Station ID"
                value={formData.station_id}
                onChange={(e) => handleInputChange('station_id', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Station Name"
                value={formData.station_name}
                onChange={(e) => handleInputChange('station_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Station Type</InputLabel>
                <Select
                  value={formData.station_type}
                  label="Station Type"
                  onChange={(e) => handleInputChange('station_type', e.target.value)}
                >
                  {stationTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading || !formData.station_id || !formData.station_name || !formData.station_type || !formData.location}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Station Activity Dialog */}
      <Dialog 
        open={activityDialog} 
        onClose={() => setActivityDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Station Activity - {selectedStation?.station_name}
        </DialogTitle>
        <DialogContent>
          {selectedStation && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Station ID:</Typography>
                  <Typography variant="body1">{selectedStation.station_id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Type:</Typography>
                  <Typography variant="body1">{selectedStation.station_type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Location:</Typography>
                  <Typography variant="body1">{selectedStation.location}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip
                    label={selectedStation.status}
                    color={statusColors[selectedStation.status] || 'default'}
                    size="small"
                  />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Recent Activity (Last 24 Hours)
              </Typography>
              
              {stationActivity[selectedStation.station_id] ? (
                <List>
                  {stationActivity[selectedStation.station_id].map((activity, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`Part ${activity.part_id} moved to ${activity.to_station_id}`}
                        secondary={`${new Date(activity.timestamp).toLocaleString()} - ${activity.notes || 'No notes'}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent activity found for this station.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialog(false)}>Close</Button>
          <Button 
            variant="contained"
            onClick={() => {
              if (selectedStation) {
                mqttService.getStationActivity(selectedStation.station_id);
              }
            }}
          >
            Refresh Activity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Free Tier Limitation Dialog */}
      <Dialog open={freeTierDialog} onClose={() => setFreeTierDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="info" />
            <Typography variant="h6">
              Coreflux Free Tier Limitation
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            We are using Coreflux Free Tier MQTT Broker for running more actions from the LOT Notebook you need a Coreflux Enterprise Broker License.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The Free tier allows you to:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2">
              List all stations
            </Typography>
            <Typography component="li" variant="body2">
              View station information
            </Typography>
            <Typography component="li" variant="body2">
              Monitor station activities
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To add, edit, or delete stations, you need an Enterprise license.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Contact Coreflux to upgrade your license and unlock full station management capabilities.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFreeTierDialog(false)}>
            Close
          </Button>
          <Button 
            variant="contained" 
            component={Link}
            href="https://www.coreflux.org/contact-us"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Coreflux
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
    </Box>
  );
};

export default StationsView; 