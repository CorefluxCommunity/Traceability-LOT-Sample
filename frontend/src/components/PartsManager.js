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
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import mqttService from '../services/mqttService';
import PartHistory from './PartHistory';

const PartsManager = () => {
  const [parts, setParts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [partsLoading, setPartsLoading] = useState(true);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState({ open: false, partId: '', currentStatus: '' });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, partId: '', partName: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const [historyDialog, setHistoryDialog] = useState({ open: false, partId: '' });

  const [formData, setFormData] = useState({
    part_id: '',
    part_name: '',
    part_type: '',
    manufacturer: ''
  });

  const partTypes = [
    'engine_component',
    'transmission_component',
    'electrical_component',
    'body_component',
    'interior_component',
    'safety_component'
  ];

  const statusColors = {
    'created': 'default',
    'in_production': 'warning',
    'quality_check': 'info',
    'completed': 'success',
    'defective': 'error'
  };

  useEffect(() => {
    // Subscribe to parts list results
    mqttService.subscribe('coreflux/factory01/traceability/part/list/result', handlePartsList);
    
    // Monitor connection status and auto-reconnect
    const checkConnectionStatus = () => {
      const isReady = mqttService.isConnectionReady();
      const wasConnected = connectionStatus === 'connected';
      
      if (isReady && !wasConnected) {
        // Just connected
        setConnectionStatus('connected');
        setRetryCount(0); // Reset retry count on successful connection
        console.log('🟢 Auto-connected to broker, loading parts...');
        loadParts();
      } else if (!isReady && wasConnected) {
        // Just disconnected
        setConnectionStatus('connecting');
        setRetryCount(prev => prev + 1);
        console.log('🔴 Connection lost, attempting auto-reconnect... (attempt ' + (retryCount + 1) + ')');
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
          loadParts();
        }).catch(err => {
          console.log('⚠️ Initial connection failed, will retry...');
          setConnectionStatus('connecting');
        });
      } else {
        setConnectionStatus('connected');
        loadParts();
      }
    };
    
    // Start initial connection
    initialConnect();
    
    // Cleanup interval on unmount
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
      console.log('📋 Requesting parts list from broker...');
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
    console.log('📋 Received parts list:', data);
    
    // Handle the data format - it comes as an array
    if (Array.isArray(data)) {
      setParts(data);
    } else if (Array.isArray(data) && data.length > 0) {
      setParts(data[0]);
    } else {
      console.warn('Unexpected parts list format:', data);
      setParts([]);
    }
    setPartsLoading(false);
  };

  const handleOpenDialog = (part = null) => {
    if (part) {
      setSelectedPart(part);
      setFormData({
        part_id: part.part_id,
        part_name: part.part_name,
        part_type: part.part_type,
        manufacturer: part.manufacturer
      });
    } else {
      setSelectedPart(null);
      setFormData({
        part_id: '',
        part_name: '',
        part_type: '',
        manufacturer: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPart(null);
    setFormData({
      part_id: '',
      part_name: '',
      part_type: '',
      manufacturer: ''
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
      
      if (selectedPart) {
        // Update part status (Free tier limitation - can only update status)
        mqttService.updatePartStatus(formData.part_id, 'in_production');
        setSnackbar({
          open: true,
          message: 'Part status updated successfully',
          severity: 'success'
        });
        
        // Refresh the parts list after 1 second
        setTimeout(() => {
          loadParts();
        }, 1000);
      } else {
        // Create new part
        mqttService.createPart(formData);
        setSnackbar({
          open: true,
          message: 'Part created successfully',
          severity: 'success'
        });
        
        // Refresh the parts list after 1 second
        setTimeout(() => {
          loadParts();
        }, 1000);
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error handling part:', error);
      setSnackbar({
        open: true,
        message: 'Error processing part operation',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (partId, newStatus) => {
    try {
      mqttService.updatePartStatus(partId, newStatus);
      
      setSnackbar({
        open: true,
        message: 'Part status updated successfully',
        severity: 'success'
      });
      
      // Refresh the parts list after 1 second
      setTimeout(() => {
        loadParts();
      }, 1000);
      
      setStatusUpdateDialog({ open: false, partId: '', currentStatus: '' });
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({
        open: true,
        message: 'Error updating part status',
        severity: 'error'
      });
    }
  };

  const handleDeletePart = (partId) => {
    try {
      mqttService.deletePart(partId);
      
      setSnackbar({
        open: true,
        message: 'Part deleted successfully',
        severity: 'success'
      });
      
      // Refresh the parts list after 1 second
      setTimeout(() => {
        loadParts();
      }, 1000);
      
      setDeleteConfirmDialog({ open: false, partId: '', partName: '' });
    } catch (error) {
      console.error('Error deleting part:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting part',
        severity: 'error'
      });
    }
  };

  const openStatusUpdateDialog = (partId, currentStatus) => {
    setStatusUpdateDialog({ open: true, partId, currentStatus });
  };

  const openDeleteConfirmDialog = (partId, partName) => {
    setDeleteConfirmDialog({ open: true, partId, partName });
  };

  const handleGetHistory = (partId) => {
    setHistoryDialog({ open: true, partId });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Parts Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Part
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6">Parts List</Typography>
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
                    onClick={loadParts}
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
                          loadParts();
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
                {partsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Part ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Manufacturer</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No parts found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        parts.map((part) => (
                          <TableRow key={part.id}>
                            <TableCell>{part.part_id}</TableCell>
                            <TableCell>{part.part_name}</TableCell>
                            <TableCell>{part.part_type}</TableCell>
                            <TableCell>{part.manufacturer}</TableCell>
                            <TableCell>
                              <Chip
                                label={part.status}
                                color={statusColors[part.status] || 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(part.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => openStatusUpdateDialog(part.part_id, part.status)}
                                >
                                  Status
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleGetHistory(part.part_id)}
                                >
                                  History
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => openDeleteConfirmDialog(part.part_id, part.part_name)}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedPart ? 'Edit Part' : 'Create New Part'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Part ID"
                value={formData.part_id}
                onChange={(e) => handleInputChange('part_id', e.target.value)}
                disabled={!!selectedPart}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Part Name"
                value={formData.part_name}
                onChange={(e) => handleInputChange('part_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Part Type</InputLabel>
                <Select
                  value={formData.part_type}
                  label="Part Type"
                  onChange={(e) => handleInputChange('part_type', e.target.value)}
                >
                  {partTypes.map((type) => (
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
                label="Manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
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
            disabled={loading || !formData.part_id || !formData.part_name || !formData.part_type || !formData.manufacturer}
          >
            {loading ? 'Processing...' : (selectedPart ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialog.open} onClose={() => setStatusUpdateDialog({ open: false, partId: '', currentStatus: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Update Part Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Current Status: <Chip label={statusUpdateDialog.currentStatus} color={statusColors[statusUpdateDialog.currentStatus] || 'default'} size="small" />
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={statusUpdateDialog.currentStatus}
              label="New Status"
              onChange={(e) => setStatusUpdateDialog(prev => ({ ...prev, currentStatus: e.target.value }))}
            >
              {Object.keys(statusColors).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateDialog({ open: false, partId: '', currentStatus: '' })}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={() => handleStatusUpdate(statusUpdateDialog.partId, statusUpdateDialog.currentStatus)}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onClose={() => setDeleteConfirmDialog({ open: false, partId: '', partName: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete the part:
          </Typography>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            {deleteConfirmDialog.partName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog({ open: false, partId: '', partName: '' })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={() => handleDeletePart(deleteConfirmDialog.partId)}
          >
            Delete Part
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

export default PartsManager; 