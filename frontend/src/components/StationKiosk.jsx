import React, { useState } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { Zap, BatteryCharging, Radio, Activity, RefreshCw, AlertOctagon, CheckCircle2,
         ArrowRightLeft, Thermometer, RotateCcw, Layers, Server, Unlock, Lock } from 'lucide-react';

const STATION_MAP = {
  'station-a': { 
    id: 'STA-001', 
    name: 'Tata Power EV Charging Station', 
    location: 'Plot no 140, Sector Number 23, Shree Vihar, Transport Nagar, Nigdi, Pimpri-Chinchwad, Maharashtra 411044',
    port: 5001, 
    url: 'http://localhost:5001', 
    code: 'station:a', 
    accent: '#10b981', 
    accentLight: '#34d399' 
  },
  'station-b': { 
    id: 'STA-002', 
    name: 'ChargeZone EV Charging Station', 
    location: 'No 136/1A/6, Old Mumbai - Pune Hwy, Mane Wasti, Kemse Vasti, Wakad, Pimpri-Chinchwad, Maharashtra 411057',
    port: 5002, 
    url: 'http://localhost:5002', 
    code: 'station:b', 
    accent: '#06b6d4', 
    accentLight: '#38bdf8' 
  },
  'station-c': { 
    id: 'STA-003', 
    name: 'Nikol Charging Station', 
    location: 'Sector 32 A, Nigdi, Pimpri-Chinchwad, Maharashtra 412101',
    port: 5003, 
    url: 'http://localhost:5003', 
    code: 'station:c', 
    accent: '#a855f7', 
    accentLight: '#c084fc' 
  },
};

export default function StationKiosk({ 
  stationCode = 'station-a', 
  stations = [], 
  fleetData = [], 
  driverId = 'EV-DRIVER-101', 
  vehicleId = 'KA-01-EV-2024', 
  onActionFeedback, 
  onRefresh 
}) {
  const [rpcLoading, setRpcLoading]       = useState(false);
  const [rpcResults, setRpcResults]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const meta    = STATION_MAP[stationCode];
  const station = stations.find(s => s.id === meta.id) || { ...meta, status: 'OFFLINE', stats: {} };
  const isOnline = station.status === 'ONLINE';
  const batteries = fleetData.find(f => f.stationId === meta.id)?.batteries || [];
  const avail   = batteries.filter(b => b.status === 'AVAILABLE').length;
  const charging = batteries.filter(b => b.status === 'CHARGING').length;
  const reserved = batteries.filter(b => b.status === 'RESERVED').length;

  const run = async (fn) => { setActionLoading(true); try { await fn(); } finally { setActionLoading(false); } };

  const handleRpc = async () => {
    if (!isOnline) return onActionFeedback?.({ type: 'error', message: `${meta.name} is OFFLINE.` });
    setRpcLoading(true);
    try {
      const r = await axios.post(`${meta.url}/api/inter-station/find-alternatives`, {});
      setRpcResults(r.data);
      onActionFeedback?.({ type: 'info', message: `RPC complete — queried ${r.data.peersQueried} peer nodes.` });
    } catch (e) {
      onActionFeedback?.({ type: 'error', message: e.message });
    } finally { setRpcLoading(false); }
  };

  // Swap a SPECIFIC Reserved Bay
  const handleSwapReservedBay = (battery) => run(async () => {
    const r = await axios.post(`${meta.url}/api/swap`, {
      reservedBatteryId: battery.id,
      returnBatteryCharge: Math.floor(12 + Math.random() * 15),
      userId: battery.reservedBy || driverId || 'EV-DRIVER-101',
      vehicleId: battery.vehicleId || vehicleId || 'KA-01-EV-2024',
    });
    onActionFeedback?.({ 
      type: 'success', 
      message: `Bay Unlocked! Dispensed ${r.data.dispensed.id} (${r.data.dispensed.charge}%) to ${battery.reservedBy || driverId}. Depleted pack inserted for charging.` 
    });
    onRefresh?.();
    try { confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } }); } catch {}
  });

  const handleDrain = () => run(async () => {
    await axios.post(`${meta.url}/api/chaos/drain`);
    onActionFeedback?.({ type: 'warning', message: `Drained ${meta.name} to 0 available.` });
    onRefresh?.();
  });

  const handleReset = () => run(async () => {
    await axios.post(`${meta.url}/api/chaos/reset`);
    onActionFeedback?.({ type: 'info', message: `Reset ${meta.name} to factory defaults.` });
    onRefresh?.();
  });

  return (
    <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Hero Banner ── */}
      <div className="card" style={{ borderColor: isOnline ? `${meta.accent}55` : 'var(--border-rose)', boxShadow: `var(--shadow-card), 0 0 30px -6px ${isOnline ? meta.accent : '#f43f5e'}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${meta.accent}22`, border: `1px solid ${meta.accent}66`, color: meta.accentLight }}>
              <Zap size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.025em' }}>{meta.name}</h2>
                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>[{meta.id}]</span>
                <span className={`pill ${isOnline ? 'green' : 'red'}`}>{station.status || 'OFFLINE'}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                {meta.location} · Microservice on
                <span className="mono" style={{ color: meta.accentLight }}> :{meta.port}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={handleDrain} disabled={!isOnline || actionLoading || avail === 0} className="btn btn-ghost" style={{ color: '#fbbf24' }} title="Drain available to 0">
              <AlertOctagon size={14} /> Drain (0)
            </button>
            <button onClick={handleReset} disabled={!isOnline || actionLoading} className="btn btn-ghost" title="Reset to Factory Stock">
              <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} /> Reset Stock
            </button>
          </div>
        </div>

        {/* Telemetry strip */}
        <div className="mono" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-base)' }}>
          {[
            { label: 'LOCAL REST PORT', value: `localhost:${meta.port}`, color: meta.accentLight },
            { label: 'AVAILABLE PACKS', value: `${avail} / ${batteries.length}`, color: '#34d399' },
            { label: 'CHARGING BAYS',   value: `${charging} packs`, color: '#fbbf24' },
            { label: 'RESERVED LOCKS',  value: `${reserved} packs`, color: '#c084fc' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-4)', marginBottom: 3, letterSpacing: '0.05em' }}>{label}</div>
              <strong style={{ fontSize: '0.88rem', color }}>{value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Drained stock banner */}
      {avail === 0 && isOnline && (
        <div style={{
          padding: '0.85rem 1.1rem',
          borderRadius: 12,
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#fbbf24',
          fontSize: '0.78rem'
        }}>
          <AlertOctagon size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <strong>Local Battery Stock Depleted (0 Available):</strong>
            <div style={{ color: 'var(--text-2)', marginTop: 2 }}>
              All local charging bays are occupied. Incoming driver reservations and swap requests are automatically rerouted to peer stations via Inter-Station RPC.
            </div>
          </div>
        </div>
      )}

      {/* ── Charging Bay Rack ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
            <div className="card-icon" style={{ background: `${meta.accent}22`, color: meta.accentLight }}>
              <Layers size={18} />
            </div>
            <div>
              <p className="card-title">Station Hardware Bay Silos &amp; Sockets</p>
              <p className="card-subtitle">Reserved bays can be unlocked by the driver to swap battery; other bays charge automatically</p>
            </div>
          </div>
          <span className="pill green" style={{ fontSize: '0.62rem' }}>{batteries.length} Bays Loaded</span>
        </div>

        {batteries.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(5,8,14,0.5)', borderRadius: 12, border: '1px solid var(--border-base)', color: 'var(--text-3)', fontSize: '0.8rem' }}>
            {isOnline ? 'No battery telemetry received from local node.' : 'Node is OFFLINE — local database unreachable.'}
          </div>
        ) : (
          <div className="bay-rack-grid">
            {batteries.map((b, idx) => {
              const isAvail = b.status === 'AVAILABLE';
              const isChar  = b.status === 'CHARGING';
              const isRes   = b.status === 'RESERVED';
              const barColor = b.charge > 70 ? '#34d399' : b.charge > 40 ? '#f59e0b' : '#f43f5e';

              return (
                <div key={b.id} className={`bay-cell ${isAvail ? 'ready' : isChar ? 'charging' : 'reserved'}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  
                  {/* Bay header */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-4)', fontWeight: 700 }}>BAY {String(idx + 1).padStart(2, '0')}</span>
                      <span className={`pill ${isAvail ? 'green' : isChar ? 'amber' : 'purple'}`} style={{ fontSize: '0.58rem', padding: '0.15rem 0.5rem' }}>
                        {b.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong className="mono" style={{ fontSize: '1rem', color: '#fff' }}>{b.id}</strong>
                      <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{b.cycles || 120} cyc</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.type}>{b.type}</div>
                  </div>

                  {/* Charge meter */}
                  <div style={{ margin: '0.5rem 0' }}>
                    <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-3)' }}>State of Charge</span>
                      <strong style={{ color: barColor }}>{b.charge}%</strong>
                    </div>
                    <div className="liquid-battery-wrapper">
                      <div className={`liquid-battery-fill ${b.charge > 70 ? 'liquid-fill-green' : b.charge > 40 ? 'liquid-fill-amber' : 'liquid-fill-rose'}`}
                        style={{ width: `${b.charge}%` }}>{b.charge}%</div>
                    </div>
                  </div>

                  {/* Thermal / Health info */}
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-4)', borderTop: '1px solid var(--border-base)', paddingTop: 6, marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Thermometer size={11} color="#fbbf24" />{b.temperature || '26°C'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={11} color="#34d399" />{b.health || 98}% health</span>
                  </div>

                  {/* Status Indicator per Bay */}
                  {isRes ? (
                    <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c084fc', background: 'rgba(168,85,247,0.14)', padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid rgba(168,85,247,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto' }}>
                      <Lock size={12} color="#c084fc" />
                      <span>Locked by: {b.reservedBy}</span>
                    </div>
                  ) : isAvail ? (
                    <div style={{ fontSize: '0.68rem', color: '#34d399', background: 'rgba(16,185,129,0.06)', padding: '0.35rem', borderRadius: 6, textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)', marginTop: 'auto' }}>
                      ✓ Available (Ready for Reservation)
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245,158,11,0.06)', padding: '0.35rem', borderRadius: 6, textAlign: 'center', border: '1px solid rgba(245,158,11,0.2)', marginTop: 'auto' }}>
                      ⚡ Trickle Charging in Bay (+2%/10s)
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Inter-Station RPC Tester ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
            <div className="card-icon" style={{ background: 'rgba(6,182,212,0.15)', color: '#38bdf8' }}>
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <p className="card-title">Inter-Station RPC Peer Discovery</p>
              <p className="card-subtitle">Broadcasts live Remote Procedure Calls from this node to other distributed station nodes</p>
            </div>
          </div>
          <button onClick={handleRpc} disabled={!isOnline || rpcLoading} className="btn btn-cyan">
            <Radio size={14} className={rpcLoading ? 'animate-pulse' : ''} />
            {rpcLoading ? 'Broadcasting…' : 'Broadcast RPC Query'}
          </button>
        </div>

        {rpcResults ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem', fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
              <CheckCircle2 size={16} />
              <span>RPC Broadcast Complete — Queried {rpcResults.peersQueried} peer nodes</span>
            </div>
            <div className="grid-2">
              {(rpcResults.results || []).map((peer, i) => (
                <div key={i} style={{ padding: '0.9rem', borderRadius: 10, background: 'rgba(8,12,21,0.85)',
                  border: `1px solid ${peer.status === 'ONLINE' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{peer.peerName}</strong>
                    <span className={`pill ${peer.status === 'ONLINE' ? 'green' : 'red'}`} style={{ fontSize: '0.6rem' }}>{peer.status}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 8 }}>
                    {peer.peerUrl}/api/rpc/query-available
                  </div>
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', borderTop: '1px solid var(--border-base)', paddingTop: 6 }}>
                    <span style={{ color: '#34d399' }}>Available: {peer.availableCount} Packs</span>
                    <span style={{ color: 'var(--text-3)' }}>Status: <strong style={{ color: '#34d399' }}>OK</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(5,8,14,0.4)', borderRadius: 10, border: '1px solid var(--border-base)', color: 'var(--text-3)', fontSize: '0.78rem' }}>
            Click <strong style={{ color: '#38bdf8' }}>"Broadcast RPC Query"</strong> above to send live inter-station RPC requests.
          </div>
        )}
      </div>
    </div>
  );
}
