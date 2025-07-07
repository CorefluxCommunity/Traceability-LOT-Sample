import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Factory as FactoryIcon,
  Build as BuildIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import mqttService from '../services/mqttService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const Dashboard = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [stationActivity, setStationActivity] = useState({});
  const [movementList, setMovementList] = useState([]);
  const [stationList, setStationList] = useState([]);

  useEffect(() => {
    const connectToBroker = async () => {
      try {
        setLoading(true);
        await mqttService.connect();
        setConnectionStatus('connected');
        // Subscribe to all result topics BEFORE requesting data
        mqttService.subscribe('coreflux/factory01/traceability/system/stats/result', handleSystemStats);
        mqttService.subscribe('coreflux/factory01/traceability/part/history/result', handleRecentMovements);
        mqttService.subscribe('coreflux/factory01/traceability/station/activity/result', handleStationActivity);
        mqttService.subscribe('coreflux/factory01/traceability/movement/list/result', handleMovementList);
        mqttService.subscribe('coreflux/factory01/traceability/station/list/result', handleStationList);
        // Now request data
        mqttService.getSystemStats();
        mqttService.getPartHistory();
        mqttService.getStationActivity();
        mqttService.listMovements();
      } catch (err) {
        console.error('Failed to connect to broker:', err);
        setConnectionStatus('error');
        setError('Failed to connect to Coreflux Broker');
      } finally {
        setLoading(false);
      }
    };

    connectToBroker();

    return () => {
      mqttService.disconnect();
    };
  }, []);

  // Set up automatic polling every 15 seconds
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        mqttService.getSystemStats();
        mqttService.getPartHistory();
        mqttService.getStationActivity();
      }, 15000); // 15 seconds

      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  const handleSystemStats = (data) => {
    console.log('📊 Received system stats:', data);
    
    // Handle the data format - it comes as an array with one object
    if (Array.isArray(data) && data.length > 0) {
      setSystemStats(data[0]);
      setLastUpdate(new Date());
    } else if (typeof data === 'object') {
      setSystemStats(data);
      setLastUpdate(new Date());
    } else {
      console.warn('Unexpected system stats format:', data);
    }
  };

  const handleRecentMovements = (data) => {
    console.log('📋 Received recent movements:', data);
    // No setRecentMovements here, recentMovements is derived from movementList
  };

  const handleStationActivity = (data) => {
    console.log('🏭 Received station activity:', data);
    if (Array.isArray(data)) {
      setStationActivity(prev => ({
        ...prev,
        recent: data.slice(0, 10) // Keep last 10 activities
      }));
    }
  };

  const handleMovementList = (data) => {
    console.log('📦 Received movement list:', data);
    if (Array.isArray(data)) {
      setMovementList(data);
    } else {
      setMovementList([]);
    }
  };

  const handleStationList = (data) => {
    if (Array.isArray(data)) {
      setStationList(data);
    }
  };

  const refreshStats = () => {
    mqttService.getSystemStats();
    mqttService.getPartHistory();
    mqttService.getStationActivity();
  };

  // Prepare chart data
  const movementTypeCounts = movementList.reduce((acc, m) => {
    acc[m.movement_type] = (acc[m.movement_type] || 0) + 1;
    return acc;
  }, {});
  const movementTypeChartData = Object.entries(movementTypeCounts).map(([type, count]) => ({ type, count }));

  const operatorCounts = movementList.reduce((acc, m) => {
    acc[m.operator_id] = (acc[m.operator_id] || 0) + 1;
    return acc;
  }, {});
  const operatorChartData = Object.entries(operatorCounts).map(([operator, count]) => ({ operator, count }));

  // For Recent Part Movements, use the 5 most recent by timestamp
  const recentMovements = [...movementList].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  console.log('🕒 Recent movements for dashboard:', recentMovements);
  console.log('📊 Chart data:', movementTypeChartData, operatorChartData);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Traceability System Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {connectionStatus === 'connected' && (
            <Chip
              label="Auto-refresh: 15s"
              color="info"
              size="small"
              variant="outlined"
            />
          )}
          <Chip
            label={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
            color={connectionStatus === 'connected' ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* System Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BuildIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Parts</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {systemStats?.total_parts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FactoryIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Stations</Typography>
              </Box>
              <Typography variant="h4" color="secondary">
                {systemStats?.total_stations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Operators</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {systemStats?.total_operators || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TimelineIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Movements (24h)</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {systemStats?.movements_24h || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {systemStats?.movements_24h || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Movements (24h)
                    </Typography>
                    <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                      <TrendingUpIcon color="success" fontSize="small" />
                      <Typography variant="caption" color="success.main" ml={0.5}>
                        Active
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary">
                      {systemStats?.total_stations || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Stations
                    </Typography>
                    <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="caption" color="success.main" ml={0.5}>
                        Operational
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                System Health
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">MQTT Connection</Typography>
                  <Chip
                    size="small"
                    label={connectionStatus === 'connected' ? 'Healthy' : 'Issues'}
                    color={connectionStatus === 'connected' ? 'success' : 'error'}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={connectionStatus === 'connected' ? 100 : 0}
                  color={connectionStatus === 'connected' ? 'success' : 'error'}
                />
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Data Freshness</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {lastUpdate ? `${Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago` : 'Never'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={lastUpdate ? Math.max(0, 100 - (Date.now() - lastUpdate.getTime()) / 150) : 0}
                  color={lastUpdate && (Date.now() - lastUpdate.getTime()) < 30000 ? 'success' : 'warning'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Movements by Type
              </Typography>
              {movementTypeChartData.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No movement data available.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={movementTypeChartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#1976d2" name="Movements" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Movements by Operator
              </Typography>
              {operatorChartData.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No movement data available.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={operatorChartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="operator" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#43a047" name="Movements" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Part Movements
              </Typography>
              {recentMovements.length > 0 ? (
                <List dense>
                  {recentMovements.map((movement, index) => (
                    <ListItem key={movement.id || index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Part ${movement.part_id} → ${movement.to_station_id}`}
                        secondary={`${movement.operator_id} • ${new Date(movement.timestamp).toLocaleTimeString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No recent movements
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Station Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FactoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Station Activity
              </Typography>
              {stationActivity.recent && stationActivity.recent.length > 0 ? (
                <List dense>
                  {stationActivity.recent.slice(0, 5).map((activity, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <ScheduleIcon color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Station ${activity.station_id}`}
                        secondary={`${activity.operator_name} • ${new Date(activity.timestamp).toLocaleTimeString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No recent station activity
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  href="/parts"
                >
                  Manage Parts
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  href="/stations"
                >
                  View Stations
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  href="/operators"
                >
                  Manage Operators
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  href="/movements"
                >
                  Track Movements
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Chip
                      size="small"
                      label="MQTT Broker"
                      color={connectionStatus === 'connected' ? 'success' : 'error'}
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Chip
                      size="small"
                      label="Database"
                      color="success"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2">
                      PostgreSQL Active
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 