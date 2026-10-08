/**
 * Shared configuration and constants across Distributed Battery System
 */

const STATIONS = [
  {
    id: 'STA-001',
    code: 'station-a',
    name: 'Tata Power EV Charging Station',
    location: 'Plot no 140, Sector Number 23, Shree Vihar, Transport Nagar, Nigdi, Pimpri-Chinchwad, Maharashtra 411044',
    port: 5001,
    url: 'http://localhost:5001',
    capacity: 12
  },
  {
    id: 'STA-002',
    code: 'station-b',
    name: 'ChargeZone EV Charging Station',
    location: 'No 136/1A/6, Old Mumbai - Pune Hwy, Mane Wasti, Kemse Vasti, Wakad, Pimpri-Chinchwad, Maharashtra 411057',
    port: 5002,
    url: 'http://localhost:5002',
    capacity: 12
  },
  {
    id: 'STA-003',
    code: 'station-c',
    name: 'Nikol Charging Station',
    location: 'Sector 32 A, Nigdi, Pimpri-Chinchwad, Maharashtra 412101',
    port: 5003,
    url: 'http://localhost:5003',
    capacity: 12
  }
];

// Distance Matrix in km between Pune Station Nodes
const DISTANCE_MATRIX = {
  'STA-001': { 'STA-003': 2.6, 'STA-002': 3.2 },
  'STA-002': { 'STA-001': 3.2, 'STA-003': 4.1 },
  'STA-003': { 'STA-001': 2.6, 'STA-002': 4.1 }
};

const GATEWAY = {
  port: 5000,
  url: 'http://localhost:5000'
};

const BATTERY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  CHARGING: 'CHARGING',
  RESERVED: 'RESERVED',
  IN_USE: 'IN_USE'
};

const BATTERY_TYPES = {
  STANDARD: 'Lithium-Ion Standard (75kWh)',
  FAST: 'LFP High-Rate Fast-Charge (90kWh)',
  SOLID: 'Solid-State Extended Range (120kWh)'
};

module.exports = {
  STATIONS,
  DISTANCE_MATRIX,
  GATEWAY,
  BATTERY_STATUS,
  BATTERY_TYPES
};
