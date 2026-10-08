import React from 'react';
import { Cpu } from 'lucide-react';

const NODE_META = {
  'STA-001': { label: 'Station A', sublabel: 'Tata Power (Nigdi)',     port: ':5001', color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  'STA-002': { label: 'Station B', sublabel: 'ChargeZone (Wakad)',     port: ':5002', color: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
  'STA-003': { label: 'Station C', sublabel: 'Nikol Station (Nigdi)',  port: ':5003', color: '#a855f7', glow: 'rgba(168,85,247,0.35)' },
};

function NodeCard({ stId, station, onClick }) {
  const meta     = NODE_META[stId] || {};
  const isOnline = station?.status === 'ONLINE';
  const color    = isOnline ? meta.color : '#ef4444';
  const glow     = isOnline ? meta.glow  : 'rgba(239,68,68,0.25)';

  return (
    <div
      onClick={() => onClick?.(stId)}
      style={{
        flex: 1,
        background: 'rgba(6, 10, 18, 0.9)',
        border: `1px solid ${color}55`,
        borderRadius: 14,
        padding: '0.9rem 1rem',
        cursor: 'pointer',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        boxShadow: `0 0 20px -6px ${glow}`,
        minWidth: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 28px -4px ${glow}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = '';                  e.currentTarget.style.boxShadow = `0 0 20px -6px ${glow}`; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: '#fff' }}>{stId}</strong>
        <span className={`pill ${isOnline ? 'green' : 'red'}`} style={{ fontSize: '0.6rem' }}>{station?.status || 'OFFLINE'}</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginBottom: 10 }}>
        {meta.label} · {meta.sublabel}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--mono)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
        <span style={{ color: '#34d399' }}>{station?.stats?.available ?? 0} avail</span>
        <span style={{ color: meta.color }}>{meta.port}</span>
      </div>
    </div>
  );
}

export default function NetworkTopology({ stations = [], onSelectStation }) {
  const getStation = id => stations.find(s => s.id === id);
  const staA = getStation('STA-001');
  const staB = getStation('STA-002');
  const staC = getStation('STA-003');

  const link = (a, b) => a?.status === 'ONLINE' && b?.status === 'ONLINE';

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div className="card-icon" style={{ background: 'rgba(6,182,212,0.15)', color: '#38bdf8' }}>
            <Cpu size={18} />
          </div>
          <div>
            <p className="card-title">Distributed Network Topology</p>
            <p className="card-subtitle">Live mesh with Gateway health-polling & RPC channels</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            RPC Link
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
            Gateway Poll
          </span>
        </div>
      </div>

      {/* SVG + Nodes */}
      <div style={{ position: 'relative', height: 200 }}>
        {/* SVG beams */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Gateway → Station A */}
          <line x1="50%" y1="15%" x2="13%" y2="75%"
            stroke={staA?.status === 'ONLINE' ? '#06b6d4' : '#ef444466'}
            strokeWidth="1.5" strokeDasharray="5 4" opacity="0.65"
            className={staA?.status === 'ONLINE' ? 'topology-beam-active' : ''} />
          {/* Gateway → Station B */}
          <line x1="50%" y1="15%" x2="50%" y2="75%"
            stroke={staB?.status === 'ONLINE' ? '#06b6d4' : '#ef444466'}
            strokeWidth="1.5" strokeDasharray="5 4" opacity="0.65"
            className={staB?.status === 'ONLINE' ? 'topology-beam-active' : ''} />
          {/* Gateway → Station C */}
          <line x1="50%" y1="15%" x2="87%" y2="75%"
            stroke={staC?.status === 'ONLINE' ? '#06b6d4' : '#ef444466'}
            strokeWidth="1.5" strokeDasharray="5 4" opacity="0.65"
            className={staC?.status === 'ONLINE' ? 'topology-beam-active' : ''} />
          {/* A ↔ B RPC */}
          <line x1="13%" y1="75%" x2="50%" y2="75%"
            stroke={link(staA,staB) ? '#10b981' : '#33415566'}
            strokeWidth="2" strokeDasharray="7 5"
            className={link(staA,staB) ? 'topology-beam-active' : ''} />
          {/* B ↔ C RPC */}
          <line x1="50%" y1="75%" x2="87%" y2="75%"
            stroke={link(staB,staC) ? '#10b981' : '#33415566'}
            strokeWidth="2" strokeDasharray="7 5"
            className={link(staB,staC) ? 'topology-beam-active' : ''} />
        </svg>

        {/* Gateway node */}
        <div style={{
          position: 'absolute', top: '0%', left: '50%', transform: 'translate(-50%, 0)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0.4rem 0.95rem', borderRadius: 99,
          background: 'rgba(6,10,18,0.97)',
          border: '1px solid rgba(6,182,212,0.55)',
          boxShadow: '0 0 20px rgba(6,182,212,0.2)',
          fontSize: '0.73rem', fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} className="animate-pulse" />
          <span style={{ color: '#fff' }}>GATEWAY · WS HUB</span>
          <span style={{ color: '#38bdf8', fontFamily: 'var(--mono)', background: 'rgba(6,182,212,0.12)', padding: '0.05rem 0.4rem', borderRadius: 4 }}>:5000</span>
        </div>

        {/* Station nodes — absolute at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', gap: '1rem', padding: '0 0',
        }}>
          <NodeCard stId="STA-001" station={staA} onClick={onSelectStation} />
          <NodeCard stId="STA-002" station={staB} onClick={onSelectStation} />
          <NodeCard stId="STA-003" station={staC} onClick={onSelectStation} />
        </div>
      </div>
    </div>
  );
}
