const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const axios = require('axios');
const path = require('path');
const { fork } = require('child_process');
const { STATIONS, GATEWAY, DISTANCE_MATRIX } = require('../shared/constants');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory Network State Registry
const networkState = {
  stations: STATIONS.map(s => ({
    ...s,
    status: 'OFFLINE',
    uptimeSeconds: 0,
    latencyMs: null,
    stats: { total: 0, available: 0, charging: 0, reserved: 0 },
    lastSeen: null
  })),
  eventLogs: []
};

// Map to track child processes if managed via Gateway Chaos Manager
const managedProcesses = new Map();

function logEvent(type, payload, source = 'GATEWAY') {
  const logEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type,
    source,
    payload
  };

  networkState.eventLogs.unshift(logEntry);
  if (networkState.eventLogs.length > 100) {
    networkState.eventLogs.pop();
  }

  // Broadcast to all connected WebSockets
  io.emit('event_log', logEntry);
}

// -------------------------------------------------------------
// 1. HEALTH CHECK & FAILURE DETECTOR (POLLED CONTINUOUSLY)
// -------------------------------------------------------------
async function pollStationHealth() {
  for (const station of STATIONS) {
    const stationState = networkState.stations.find(s => s.id === station.id);
    const prevStatus = stationState.status;
    const startT = Date.now();

    try {
      const response = await axios.get(`${station.url}/health`, { timeout: 1500 });
      const latency = Date.now() - startT;

      stationState.status = 'ONLINE';
      stationState.latencyMs = latency;
      stationState.uptimeSeconds = response.data.uptimeSeconds;
      stationState.stats = response.data.stats || stationState.stats;
      stationState.lastSeen = new Date().toISOString();

      if (prevStatus === 'OFFLINE') {
        console.log(`🟢 [NODE RECOVERED] ${station.name} (${station.id}) is now ONLINE (${latency}ms)`);
        logEvent('NODE_ONLINE', {
          stationId: station.id,
          name: station.name,
          latencyMs: latency
        }, 'FAILURE_DETECTOR');
        io.emit('node_status_change', { stationId: station.id, status: 'ONLINE', latencyMs: latency });
      }
    } catch (err) {
      stationState.status = 'OFFLINE';
      stationState.latencyMs = null;

      if (prevStatus === 'ONLINE') {
        console.log(`🔴 [NODE FAILURE DETECTED] ${station.name} (${station.id}) went OFFLINE! Error: ${err.message}`);
        logEvent('NODE_OFFLINE', {
          stationId: station.id,
          name: station.name,
          error: err.code || err.message
        }, 'FAILURE_DETECTOR');
        io.emit('node_status_change', { stationId: station.id, status: 'OFFLINE', error: err.message });
      }
    }
  }

  // Periodic status broadcast
  io.emit('network_status', networkState.stations);
}

setInterval(pollStationHealth, 2000);

// -------------------------------------------------------------
// 2. REST API ENDPOINTS
// -------------------------------------------------------------

// Snapshot of network status
app.get('/api/network/status', (req, res) => {
  res.json({
    gatewayPort: GATEWAY.port,
    timestamp: new Date().toISOString(),
    stations: networkState.stations,
    onlineCount: networkState.stations.filter(s => s.status === 'ONLINE').length,
    totalStations: networkState.stations.length
  });
});

// Aggregated fleet inventory from all active nodes
app.get('/api/network/batteries', async (req, res) => {
  const results = [];

  for (const station of networkState.stations) {
    if (station.status === 'ONLINE') {
      try {
        const resp = await axios.get(`${station.url}/api/batteries`, { timeout: 1500 });
        results.push({
          stationId: station.id,
          stationName: station.name,
          status: 'ONLINE',
          batteries: resp.data.batteries
        });
      } catch (err) {
        results.push({
          stationId: station.id,
          stationName: station.name,
          status: 'OFFLINE',
          batteries: []
        });
      }
    } else {
      results.push({
        stationId: station.id,
        stationName: station.name,
        status: 'OFFLINE',
        batteries: []
      });
    }
  }

  res.json({
    count: results.reduce((acc, s) => acc + s.batteries.length, 0),
    data: results
  });
});

// Recent event / RPC logs
app.get('/api/network/logs', (req, res) => {
  res.json({ logs: networkState.eventLogs });
});

// Station event webhook from nodes
app.post('/api/station-event', (req, res) => {
  const { stationId, stationName, eventType, payload } = req.body;
  logEvent(eventType, payload, stationId);
  io.emit('station_event', { stationId, stationName, eventType, payload });
  res.json({ received: true });
});

// Smart Distributed Swap Coordinator with Automatic RPC Fallback
app.post('/api/smart-swap', async (req, res) => {
  const { preferredStationId, userId, vehicleId, batteryType } = req.body;
  const preferred = networkState.stations.find(s => s.id === preferredStationId);

  if (!preferred) {
    return res.status(404).json({ success: false, message: 'Invalid station specified' });
  }

  logEvent('SWAP_REQUEST_INITIATED', {
    preferredStationId,
    userId,
    vehicleId,
    batteryType
  }, 'COORDINATOR');

  // Case 1: Target station is offline (Fault Tolerance)
  if (preferred.status === 'OFFLINE') {
    logEvent('NODE_UNAVAILABLE_FALLBACK', {
      targetStation: preferredStationId,
      reason: 'Node is currently OFFLINE'
    }, 'COORDINATOR');

    // Find any alternative ONLINE station sorted by geographic proximity (nearest first)
    const distMap = (DISTANCE_MATRIX && DISTANCE_MATRIX[preferredStationId]) || {};
    const onlinePeers = networkState.stations
      .filter(s => s.status === 'ONLINE' && s.id !== preferredStationId)
      .sort((a, b) => (distMap[a.id] || 99) - (distMap[b.id] || 99));

    if (onlinePeers.length === 0) {
      return res.status(503).json({
        success: false,
        message: 'Distributed Failure: All station nodes are currently offline.'
      });
    }

    for (const peer of onlinePeers) {
      try {
        const resp = await axios.post(`${peer.url}/api/rpc/reserve-forward`, {
          requesterStationId: 'GATEWAY_ROUTED',
          userId,
          vehicleId,
          batteryType
        }, { timeout: 2000 });

        if (resp.data.success) {
          logEvent('FALLBACK_RESERVATION_CONFIRMED', {
            routedToStation: peer.id,
            batteryId: resp.data.battery.id
          }, 'COORDINATOR');

          return res.json({
            success: true,
            fallbackOccurred: true,
            fallbackReason: `${preferred.name} is OFFLINE. Nearest available station is ${peer.name} (${distMap[peer.id] || ''} km away). Automatically rerouted via RPC.`,
            reservation: resp.data
          });
        }
      } catch (err) {
        continue;
      }
    }

    return res.status(404).json({
      success: false,
      message: 'No available batteries found across any active fallback stations.'
    });
  }

  // Case 2: Target station is ONLINE. Try local reservation.
  try {
    const localResp = await axios.post(`${preferred.url}/api/reserve`, {
      userId,
      vehicleId
    }, { timeout: 2000 });

    return res.json({
      success: true,
      fallbackOccurred: false,
      reservation: localResp.data
    });
  } catch (err) {
    // Local reservation failed (e.g. 0 available batteries) -> Trigger Inter-Station RPC
    logEvent('LOCAL_DEPLETED_RPC_DISCOVERY', {
      stationId: preferredStationId,
      message: 'Local station depleted. Broadcasting RPC query to peer stations...'
    }, preferredStationId);

    try {
      const rpcResp = await axios.post(`${preferred.url}/api/inter-station/find-alternatives`, {
        batteryType
      }, { timeout: 3000 });

      const distMap = (DISTANCE_MATRIX && DISTANCE_MATRIX[preferredStationId]) || {};
      const availablePeers = (rpcResp.data.results || [])
        .filter(r => r.status === 'ONLINE' && r.availableCount > 0)
        .sort((a, b) => (distMap[a.peerId] || 99) - (distMap[b.peerId] || 99));

      if (availablePeers.length > 0) {
        const bestPeer = availablePeers[0];
        const distKm = distMap[bestPeer.peerId] ? `${distMap[bestPeer.peerId]} km` : '';
        // Reserve at nearest best peer via RPC
        const reserveResp = await axios.post(`${bestPeer.peerUrl}/api/rpc/reserve-forward`, {
          requesterStationId: preferredStationId,
          userId,
          vehicleId,
          batteryType
        });

        return res.json({
          success: true,
          fallbackOccurred: true,
          fallbackReason: `${preferred.name} was out of batteries. Inter-station RPC dynamically routed reservation to nearest peer: ${bestPeer.peerName} (${distKm} away, ${bestPeer.availableCount} available).`,
          rpcDiscovery: rpcResp.data,
          reservation: reserveResp.data
        });
      } else {
        return res.status(404).json({
          success: false,
          message: `Both ${preferred.name} and all peer stations have 0 available batteries.`,
          rpcDiscovery: rpcResp.data
        });
      }
    } catch (rpcErr) {
      return res.status(500).json({
        success: false,
        message: `Failed to coordinate inter-station fallback: ${rpcErr.message}`
      });
    }
  }
});

// -------------------------------------------------------------
// 3. PROCESS CONTROLLER / CHAOS MANAGER (FOR TESTING NODE FAILURES)
// -------------------------------------------------------------
app.post('/api/chaos/spawn-node/:code', (req, res) => {
  const { code } = req.params;
  const target = STATIONS.find(s => s.code === code);
  if (!target) return res.status(404).json({ error: 'Station code not found' });

  if (managedProcesses.has(code)) {
    return res.json({ success: true, message: `Node ${code} already running.` });
  }

  const serverPath = path.join(__dirname, '..', 'stations', code, 'server.js');
  const child = fork(serverPath, [], { stdio: 'inherit' });
  managedProcesses.set(code, child);

  child.on('exit', (codeExit) => {
    console.log(`[PROCESS MANAGER] Process ${code} exited with code ${codeExit}`);
    managedProcesses.delete(code);
  });

  logEvent('NODE_SPAWNED', { station: target.id, port: target.port }, 'CHAOS_MANAGER');
  res.json({ success: true, message: `Spawned process for ${target.name}` });
});

// -------------------------------------------------------------
// 4. WEBSOCKET SETUP
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send initial snapshot
  socket.emit('network_status', networkState.stations);
  socket.emit('event_history', networkState.eventLogs.slice(0, 30));

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

const PORT = GATEWAY.port;
server.listen(PORT, () => {
  console.log(`🚀 [GATEWAY & WS HUB] Running on port ${PORT}`);
  console.log(`📡 Heartbeat failure detection active on all 3 station nodes.`);
});
