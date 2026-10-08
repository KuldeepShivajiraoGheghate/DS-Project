import React, { useState } from 'react';
import { Radio, Zap, RefreshCw, AlertOctagon } from 'lucide-react';
import axios from 'axios';

const STATION_COLORS = {
  'STA-001': { border: 'var(--border-green)', glow: 'var(--shadow-glow-g)', accent: '#10b981', accentLight: '#34d399' },
  'STA-002': { border: 'var(--border-cyan)',  glow: 'var(--shadow-glow-c)', accent: '#06b6d4', accentLight: '#38bdf8' },
  'STA-003': { border: 'var(--border-purple)',glow: '0 0 30px -6px rgba(168,85,247,0.4)', accent: '#a855f7', accentLight: '#c084fc' },
};

export default function StationCard({ station, batteries = [], onReserveSuccess, onActionFeedback }) {
  const [loading, setLoading] = useState(false);

  const isOnline      = station.status === 'ONLINE';
  const availCount    = batteries.filter(b => b.status === 'AVAILABLE').length;
  const chargingCount = batteries.filter(b => b.status === 'CHARGING').length;
  const reservedCount = batteries.filter(b => b.status === 'RESERVED').length;
  const col           = STATION_COLORS[station.id] || STATION_COLORS['STA-001'];

  const run = async (fn) => { setLoading(true); try { await fn(); } finally { setLoading(false); } };

  const handleReserve = () => run(async () => {
    if (!isOnline) return onActionFeedback?.({ type: 'error', message: `${station.name} is OFFLINE.` });
    const r = await axios.post(`${station.url}/api/reserve`, {
      userId: `EV-USER-${Math.floor(100 + Math.random() * 900)}`,
      vehicleId: `EV-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    onActionFeedback?.({ type: 'success', message: `Reserved ${r.data.battery.id} at ${station.name} (${r.data.battery.charge}%)` });
    onReserveSuccess?.();
  });

  const handleDrain = () => run(async () => {
    await axios.post(`${station.url}/api/chaos/drain`);
    onActionFeedback?.({ type: 'warning', message: `Drained ${station.name}. Test Smart Swap to trigger RPC fallback!` });
    onReserveSuccess?.();
  });

  const handleReset = () => run(async () => {
    await axios.post(`${station.url}/api/chaos/reset`);
    onActionFeedback?.({ type: 'info', message: `Reset ${station.name} to factory inventory.` });
    onReserveSuccess?.();
  });

  return (
    <div
      className="card"
      style={{
        borderColor: isOnline ? col.border : 'var(--border-rose)',
        boxShadow: `var(--shadow-card), ${isOnline ? col.glow : 'var(--shadow-glow-r)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{station.name}</h3>
            <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>[{station.id}]</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{station.location}</p>
        </div>
        <span className={`pill ${isOnline ? 'green' : 'red'}`}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} className={isOnline ? 'animate-pulse' : ''} />
          {station.status}
        </span>
      </div>

      {/* ── Telemetry strip ── */}
      <div
        className="mono"
        style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '0.68rem', color: 'var(--text-3)',
          background: 'rgba(5,8,14,0.7)', borderRadius: 8,
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--border-base)',
        }}
      >
        <span>Port <strong style={{ color: col.accentLight }}>:{station.port}</strong></span>
        <span>Status <strong style={{ color: isOnline ? '#34d399' : '#f87171' }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</strong></span>
      </div>

      {/* ── Battery counts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
        {[
          { label: 'Available', count: availCount,    color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
          { label: 'Charging',  count: chargingCount, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
          { label: 'Reserved',  count: reservedCount, color: '#c084fc', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)' },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '0.5rem 0.4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color, fontFamily: 'var(--mono)' }}>{count}</div>
          </div>
        ))}
      </div>

      {/* ── Mini battery list ── */}
      {batteries.length > 0 && (
        <div>
          <p className="section-label" style={{ fontSize: '0.62rem', marginBottom: '0.5rem' }}>Local Packs</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem', maxHeight: 130, overflowY: 'auto' }}>
            {batteries.map(b => {
              const avail = b.status === 'AVAILABLE';
              const char  = b.status === 'CHARGING';
              const barColor = b.charge > 70 ? '#34d399' : b.charge > 40 ? '#f59e0b' : '#f43f5e';
              return (
                <div key={b.id} style={{
                  padding: '0.35rem 0.45rem',
                  borderRadius: 7,
                  background: avail ? 'rgba(16,185,129,0.07)' : char ? 'rgba(245,158,11,0.07)' : 'rgba(168,85,247,0.07)',
                  border: `1px solid ${avail ? 'rgba(16,185,129,0.2)' : char ? 'rgba(245,158,11,0.2)' : 'rgba(168,85,247,0.2)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: '0.63rem', color: '#fff', fontWeight: 700 }}>{b.id}</span>
                    <span style={{ fontSize: '0.58rem', color: avail ? '#34d399' : char ? '#fbbf24' : '#c084fc', fontWeight: 700 }}>
                      {b.status.slice(0, 3)}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${b.charge}%`, background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-4)', marginTop: 3 }}>
                    <span>{b.charge}%</span>
                    <span>{b.temperature || '25°C'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid var(--border-base)', paddingTop: '0.9rem', marginTop: 'auto' }}>
        <button onClick={handleReserve} disabled={!isOnline || loading || availCount === 0} className="btn btn-green" style={{ flex: 1, justifyContent: 'center' }}>
          <Zap size={13} /> Reserve
        </button>
        <button onClick={handleDrain} disabled={!isOnline || loading || availCount === 0} className="btn btn-ghost" style={{ color: '#fbbf24', padding: '0.5rem 0.65rem' }} title="Drain">
          <AlertOctagon size={13} />
        </button>
        <button onClick={handleReset} disabled={!isOnline || loading} className="btn btn-ghost" style={{ padding: '0.5rem 0.65rem' }} title="Reset">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
