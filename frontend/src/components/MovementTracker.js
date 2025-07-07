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
  Divider
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import mqttService from '../services/mqttService';
import PartHistory from './PartHistory';

const MovementTracker = () => {
  const [movements, setMovements] = useState([]);
  const [partHistory, setPartHistory] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState({ open: false, partId: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const [parts, setParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);

  const [formData, setFormData] = useState({
    part_id: '',
    from_station_id: '',
    to_station_id: '',
    movement_type: 'transfer',
    operator_id: '',
    notes: ''
  });

  const movementTypes = [
    'transfer',
    'quality_check',
    'assembly',
    'testing',
    'packaging',
    'shipping'
  ];

  // Sample data for demonstration
  const sampleStations = [
    { station_id: 'STATION001', station_name: 'Assembly Station 1' },
    { station_id: 'STATION002', station_name: 'Quality Check Station' },
    { station_id: 'STATION003', station_name: 'Testing Station' },
    { station_id: 'STATION004', station_name: 'Packaging Station' }
  ];

  const sampleOperators = [
    { operator_id: 'OP001', operator_name: 'John Smith' },
    { operator_id: 'OP002', operator_name: 'Jane Doe' },
    { operator_id: 'OP003', operator_name: 'Bob Wilson' }
  ];

  useEffect(() => {
    // Subscribe to all result topics BEFORE requesting data
    mqttService.subscribe('coreflux/factory01/traceability/movement/list/result', handleMovementList);
    mqttService.subscribe('coreflux/factory01/traceability/part/history/result', handlePartHistory);
    mqttService.subscribe('coreflux/factory01/traceability/part/list/result', handlePartsList);
    
    // Monitor connection status and auto-reconnect
    const checkConnectionStatus = () => {
      const isReady = mqttService.isConnectionReady();
      const wasConnected = connectionStatus === 'connected';
      
      if (isReady && !wasConnected) {
        // Just connected
        setConnectionStatus('connected');
        console.log('🟢 Auto-connected to broker, loading data...');
        loadMovements();
        loadParts();
        
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
    
    const connectionInterval = setInterval(checkConnectionStatus, 2000);
    
    const initialConnect = () => {
      if (!mqttService.isConnectionReady()) {
        setConnectionStatus('connecting');
        console.log('�� Initial connection attempt...');
        mqttService.connect().then(() => {
          setConnectionStatus('connected');
          // Now request data
          loadParts();
          loadMovements();
        }).catch(err => {
          console.log('⚠️ Initial connection failed, will retry...');
          setConnectionStatus('connecting');
        });
      } else {
        setConnectionStatus('connected');
        // Now request data
        loadParts();
        loadMovements();
      }
    };
    initialConnect();
    return () => clearInterval(connectionInterval);
  }, [connectionStatus]);

  const loadParts = () => {
    try {
      if (!mqttService.isConnectionReady()) {
        console.log('⚠️ MQTT not connected, retrying in 2 seconds...');
        setSnackbar({
          open: true,
          message: 'Connecting to broker... Please wait.',
          severity: 'info'
        });
        setTimeout(loadParts, 2000);
        return;
      }
      
      setPartsLoading(true);
      console.log('📋 Requesting parts list for movement form...');
      mqttService.listParts();
    } catch (error) {
      console.error('Error loading parts:', error);
      setSnackbar({
        open: true,
        message: 'Error loading parts from broker',
        severity: 'error'
      });
      setPartsLoading(false);
    }
  };

  const handlePartsList = (data) => {
    console.log('📋 Received parts list for movement form:', data);
    setPartsLoading(false);
    
    // Handle the data format - it comes as an array
    if (Array.isArray(data)) {
      setParts(data);
    } else if (Array.isArray(data) && data.length > 0) {
      setParts(data[0]);
    } else {
      console.warn('Unexpected parts list format:', data);
      setParts([]);
    }
  };

  const loadMovements = () => {
    if (!mqttService.isConnectionReady()) {
      setSnackbar({
        open: true,
        message: 'Connecting to broker... Please wait.',
        severity: 'info'
      });
      setTimeout(loadMovements, 2000);
      return;
    }
    setLoading(true);
    mqttService.listMovements();
  };

  const handleMovementList = (data) => {
    setLoading(false);
    if (Array.isArray(data)) {
      setMovements(data);
    } else {
      setMovements([]);
    }
  };

  const handlePartHistory = (data) => {
    if (data && Array.isArray(data)) {
      setPartHistory(data);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      part_id: '',
      from_station_id: '',
      to_station_id: '',
      movement_type: 'transfer',
      operator_id: '',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      part_id: '',
      from_station_id: '',
      to_station_id: '',
      movement_type: 'transfer',
      operator_id: '',
      notes: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Record part movement
      mqttService.recordPartMovement(formData);
      setSnackbar({
        open: true,
        message: 'Movement recorded successfully',
        severity: 'success'
      });
      
      // Add to local state for immediate display
      const newMovement = {
        id: Date.now(),
        ...formData,
        timestamp: new Date().toISOString()
      };
      setMovements(prev => [newMovement, ...prev]);
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error recording movement:', error);
      setSnackbar({
        open: true,
        message: 'Error recording movement',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (partId) => {
    setHistoryDialog({ open: true, partId });
  };

  const getStationName = (stationId) => {
    const station = sampleStations.find(s => s.station_id === stationId);
    return station ? station.station_name : stationId;
  };

  const getOperatorName = (operatorId) => {
    const operator = sampleOperators.find(o => o.operator_id === operatorId);
    return operator ? operator.operator_name : operatorId;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Movement Tracker
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={connectionStatus !== 'connected'}
          >
            Record Movement
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6">Recent Movements</Typography>
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
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    setLoading(true);
                    mqttService.listMovements();
                  }}
                >
                  Refresh
                </Button>
              </Box>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Part ID</TableCell>
                      <TableCell>From Station</TableCell>
                      <TableCell>To Station</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <Chip
                            label={movement.part_id}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {movement.from_station_id ? getStationName(movement.from_station_id) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getStationName(movement.to_station_id)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={movement.movement_type.replace('_', ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {movement.operator_id ? getOperatorName(movement.operator_id) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {movement.notes || 'No notes'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Date(movement.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<TimelineIcon />}
                            onClick={() => handleViewHistory(movement.part_id)}
                          >
                            History
                          </Button>
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

      {/* Record Movement Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Record Part Movement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Part</InputLabel>
                <Select
                  value={formData.part_id}
                  label="Part"
                  onChange={(e) => handleInputChange('part_id', e.target.value)}
                  disabled={partsLoading}
                >
                  {partsLoading ? (
                    <MenuItem disabled>Loading parts...</MenuItem>
                  ) : parts.length === 0 ? (
                    <MenuItem disabled>No parts available</MenuItem>
                  ) : (
                    parts.map((part) => (
                      <MenuItem key={part.part_id} value={part.part_id}>
                        {part.part_id} - {part.part_name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>From Station (Optional)</InputLabel>
                <Select
                  value={formData.from_station_id}
                  label="From Station (Optional)"
                  onChange={(e) => handleInputChange('from_station_id', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {sampleStations.map((station) => (
                    <MenuItem key={station.station_id} value={station.station_id}>
                      {station.station_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>To Station</InputLabel>
                <Select
                  value={formData.to_station_id}
                  label="To Station"
                  onChange={(e) => handleInputChange('to_station_id', e.target.value)}
                >
                  {sampleStations.map((station) => (
                    <MenuItem key={station.station_id} value={station.station_id}>
                      {station.station_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Movement Type</InputLabel>
                <Select
                  value={formData.movement_type}
                  label="Movement Type"
                  onChange={(e) => handleInputChange('movement_type', e.target.value)}
                >
                  {movementTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Operator (Optional)</InputLabel>
                <Select
                  value={formData.operator_id}
                  label="Operator (Optional)"
                  onChange={(e) => handleInputChange('operator_id', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {sampleOperators.map((operator) => (
                    <MenuItem key={operator.operator_id} value={operator.operator_id}>
                      {operator.operator_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading || !formData.part_id || !formData.to_station_id}
          >
            {loading ? 'Recording...' : 'Record Movement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Part History Dialog */}
      <PartHistory
        partId={historyDialog.partId}
        open={historyDialog.open}
        onClose={() => setHistoryDialog({ open: false, partId: '' })}
      />

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

export default MovementTracker; 