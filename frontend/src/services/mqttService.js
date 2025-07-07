import mqtt from 'mqtt';

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.brokerHost = process.env.REACT_APP_MQTT_BROKER || 'localhost';
    this.brokerPort = process.env.REACT_APP_MQTT_PORT || 5000;
  }

  connect() {
    return new Promise((resolve, reject) => {
      // Try different connection URLs
      const urls = [
        `ws://${this.brokerHost}:${this.brokerPort}/mqtt`,
        `ws://${this.brokerHost}:${this.brokerPort}`,
        `mqtt://${this.brokerHost}:${this.brokerPort}`
      ];
      
      let currentUrlIndex = 0;
      const tryConnect = () => {
        const url = urls[currentUrlIndex];
        console.log(`Attempting to connect to MQTT broker at: ${url} (attempt ${currentUrlIndex + 1}/${urls.length})`);
        
        this.client = mqtt.connect(url, {
          clientId: `traceability-frontend-${Math.random().toString(16).slice(3)}`,
          clean: true,
          connectTimeout: 10000,
          reconnectPeriod: 2000,
          keepalive: 60,
          rejectUnauthorized: false,
          protocol: url.startsWith('ws') ? 'ws' : 'mqtt'
        });

        this.client.on('connect', () => {
          console.log(`✅ Connected to Coreflux Broker successfully using: ${url}`);
          this.isConnected = true;
          this.subscribeToResults();
          resolve();
        });

        this.client.on('error', (error) => {
          console.error(`❌ MQTT Connection error with ${url}:`, error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            errno: error.errno
          });
          
          // Try next URL if available
          currentUrlIndex++;
          if (currentUrlIndex < urls.length) {
            console.log(`🔄 Trying next connection method...`);
            setTimeout(tryConnect, 1000);
          } else {
            this.isConnected = false;
            reject(new Error(`Failed to connect with all methods. Last error: ${error.message}`));
          }
        });

        this.client.on('close', () => {
          console.log('🔌 MQTT Connection closed');
          this.isConnected = false;
        });

        this.client.on('reconnect', () => {
          console.log('🔄 MQTT Reconnecting...');
          this.isConnected = false;
        });

        this.client.on('offline', () => {
          console.log('📴 MQTT Connection offline');
          this.isConnected = false;
        });

        this.client.on('message', (topic, message) => {
          console.log('MQTT DEBUG:', topic, message.toString());
          this.handleMessage(topic, message);
        });
      };
      
      tryConnect();
    });
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }

  isConnectionReady() {
    return this.isConnected && this.client && this.client.connected && this.client.connected === true;
  }

  forceReconnect() {
    console.log('🔄 Force reconnecting to MQTT broker...');
    this.disconnect();
    return this.connect();
  }

  subscribeToResults() {
    // Subscribe to result topics for the Free tier route
    const resultTopics = [
      'coreflux/factory01/traceability/movement/list/result',
      'coreflux/factory01/traceability/part/history/result',
      'coreflux/factory01/traceability/station/activity/result',
      'coreflux/factory01/traceability/system/stats/result',
      'coreflux/factory01/traceability/part/list/result',
      'coreflux/factory01/traceability/station/list/result',
      'coreflux/factory01/traceability/station/info',
      'coreflux/factory01/traceability/operator/list/result'
    ];

    resultTopics.forEach(topic => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Error subscribing to ${topic}:`, err);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Received message on ${topic}:`, data);
      
      // Notify subscribers
      if (this.subscribers.has(topic)) {
        this.subscribers.get(topic).forEach(callback => callback(data));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push(callback);
  }

  unsubscribe(topic, callback) {
    if (this.subscribers.has(topic)) {
      const callbacks = this.subscribers.get(topic);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Free tier route commands
  createPart(partData) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/part/create';
    const payload = JSON.stringify(partData);
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing create part:', err);
      } else {
        console.log('Published create part:', partData);
      }
    });
  }

  listParts() {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/part/list';
    const payload = JSON.stringify({});
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing list parts:', err);
      } else {
        console.log('Published list parts request');
      }
    });
  }

  updatePartStatus(partId, status) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/part/updatestatus';
    const payload = JSON.stringify({ part_id: partId, status });
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing update part status:', err);
      } else {
        console.log('Published update part status:', { part_id: partId, status });
      }
    });
  }

  deletePart(partId) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/part/delete';
    const payload = JSON.stringify({ part_id: partId });
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing delete part:', err);
      } else {
        console.log('Published delete part:', { part_id: partId });
      }
    });
  }

  recordPartMovement(movementData) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/movement/record';
    const payload = JSON.stringify(movementData);
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing record movement:', err);
      } else {
        console.log('Published record movement:', movementData);
      }
    });
  }

  getPartHistory(partId) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/part/history';
    const payload = JSON.stringify({ part_id: partId });
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing get part history:', err);
      } else {
        console.log('Published get part history:', { part_id: partId });
      }
    });
  }

  createStation(stationData) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/station/create';
    const payload = JSON.stringify(stationData);
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing create station:', err);
      } else {
        console.log('Published create station:', stationData);
      }
    });
  }

  createOperator(operatorData) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/operator/create';
    const payload = JSON.stringify(operatorData);
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing create operator:', err);
      } else {
        console.log('Published create operator:', operatorData);
      }
    });
  }

  getStationActivity(stationId, timePeriod = '24 hours') {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/station/activity';
    const payload = JSON.stringify({ 
      station_id: stationId, 
      time_period: timePeriod 
    });
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing get station activity:', err);
      } else {
        console.log('Published get station activity:', { station_id: stationId, time_period: timePeriod });
      }
    });
  }

  getSystemStats() {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/system/stats';
    const payload = JSON.stringify({});
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing get system stats:', err);
      } else {
        console.log('Published get system stats');
      }
    });
  }

  // Station Management
  listStations() {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/station/list';
    const payload = JSON.stringify({});
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing list stations:', err);
      } else {
        console.log('Published list stations request');
      }
    });
  }

  getStationInfo(stationId) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/station/get';
    const payload = JSON.stringify({ station_id: stationId });
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing get station info:', err);
      } else {
        console.log('Published get station info:', { station_id: stationId });
      }
    });
  }

  // Verification
  verifyPartAtStation(partId, stationId) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/verification/check';
    const payload = JSON.stringify({ 
      part_id: partId, 
      station_id: stationId 
    });
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing verify part at station:', err);
      } else {
        console.log('Published verify part at station:', { part_id: partId, station_id: stationId });
      }
    });
  }

  getPartsAtStation(stationId) {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/station/parts';
    const payload = JSON.stringify({ station_id: stationId });
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing get parts at station:', err);
      } else {
        console.log('Published get parts at station:', { station_id: stationId });
      }
    });
  }

  // Operator Management
  listOperators() {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    
    const topic = 'coreflux/factory01/traceability/operator/list';
    const payload = JSON.stringify({});
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing list operators:', err);
      } else {
        console.log('Published list operators request');
      }
    });
  }

  // List all part movements
  listMovements() {
    if (!this.isConnected) {
      throw new Error('MQTT not connected');
    }
    const topic = 'coreflux/factory01/traceability/movement/list';
    const payload = JSON.stringify({});
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error('Error publishing list movements:', err);
      } else {
        console.log('Published list movements request');
      }
    });
  }
}

// Create singleton instance
const mqttService = new MQTTService();
export default mqttService; 