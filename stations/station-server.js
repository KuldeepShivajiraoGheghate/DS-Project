const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { STATIONS, GATEWAY, BATTERY_STATUS } = require('../shared/constants');

function createStationServer(stationConfig) {
  const app = express();
  const PORT = stationConfig.port;
  const STATION_ID = stationConfig.id;
  const STATION_NAME = stationConfig.name;
  const DATA_FILE = path.join(__dirname, stationConfig.code, 'data', 'batteries.json');
  const BACKUP_FILE = path.join(__dirname, stationConfig.code, 'data', 'batteries.backup.json');

  const startTime = Date.now();

  app.use(cors());
  app.use(express.json());

  // Helper: Read local batteries
  function getBatteries() {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        return [];
      }
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[${STATION_ID}] Error reading local database:`, err.message);
      return [];
    }
  }

  // Helper: Save local batteries
  function saveBatteries(batteries) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Save backup on first write
      if (!fs.existsSync(BACKUP_FILE)) {
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(batteries, null, 2));
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(batteries, null, 2));
    } catch (err) {
      console.error(`[${STATION_ID}] Error saving local database:`, err.message);
    }
  }

  // Notify Gateway of an event (Fire-and-forget message)
  async function notifyGateway(eventType, payload) {
    try {
      await axios.post(`${GATEWAY.url}/api/station-event`, {
        stationId: STATION_ID,
        stationName: STATION_NAME,
        eventType,
        payload,
        timestamp: new Date().toISOString()
      }, { timeout: 1200 });
    } catch (err) {
      // Gateway might be restarting or unreachable, ignore gracefully (fault isolation)
    }
  }

  // --- HEALTH / STATUS ENDPOINT ---
  app.get('/health', (req, res) => {
    const batteries = getBatteries();
    const available = batteries.filter(b => b.status === BATTERY_STATUS.AVAILABLE).length;
    const charging = batteries.filter(b => b.status === BATTERY_STATUS.CHARGING).length;
    const reserved = batteries.filter(b => b.status === BATTERY_STATUS.RESERVED).length;
    const total = batteries.length;

    res.json({
      stationId: STATION_ID,
      name: STATION_NAME,
      port: PORT,
      status: 'ONLINE',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      stats: { total, available, charging, reserved },
      location: stationConfig.location
    });
  });

  // --- GET LOCAL BATTERIES ---
  app.get('/api/batteries', (req, res) => {
    const batteries = getBatteries();
    res.json({
      stationId: STATION_ID,
      stationName: STATION_NAME,
      count: batteries.length,
      batteries
    });
  });

  // --- LOCAL BATTERY RESERVATION ---
  app.post('/api/reserve', (req, res) => {
    const { batteryId, userId, vehicleId } = req.body;
    let batteries = getBatteries();

    let target = null;
    if (batteryId) {
      target = batteries.find(b => b.id === batteryId);
    } else {
      // Auto-assign highest charge available battery
      target = batteries
        .filter(b => b.status === BATTERY_STATUS.AVAILABLE)
        .sort((a, b) => b.charge - a.charge)[0];
    }

    if (!target) {
      return res.status(404).json({
        success: false,
        message: `No available battery at ${STATION_NAME}`
      });
    }

    if (target.status !== BATTERY_STATUS.AVAILABLE) {
      return res.status(400).json({
        success: false,
        message: `Battery ${target.id} is currently ${target.status}`
      });
    }

    target.status = BATTERY_STATUS.RESERVED;
    target.reservedBy = userId || 'EV-DRIVER-ANON';
    target.vehicleId = vehicleId || 'EV-VEHICLE-DEFAULT';
    target.reservedAt = new Date().toISOString();

    saveBatteries(batteries);
    notifyGateway('BATTERY_RESERVED', { battery: target });

    res.json({
      success: true,
      message: `Successfully reserved battery ${target.id} at ${STATION_NAME}`,
      battery: target
    });
  });

  // --- LOCAL BATTERY RELEASE / CANCEL RESERVATION ---
  app.post('/api/release', (req, res) => {
    const { batteryId } = req.body;
    let batteries = getBatteries();
    const target = batteries.find(b => b.id === batteryId);

    if (!target) {
      return res.status(404).json({ success: false, message: 'Battery not found' });
    }

    target.status = BATTERY_STATUS.AVAILABLE;
    target.reservedBy = null;
    target.vehicleId = null;
    target.reservedAt = null;

    saveBatteries(batteries);
    notifyGateway('BATTERY_RELEASED', { battery: target });

    res.json({
      success: true,
      message: `Battery ${target.id} released and is now AVAILABLE`,
      battery: target
    });
  });

  // --- SWAP BATTERY (Complete swap workflow) ---
  app.post('/api/swap', (req, res) => {
    const { reservedBatteryId, returnBatteryCharge = 15, userId, vehicleId } = req.body;
    let batteries = getBatteries();
    let chargedBattery = batteries.find(b => b.id === reservedBatteryId);

    if (!chargedBattery) {
      // Find any available if not specifically specified
      chargedBattery = batteries.find(b => b.status === BATTERY_STATUS.AVAILABLE);
    }

    if (!chargedBattery) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete swap: No valid battery found at ${STATION_NAME}`
      });
    }

    // 1. Assign charged battery to user (simulate departure)
    chargedBattery.status = BATTERY_STATUS.AVAILABLE; // Or keep in pool after reset/dispense
    chargedBattery.reservedBy = null;
    chargedBattery.cycles = (chargedBattery.cycles || 100) + 1;

    const letter = stationConfig.code.includes('a') ? 'A' : stationConfig.code.includes('b') ? 'B' : 'C';
    const depletedId = `BAT-${letter}${Math.floor(10 + Math.random() * 90)}`;
    const depletedBattery = {
      id: depletedId,
      type: chargedBattery.type,
      charge: Number(returnBatteryCharge) || 18,
      health: Math.floor(92 + Math.random() * 7),
      status: BATTERY_STATUS.CHARGING,
      stationId: STATION_ID,
      reservedBy: null,
      temperature: '35°C',
      cycles: (chargedBattery.cycles || 100) + 1
    };

    // Keep station pool fixed or update
    const targetIdx = batteries.findIndex(b => b.id === chargedBattery.id);
    if (targetIdx !== -1) {
      // Replace with incoming charging pack for realistic station loop
      batteries[targetIdx] = depletedBattery;
    } else {
      batteries.push(depletedBattery);
    }

    saveBatteries(batteries);
    notifyGateway('BATTERY_SWAPPED', {
      dispensedBatteryId: chargedBattery.id,
      receivedBattery: depletedBattery,
      userId: userId || 'EV-DRIVER-MEMBER',
      vehicleId: vehicleId || 'EV-TSLA-992'
    });

    res.json({
      success: true,
      message: `Swap complete! Dispensed ${chargedBattery.id} (${chargedBattery.charge}%), plugged in depleted pack ${depletedId} (${depletedBattery.charge}%) into charging bay.`,
      dispensed: chargedBattery,
      docked: depletedBattery
    });
  });

  // ==========================================
  // RPC PROTOCOL: INTER-STATION COMMUNICATION
  // ==========================================

  // RPC Endpoint: Called by PEER stations to query availability
  app.post('/api/rpc/query-available', (req, res) => {
    const { requesterStationId, batteryType } = req.body;
    const batteries = getBatteries();
    
    let availableBatteries = batteries.filter(b => b.status === BATTERY_STATUS.AVAILABLE && b.charge >= 70);
    if (batteryType) {
      availableBatteries = availableBatteries.filter(b => b.type === batteryType);
    }

    // Log RPC receipt
    notifyGateway('RPC_CALL_RECEIVED', {
      from: requesterStationId,
      to: STATION_ID,
      rpcMethod: 'query_available',
      availableCount: availableBatteries.length
    });

    res.json({
      stationId: STATION_ID,
      stationName: STATION_NAME,
      availableCount: availableBatteries.length,
      batteries: availableBatteries,
      timestamp: new Date().toISOString()
    });
  });

  // RPC Endpoint: Called by PEER stations to forward-reserve a battery
  app.post('/api/rpc/reserve-forward', (req, res) => {
    const { requesterStationId, userId, vehicleId, batteryType } = req.body;
    let batteries = getBatteries();

    let candidate = batteries
      .filter(b => b.status === BATTERY_STATUS.AVAILABLE && b.charge >= 70)
      .sort((a, b) => b.charge - a.charge)[0];

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: `RPC Forward Reservation Failed: No available battery at ${STATION_NAME}`
      });
    }

    candidate.status = BATTERY_STATUS.RESERVED;
    candidate.reservedBy = userId || `FORWARDED_FROM_${requesterStationId}`;
    candidate.vehicleId = vehicleId || 'EV-REMOTE-ROUTED';
    candidate.reservedAt = new Date().toISOString();

    saveBatteries(batteries);
    notifyGateway('RPC_RESERVATION_EXECUTED', {
      from: requesterStationId,
      to: STATION_ID,
      batteryId: candidate.id,
      userId
    });

    res.json({
      success: true,
      message: `RPC Forward: Reserved ${candidate.id} at ${STATION_NAME} on behalf of ${requesterStationId}`,
      battery: candidate,
      stationId: STATION_ID,
      stationName: STATION_NAME
    });
  });

  // Local Station Method: Broadcasts RPC queries to other peer nodes
  app.post('/api/inter-station/find-alternatives', async (req, res) => {
    const { batteryType } = req.body;
    const { DISTANCE_MATRIX } = require('../shared/constants');
    const distances = (DISTANCE_MATRIX && DISTANCE_MATRIX[STATION_ID]) || {};
    const peerStations = STATIONS
      .filter(s => s.id !== STATION_ID)
      .sort((a, b) => (distances[a.id] || 99) - (distances[b.id] || 99));

    const rpcResults = [];

    for (const peer of peerStations) {
      try {
        const startT = Date.now();
        const response = await axios.post(`${peer.url}/api/rpc/query-available`, {
          requesterStationId: STATION_ID,
          batteryType
        }, { timeout: 1500 });

        const latency = Date.now() - startT;
        rpcResults.push({
          peerId: peer.id,
          peerName: peer.name,
          peerUrl: peer.url,
          status: 'ONLINE',
          latencyMs: latency,
          availableCount: response.data.availableCount,
          batteries: response.data.batteries
        });

        notifyGateway('RPC_PACKET_SENT', {
          from: STATION_ID,
          to: peer.id,
          method: 'query_available',
          latencyMs: latency,
          responseCount: response.data.availableCount
        });
      } catch (err) {
        // Peer node failure detection (Fault tolerance demonstration)
        rpcResults.push({
          peerId: peer.id,
          peerName: peer.name,
          peerUrl: peer.url,
          status: 'OFFLINE',
          error: err.message,
          availableCount: 0,
          batteries: []
        });

        notifyGateway('RPC_PACKET_DROPPED', {
          from: STATION_ID,
          to: peer.id,
          method: 'query_available',
          error: 'Peer unreachable / node offline'
        });
      }
    }

    res.json({
      localStation: STATION_ID,
      peersQueried: peerStations.length,
      results: rpcResults
    });
  });

  // --- CHAOS / TEST HELPERS ---
  // Drain all available batteries to simulate 0-battery condition
  app.post('/api/chaos/drain', (req, res) => {
    let batteries = getBatteries();
    batteries.forEach(b => {
      if (b.status === BATTERY_STATUS.AVAILABLE) {
        b.status = BATTERY_STATUS.CHARGING;
        b.charge = 15;
      }
    });
    saveBatteries(batteries);
    notifyGateway('STATION_DRAINED', { stationId: STATION_ID });
    res.json({ success: true, message: `All available batteries drained at ${STATION_NAME}` });
  });

  // Reset batteries to initial backup state
  app.post('/api/chaos/reset', (req, res) => {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const backupData = fs.readFileSync(BACKUP_FILE, 'utf-8');
        fs.writeFileSync(DATA_FILE, backupData);
      }
      notifyGateway('STATION_RESET', { stationId: STATION_ID });
      res.json({ success: true, message: `Station ${STATION_NAME} reset to default state` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Background trickle charger: Slowly recharges CHARGING batteries
  setInterval(() => {
    let batteries = getBatteries();
    let updated = false;

    batteries.forEach(b => {
      if (b.status === BATTERY_STATUS.CHARGING) {
        if (b.charge < 100) {
          b.charge = Math.min(100, b.charge + 2);
          updated = true;
          if (b.charge >= 95) {
            b.status = BATTERY_STATUS.AVAILABLE;
          }
        }
      }
    });

    if (updated) {
      saveBatteries(batteries);
    }
  }, 10000);

  return app;
}

module.exports = { createStationServer };
