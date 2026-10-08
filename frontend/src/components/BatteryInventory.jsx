import React, { useState } from 'react';
import { Layers, Search } from 'lucide-react';

const STA_COLORS = {
  'STA-001': { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.35)', activeBorder: '#10b981', label: 'Station A' },
  'STA-002': { bg: 'rgba(6,182,212,0.12)',  text: '#38bdf8', border: 'rgba(6,182,212,0.35)',  activeBorder: '#06b6d4', label: 'Station B' },
  'STA-003': { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.35)', activeBorder: '#a855f7', label: 'Station C' },
};

function BatteryCard({ b }) {
  const isAvail = b.status === 'AVAILABLE';
  const isChar  = b.status === 'CHARGING';
  const barColor = b.charge > 70 ? '#34d399' : b.charge > 40 ? '#f59e0b' : '#f43f5e';
  const col = STA_COLORS[b.stationId] || STA_COLORS['STA-001'];

  return (
    <div
      style={{
        background: 'rgba(8,12,21,0.8)',
        border: '1px solid var(--border-base)',
        borderRadius: 11,
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border-soft)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = '';                  e.currentTarget.style.borderColor = 'var(--border-base)'; }}
    >
      {/* Row 1: ID + station badge + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
          <strong className="mono" style={{ fontSize: '0.85rem', color: '#fff', flexShrink: 0 }}>{b.id}</strong>
          <span className="mono" style={{
            fontSize: '0.6rem', fontWeight: 700,
            padding: '0.07rem 0.4rem', borderRadius: 4,
            background: col.bg, color: col.text, border: `1px solid ${col.border}`,
            flexShrink: 0,
          }}>{b.stationId}</span>
        </div>
        <span className={`badge badge-${isAvail ? 'online' : isChar ? 'charging' : 'reserved'}`}>
          {b.status}
        </span>
      </div>

      {/* Station + type */}
      <div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: '0.1rem' }}>{b.stationName}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.type}>{b.type}</div>
      </div>

      {/* Charge bar */}
      <div>
        <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: 4 }}>
          <span style={{ color: 'var(--text-3)' }}>Charge</span>
          <strong style={{ color: barColor }}>{b.charge}%</strong>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${b.charge}%`, background: barColor, borderRadius: 99, boxShadow: `0 0 8px ${barColor}80`, transition: 'width 0.7s ease' }} />
        </div>
      </div>

      {/* Footer */}
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-4)', borderTop: '1px solid var(--border-base)', paddingTop: '0.45rem' }}>
        <span>Cycles: {b.cycles || 120}</span>
        <span>Health: {b.health || 98}%</span>
        <span>{b.temperature || '26°C'}</span>
      </div>

      {b.reservedBy && (
        <div className="mono" style={{ fontSize: '0.62rem', color: '#c084fc', background: 'rgba(168,85,247,0.1)', padding: '0.2rem 0.45rem', borderRadius: 5, border: '1px solid rgba(168,85,247,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🔒 {b.reservedBy}
        </div>
      )}
    </div>
  );
}

export default function BatteryInventory({ stations = [], fleetData = [] }) {
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState('ALL');
  const [statusFilter, setSF]   = useState('ALL');

  const all = fleetData.flatMap(st =>
    (st.batteries || []).map(b => ({
      ...b,
      stationName: st.stationName || (b.stationId === 'STA-001' ? 'Station A (Downtown Hub)' : b.stationId === 'STA-002' ? 'Station B (Tech Park)' : 'Station C (Airport Link)'),
    }))
  );

  const visible = all.filter(b => {
    const matchSearch = !search ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      (b.reservedBy || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.type || '').toLowerCase().includes(search.toLowerCase());
    const matchTab    = tab === 'ALL' || b.stationId === tab;
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchSearch && matchTab && matchStatus;
  });

  const count = id => all.filter(b => b.stationId === id).length;

  const tabDefs = [
    { id: 'ALL',     label: 'All Stations', count: all.length, color: 'rgba(255,255,255,0.15)', activeColor: 'rgba(255,255,255,0.2)', text: '#fff' },
    { id: 'STA-001', label: 'Station A',    count: count('STA-001'), ...STA_COLORS['STA-001'] },
    { id: 'STA-002', label: 'Station B',    count: count('STA-002'), ...STA_COLORS['STA-002'] },
    { id: 'STA-003', label: 'Station C',    count: count('STA-003'), ...STA_COLORS['STA-003'] },
  ];

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
          <div className="card-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
            <Layers size={18} />
          </div>
          <div>
            <p className="card-title">Distributed Battery Fleet Inventory</p>
            <p className="card-subtitle">Live inventory aggregated across all Station A, B, C nodes</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, user…"
              className="input-control"
              style={{ paddingLeft: 26, width: 175, height: 34 }}
            />
          </div>
          <select value={statusFilter} onChange={e => setSF(e.target.value)} className="input-control" style={{ width: 130, height: 34 }}>
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="CHARGING">CHARGING</option>
            <option value="RESERVED">RESERVED</option>
          </select>
        </div>
      </div>

      {/* Station tabs */}
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-base)' }}>
        {tabDefs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.38rem 0.85rem', borderRadius: 9,
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: active ? (t.bg || 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.03)',
                color:      active ? (t.text) : 'var(--text-3)',
                border:     active ? `1px solid ${t.activeBorder || t.border || 'rgba(255,255,255,0.25)'}` : '1px solid var(--border-base)',
                transition: 'all 0.18s',
              }}
            >
              {t.label}
              <span className="mono" style={{ background: 'rgba(0,0,0,0.35)', padding: '0.05rem 0.4rem', borderRadius: 4, fontSize: '0.62rem', color: active ? t.text : 'var(--text-4)' }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(5,8,14,0.4)', borderRadius: 10, border: '1px solid var(--border-base)', color: 'var(--text-3)', fontSize: '0.8rem' }}>
          No batteries match the selected filters, or nodes are offline.
        </div>
      ) : (
        <div className="grid-4">
          {visible.map(b => <BatteryCard key={`${b.stationId}-${b.id}`} b={b} />)}
        </div>
      )}

      <div className="mono" style={{ marginTop: '0.85rem', fontSize: '0.67rem', color: 'var(--text-4)', textAlign: 'right' }}>
        {visible.length} of {all.length} packs shown
      </div>
    </div>
  );
}
