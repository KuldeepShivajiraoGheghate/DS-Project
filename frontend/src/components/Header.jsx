import React from 'react';
import { Zap, Server, Activity, Wifi, WifiOff, Globe, Car } from 'lucide-react';

const views = [
  { id: 'global',    label: 'Global Network Hub',  icon: Globe,  badge: true },
  { id: 'station-a', label: 'Station A',            icon: Zap,   port: ':5001', accent: '#10b981' },
  { id: 'station-b', label: 'Station B',            icon: Zap,   port: ':5002', accent: '#06b6d4' },
  { id: 'station-c', label: 'Station C',            icon: Zap,   port: ':5003', accent: '#a855f7' },
  { id: 'driver',    label: 'EV Driver Portal',     icon: Car,   accent: '#38bdf8' },
];

export default function Header({ activeView, setActiveView, stations = [], isConnected = false }) {
  const onlineCount = stations.filter(s => s.status === 'ONLINE').length;
  const totalBat    = stations.reduce((a, s) => a + (s.stats?.total     || 0), 0);
  const availBat    = stations.reduce((a, s) => a + (s.stats?.available || 0), 0);

  return (
    <header className="header">
      {/* ── Brand Row ── */}
      <div className="header-brand-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div className="header-logo animate-float">
            <Zap size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <h1 className="header-title">Distributed Battery-Swapping System</h1>
              <span className="pill green" style={{ fontSize: '0.6rem' }}>MULTI-NODE</span>
            </div>
            <p className="header-subtitle">
              Independent Microservices · Real-Time RPC Fallback · WebSocket Stream
            </p>
          </div>
        </div>

        {/* ── Telemetry Pills ── */}
        <div className="header-meta">
          <div className={`pill ${isConnected ? 'green' : 'red'}`}>
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? 'WS Live' : 'Reconnecting'}
          </div>

          <div className="header-stat">
            <Server size={12} color="#38bdf8" />
            <span>Nodes</span>
            <strong style={{ color: onlineCount === 3 ? '#34d399' : '#fbbf24' }}>
              {onlineCount}/{stations.length || 3}
            </strong>
          </div>

          <div className="header-stat">
            <Activity size={12} color="#34d399" />
            <span>Fleet</span>
            <strong style={{ color: '#34d399' }}>{availBat}</strong>
            <span style={{ color: 'var(--text-4)' }}>/ {totalBat}</span>
          </div>


        </div>
      </div>

      {/* ── Navigation Tab Bar ── */}
      <nav className="header-nav">
        {views.map(v => {
          const Icon     = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`nav-tab${isActive ? ' active' : ''}`}
              style={isActive && v.accent ? { color: v.accent, borderColor: `${v.accent}66`, background: `${v.accent}14` } : {}}
            >
              <Icon size={13} />
              <span>{v.label}</span>
              {v.port && <span className="tab-port">{v.port}</span>}
              {v.badge && (
                <span className="tab-badge">{onlineCount}/3</span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
