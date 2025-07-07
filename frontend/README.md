# Traceability System Frontend

A React-based frontend application for the Traceability System that connects to the Coreflux Broker and provides a user interface for managing parts, stations, and tracking movements.

## Features

- **Dashboard**: System overview with real-time statistics
- **Parts Management**: Create, view, and update parts
- **Stations View**: Monitor stations and their activity
- **Movement Tracker**: Record and track part movements between stations
- **Real-time MQTT Communication**: Connects to Coreflux Broker for live data

## Free Tier Route Support

This frontend is designed to work with the **Free tier route** (`TraceabilityFree`) and supports all 8 core events:

1. **CreatePart** - Create new parts
2. **UpdatePartStatus** - Update part status
3. **RecordPartMovement** - Record part movements
4. **GetPartHistory** - Retrieve part movement history
5. **CreateStation** - Create new stations
6. **CreateOperator** - Create new operators
7. **GetStationActivity** - Get station activity
8. **GetSystemStats** - Get system statistics

## Quick Start

### Using Docker Compose (Recommended)

1. Make sure you're in the root directory of the project
2. Start all services including the frontend:

```bash
docker-compose -f docker-compose-traceability.yml up -d
```

3. Access the frontend at: http://localhost:3000

### Manual Development Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. The app will open at http://localhost:3000

## Configuration

The frontend automatically connects to the Coreflux Broker using the Docker service name `traceability-coreflux`. If you need to change the connection settings, you can modify the `mqttService.js` file:

```javascript
this.brokerHost = 'traceability-coreflux'; // Docker service name
this.brokerPort = 1883;
```

## MQTT Topics Used

The frontend publishes to and subscribes to the following MQTT topics:

### Publishing Topics (Free Tier)
- `coreflux/factory01/traceability/part/create` - Create parts
- `coreflux/factory01/traceability/part/updatestatus` - Update part status
- `coreflux/factory01/traceability/movement/record` - Record movements
- `coreflux/factory01/traceability/part/history` - Request part history
- `coreflux/factory01/traceability/station/create` - Create stations
- `coreflux/factory01/traceability/operator/create` - Create operators
- `coreflux/factory01/traceability/station/activity` - Request station activity
- `coreflux/factory01/traceability/system/stats` - Request system stats

### Subscribing Topics (Results)
- `coreflux/factory01/traceability/part/history/result` - Part history results
- `coreflux/factory01/traceability/station/activity/result` - Station activity results
- `coreflux/factory01/traceability/system/stats/result` - System stats results

## Components

### Dashboard
- System overview with key metrics
- Connection status indicator
- Quick action buttons

### Parts Manager
- Create new parts with type and manufacturer
- View parts list with status indicators
- Update part status
- View part history

### Stations View
- Create new stations
- View station list with activity
- Monitor station activity
- Record movements from stations

### Movement Tracker
- Record part movements between stations
- View movement history
- Timeline view of part journeys
- Support for different movement types

## UI Features

- **Material-UI Design**: Modern, responsive interface
- **Real-time Updates**: Live data from MQTT broker
- **Mobile Responsive**: Works on desktop and mobile devices
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during operations

## Development

### Project Structure
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Dashboard.js
│   │   ├── PartsManager.js
│   │   ├── StationsView.js
│   │   └── MovementTracker.js
│   ├── services/
│   │   └── mqttService.js
│   ├── App.js
│   └── index.js
├── Dockerfile
├── package.json
└── README.md
```

### Adding New Features

1. **New MQTT Commands**: Add methods to `mqttService.js`
2. **New Components**: Create in `src/components/`
3. **New Routes**: Add to `App.js` routing

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Troubleshooting

### Connection Issues
- Ensure the Coreflux Broker is running
- Check that the broker host name is correct
- Verify MQTT port is accessible

### MQTT Communication
- Check browser console for MQTT errors
- Verify topic names match the route configuration
- Ensure proper JSON payload format

### Docker Issues
- Check container logs: `docker logs traceability-frontend`
- Verify network connectivity between containers
- Ensure all required services are running

## Dependencies

- **React 18**: UI framework
- **Material-UI**: Component library
- **MQTT.js**: MQTT client
- **React Router**: Navigation
- **Emotion**: CSS-in-JS styling

## License

This project is part of the Traceability System and follows the same license terms. 