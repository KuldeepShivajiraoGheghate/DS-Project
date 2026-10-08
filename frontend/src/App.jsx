import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from './hooks/useSocket';
import Header         from './components/Header';
import GlobalDashboard from './components/GlobalDashboard';
import StationKiosk   from './components/StationKiosk';
import DriverPortal   from './components/DriverPortal';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

// ── Toast banner ──────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const config = {
    success: { bg: '#022b1a', border: '#10b981', icon: <CheckCircle2 size={17} color="#34d399" /> },
    warning: { bg: '#2a1a00', border: '#f59e0b', icon: <AlertTriangle size={17} color="#fbbf24" /> },
    error:   { bg: '#2a0a12', border: '#ef4444', icon: <AlertCircle   size={17} color="#f87171" /> },
    info:    { bg: '#041827', border: '#06b6d4', icon: <Info          size={17} color="#38bdf8" /> },
  };
  const c = config[toast.type] || config.info;

  return (
    <div style={{
      position: 'fixed', top: 92, right: 20, zIndex: 100, maxWidth: 440,
      padding: '0.85rem 1.1rem', borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`,
      boxShadow: '0 12px 36px rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
      animation: 'fadeSlideUp 0.28s ease both',
    }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>{c.icon}</div>
      <div style={{ flex: 1, fontSize: '0.79rem', color: '#e2e8f0', fontWeight: 500, lineHeight: 1.45 }}>
        {toast.message}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────
export default function App() {
  const { isConnected, stations: wsStations, logs, lastEvent, setLogs } = useSocket();
  const [stations,   setStations]   = useState([]);
  const [fleetData,  setFleetData]  = useState([]);
  const [activeView, setActiveView] = useState('global');
  const [toast, setToast] = useState(null);

  // Global Driver Profile State (managed centrally via Driver Portal)
  const [driverId, setDriverId]     = useState('EV-DRIVER-101');
  const [vehicleId, setVehicleId]   = useState('KA-01-EV-2024');

  // Persistent Active Reservation State (Stays until unlocked & swapped)
  const [activeReservation, setActiveReservation] = useState(() => {
    try {
      const saved = localStorage.getItem('activeReservation');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSetReservation = (resv) => {
    setActiveReservation(resv);
    if (resv) {
      localStorage.setItem('activeReservation', JSON.stringify(resv));
    } else {
      localStorage.removeItem('activeReservation');
    }
  };

  // Merge WebSocket live station updates
  useEffect(() => {
    if (wsStations?.length) setStations(wsStations);
  }, [wsStations]);

  const fetchFleet = async () => {
    try {
      const r = await axios.get('/api/network/batteries');
      setFleetData(r.data.data || []);
    } catch {}
  };

  const fetchStatus = async () => {
    try {
      const r = await axios.get('/api/network/status');
      if (r.data?.stations) setStations(r.data.stations);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    fetchFleet();
    const t = setInterval(fetchFleet, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (lastEvent) fetchFleet(); }, [lastEvent]);

  const showToast = (data) => {
    setToast(data);
    const id = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(id);
  };

  const refresh = () => { fetchFleet(); fetchStatus(); };

  const handleSelectStation = (id) => {
    if (id === 'STA-001') setActiveView('station-a');
    else if (id === 'STA-002') setActiveView('station-b');
    else if (id === 'STA-003') setActiveView('station-c');
  };

  // Shared props for all views
  const commonProps = { 
    stations, 
    fleetData, 
    driverId, 
    setDriverId, 
    vehicleId, 
    setVehicleId, 
    activeReservation,
    setActiveReservation: handleSetReservation,
    onActionFeedback: showToast, 
    onRefresh: refresh 
  };

  return (
    <div className="page-wrapper">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        stations={stations}
        isConnected={isConnected}
      />

      <main className="page-content">
        {activeView === 'global' && (
          <GlobalDashboard
            {...commonProps}
            logs={logs}
            onReserveSuccess={refresh}
            onClearLogs={() => setLogs([])}
            onSelectStation={handleSelectStation}
          />
        )}
        {activeView === 'station-a' && <StationKiosk stationCode="station-a" {...commonProps} />}
        {activeView === 'station-b' && <StationKiosk stationCode="station-b" {...commonProps} />}
        {activeView === 'station-c' && <StationKiosk stationCode="station-c" {...commonProps} />}
        {activeView === 'driver'    && <DriverPortal {...commonProps} />}
      </main>
    </div>
  );
}
