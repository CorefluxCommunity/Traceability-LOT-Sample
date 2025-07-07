import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import mqttService from '../services/mqttService';

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [testMessage, setTestMessage] = useState('');

  // Get broker info from environment or service
  const brokerHost = process.env.REACT_APP_MQTT_BROKER || 'localhost';
  const brokerPort = process.env.REACT_APP_MQTT_PORT || 5000;

  const testConnection = async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);
      
      console.log('Testing MQTT connection...');
      await mqttService.connect();
      
      setConnectionStatus('connected');
      setTestMessage('✅ MQTT connection successful!');
      
      // Test a simple publish
      setTimeout(() => {
        try {
          mqttService.getSystemStats();
          setTestMessage('✅ MQTT connection successful! System stats request sent.');
        } catch (err) {
          setTestMessage(`⚠️ Connected but publish failed: ${err.message}`);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Connection test failed:', err);
      setConnectionStatus('error');
      setError(err.message);
      setTestMessage(`❌ Connection failed: ${err.message}`);
    }
  };

  const disconnect = () => {
    mqttService.disconnect();
    setConnectionStatus('disconnected');
    setTestMessage('🔌 Disconnected from MQTT broker');
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          MQTT Connection Test
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Broker: {brokerHost}:{brokerPort}/mqtt (WebSocket)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {connectionStatus}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {testMessage && (
          <Alert severity={testMessage.includes('✅') ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {testMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={testConnection}
            disabled={connectionStatus === 'connecting'}
            startIcon={connectionStatus === 'connecting' ? <CircularProgress size={20} /> : null}
          >
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Test Connection'}
          </Button>
          
          {connectionStatus === 'connected' && (
            <Button
              variant="outlined"
              onClick={disconnect}
            >
              Disconnect
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ConnectionTest; 