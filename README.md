# 📘 README

## 🏭 Traceability System with Coreflux + PostgreSQL

Real-time manufacturing traceability using MQTT and SQL with a modular, low-code route engine.

## ✨ Features

* ✅ Track part movement from assembly to shipping
* ✅ Monitor station and operator activity
* ✅ Unified Namespace (UNS)-based MQTT structure
* ✅ LOT-powered SQL route engine
* ✅ Runs on Community/Free Coreflux MQTT Broker (12 actions) 
* 💳 Expand this project using the Enterprise Coreflux MQTT Broker (full) route modes

## 🚀 Quick Start

1. Install [LoT Notebooks extension](https://marketplace.visualstudio.com/items?itemName=Coreflux.vscode-lot-notebooks) in VS Code
2. Open the TRACEABILITY_SYSTEM.lotnb
3. Go to the bash segment and run it.
``` bash
# Start all services
docker-compose -f docker-compose-traceability.yml up -d

# Check service status
docker-compose -f docker-compose-traceability.yml ps
```
4. Connect to your MQTT broker:
   - **Host**: `localhist:1883`
   - **Username**: `root`
   - **Password**: `coreflux`
   - **TLS**: `No`

5. Upload the LOT Route and go to the frontend.


![alt text](./img/connect&download.gif)



### Access Services

* Broker: [mqtt://localhost:1883](mqtt://localhost:1883)
* Frontend App: [http://localhost:3000](http://localhost:3000)
* pgAdmin: [http://localhost:5050](http://localhost:5050) ([admin@traceability.com](mailto:admin@traceability.com) / admin123)

## 📡 MQTT Topics (UNS)

```
coreflux/{site}/{area}/traceability/{entity}/{action}
```

Example:

```
coreflux/factory01/production/traceability/part/create
```

## 📄 LOT Route (Free Edition)


---
```lot
DEFINE ROUTE TraceabilityFree WITH TYPE POSTGRESQL
    ADD SQL_CONFIG
        WITH SERVER "traceability-postgres"
        WITH PORT 5432
        WITH DATABASE "traceability"
        WITH USERNAME "traceuser"
        WITH PASSWORD "tracepass123"
        WITH USE_SSL FALSE
        WITH TRUST_SERVER_CERTIFICATE FALSE
    ADD EVENT CreatePart
        WITH QUERY "INSERT INTO parts (part_id, part_name, part_type, manufacturer, created_at, status) VALUES ('{payload.json.part_id}', '{payload.json.part_name}', '{payload.json.part_type}', '{payload.json.manufacturer}', NOW(), 'created') RETURNING *"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/part/create" 
    ADD EVENT SelectParts
        WITH QUERY "SELECT * FROM parts"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/part/list"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/part/list/result"
    ADD EVENT DeletePart
        WITH QUERY "DELETE FROM parts WHERE part_id = '{payload.json.part_id}' RETURNING *"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/part/delete"
    ADD EVENT UpdatePartStatus
        WITH QUERY "UPDATE parts SET status = '{payload.json.status}', updated_at = NOW() WHERE part_id = '{payload.json.part_id}' RETURNING *"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/part/updatestatus"
    ADD EVENT ListAllStations
        WITH QUERY "SELECT * FROM stations ORDER BY station_name"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/station/list"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/station/list/result"
    ADD EVENT GetStationInfo
        WITH QUERY "SELECT * FROM stations WHERE station_id = '{payload.json.station_id}'"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/station/get"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/station/info"
    ADD EVENT RecordPartMovement
        WITH QUERY "INSERT INTO part_movements (part_id, from_station_id, to_station_id, movement_type, operator_id, notes, timestamp) VALUES ('{payload.json.part_id}', '{payload.json.from_station_id}', '{payload.json.to_station_id}', '{payload.json.movement_type}', '{payload.json.operator_id}', '{payload.json.notes}', NOW()) RETURNING *"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/movement/record"
    ADD EVENT GetPartHistory
        WITH QUERY "SELECT * FROM part_movements WHERE part_id = '{payload.json.part_id}' ORDER BY timestamp DESC LIMIT 50"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/part/history"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/part/history/result"
    ADD EVENT ListAllOperators
        WITH QUERY "SELECT * FROM operators ORDER BY operator_name"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/operator/list"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/operator/list/result"
    ADD EVENT GetStationActivity
        WITH QUERY "SELECT * FROM part_movements WHERE to_station_id = '{payload.json.station_id}' AND timestamp >= NOW() - INTERVAL '24 hours'"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/station/activity"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/station/activity/result"
    ADD EVENT ShowPartMovement
        WITH QUERY "SELECT * FROM part_movements"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/movement/list"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/movement/list/result"
    ADD EVENT GetSystemStats
        WITH QUERY "SELECT (SELECT COUNT(*) FROM parts) as total_parts, (SELECT COUNT(*) FROM stations) as total_stations, (SELECT COUNT(*) FROM operators) as total_operators,(SELECT COUNT(*) FROM part_movements WHERE timestamp >= NOW() - INTERVAL '24 hours') as movements_24h"
        WITH SOURCE_TOPIC "coreflux/factory01/traceability/system/stats"
        WITH DESTINATION_TOPIC "coreflux/factory01/traceability/system/stats/result"
```

---



