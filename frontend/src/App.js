import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  Factory as FactoryIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

import Dashboard from './components/Dashboard';
import PartsManager from './components/PartsManager';
import StationsView from './components/StationsView';
import MovementTracker from './components/MovementTracker';
import OperatorsManager from './components/OperatorsManager';
import mqttService from './services/mqttService';

const drawerWidth = 240;

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const Navigation = ({ connectionStatus }) => {
  const location = useLocation();
  
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Parts Management', icon: <BuildIcon />, path: '/parts' },
    { text: 'Stations', icon: <FactoryIcon />, path: '/stations' },
    { text: 'Operators', icon: <PersonIcon />, path: '/operators' },
    { text: 'Movement Tracker', icon: <TimelineIcon />, path: '/movements' }
  ];

  return (
    <List>
      {menuItems.map((item) => (
        <ListItem
          button
          key={item.text}
          component={Link}
          to={item.path}
          selected={location.pathname === item.path}
          sx={{
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
            },
          }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItem>
      ))}
    </List>
  );
};

const AppContent = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 3000; // 3 seconds

    const connectToBroker = async () => {
      try {
        console.log(`Attempting to connect to MQTT broker (attempt ${retryCount + 1}/${maxRetries})`);
        await mqttService.connect();
        setConnectionStatus('connected');
        console.log('✅ MQTT connection established successfully');
      } catch (error) {
        console.error(`❌ Failed to connect to broker (attempt ${retryCount + 1}/${maxRetries}):`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in ${retryDelay/1000} seconds...`);
          setConnectionStatus('retrying');
          setTimeout(connectToBroker, retryDelay);
        } else {
          console.error('❌ Max retries reached. MQTT connection failed.');
          setConnectionStatus('error');
        }
      }
    };

    connectToBroker();

    return () => {
      mqttService.disconnect();
    };
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Traceability
        </Typography>
      </Toolbar>
      <Navigation connectionStatus={connectionStatus} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Traceability System
          </Typography>
          <Chip
            label={
              connectionStatus === 'connected' ? 'Connected' : 
              connectionStatus === 'retrying' ? 'Retrying...' : 
              'Disconnected'
            }
            color={
              connectionStatus === 'connected' ? 'success' : 
              connectionStatus === 'retrying' ? 'warning' : 
              'error'
            }
            size="small"
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parts" element={<PartsManager />} />
          <Route path="/stations" element={<StationsView />} />
          <Route path="/operators" element={<OperatorsManager />} />
          <Route path="/movements" element={<MovementTracker />} />
        </Routes>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App; 