import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
  CircularProgress,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import mqttService from '../services/mqttService';

const OperatorsManager = () => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [operatorsLoading, setOperatorsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [freeTierDialog, setFreeTierDialog] = useState(false);

  useEffect(() => {
    // Subscribe to operators list results
    mqttService.subscribe('coreflux/factory01/traceability/operator/list/result', handleOperatorsList);
    
    // Monitor connection status and auto-reconnect
    const checkConnectionStatus = () => {
      const isReady = mqttService.isConnectionReady();
      const wasConnected = connectionStatus === 'connected';
      
      if (isReady && !wasConnected) {
        // Just connected
        setConnectionStatus('connected');
        console.log('🟢 Auto-connected to broker, loading operators...');
        loadOperators();
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
          loadOperators();
        }).catch(err => {
          console.log('⚠️ Initial connection failed, will retry...');
          setConnectionStatus('connecting');
        });
      } else {
        setConnectionStatus('connected');
        loadOperators();
      }
    };
    
    // Start initial connection
    initialConnect();
    
    // Cleanup interval on unmount
    return () => clearInterval(connectionInterval);
  }, [connectionStatus]);

  const loadOperators = () => {
    try {
      if (!mqttService.isConnectionReady()) {
        console.log('⚠️ MQTT not connected, retrying in 2 seconds...');
        setSnackbar({
          open: true,
          message: 'Connecting to broker... Please wait.',
          severity: 'info'
        });
        setTimeout(loadOperators, 2000);
        return;
      }
      
      setOperatorsLoading(true);
      console.log('👥 Requesting operators list from broker...');
      mqttService.listOperators();
    } catch (error) {
      console.error('Error loading operators:', error);
      setSnackbar({
        open: true,
        message: 'Error loading operators from broker',
        severity: 'error'
      });
      setOperatorsLoading(false);
    }
  };

  const handleOperatorsList = (data) => {
    console.log('👥 Received operators list:', data);
    
    // Handle the data format - it comes as an array
    if (Array.isArray(data)) {
      setOperators(data);
    } else if (Array.isArray(data) && data.length > 0) {
      setOperators(data[0]);
    } else {
      console.warn('Unexpected operators list format:', data);
      setOperators([]);
    }
    setOperatorsLoading(false);
  };

  const handleAddOperator = () => {
    setFreeTierDialog(true);
  };

  const handleEditOperator = () => {
    setFreeTierDialog(true);
  };

  const handleDeleteOperator = () => {
    setFreeTierDialog(true);
  };

  const statusColors = {
    'active': 'success',
    'inactive': 'error',
    'training': 'warning'
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Operators Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddOperator}
        >
          Add Operator
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6">Operators List</Typography>
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
                    onClick={loadOperators}
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
                          loadOperators();
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
                {operatorsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Operator ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operators.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No operators found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        operators.map((operator) => (
                          <TableRow key={operator.id}>
                            <TableCell>{operator.operator_id}</TableCell>
                            <TableCell>{operator.operator_name}</TableCell>
                            <TableCell>{operator.email}</TableCell>
                            <TableCell>{operator.department}</TableCell>
                            <TableCell>
                              <Chip
                                label={operator.status}
                                color={statusColors[operator.status] || 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(operator.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<EditIcon />}
                                  onClick={handleEditOperator}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  onClick={handleDeleteOperator}
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
              List all operators
            </Typography>
            <Typography component="li" variant="body2">
              View operator information
            </Typography>
            <Typography component="li" variant="body2">
              Monitor operator activities
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To add, edit, or delete operators, you need an Enterprise license.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Contact Coreflux to upgrade your license and unlock full operator management capabilities.
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

export default OperatorsManager; 