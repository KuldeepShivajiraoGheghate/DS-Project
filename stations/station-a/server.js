const { createStationServer } = require('../station-server');
const { STATIONS } = require('../../shared/constants');

const stationConfig = STATIONS.find(s => s.code === 'station-a');
const app = createStationServer(stationConfig);

const server = app.listen(stationConfig.port, () => {
  console.log(`⚡ [${stationConfig.id}] ${stationConfig.name} is running on port ${stationConfig.port}`);
});

process.on('SIGTERM', () => {
  console.log(`[${stationConfig.id}] Shutting down gracefully...`);
  server.close(() => process.exit(0));
});
