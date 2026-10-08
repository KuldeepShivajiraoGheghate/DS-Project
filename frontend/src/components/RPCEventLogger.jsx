import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

const FILTERS = ['ALL', 'RPC', 'SWAP', 'FAILURES'];

function getTag(type = '') {
  if (type.includes('RPC')  || type.includes('FALLBACK'))         return { label: 'RPC',      cls: 'log-tag-rpc' };
  if (type.includes('OFFLINE') || type.includes('FAIL'))          return { label: 'FAIL',     cls: 'log-tag-error' };
  if (type.includes('ONLINE'))                                     return { label: 'RECOVERY', cls: 'log-tag-recovery' };
  if (type.includes('BATTERY') || type.includes('SWAP'))          return { label: 'EVENT',    cls: 'log-tag-event' };
  return { label: 'SYS', cls: 'log-tag-rpc' };
}

export default function RPCEventLogger({ logs = [], onClearLogs }) {
  const [filter, setFilter] = useState('ALL');
  const termRef = useRef(null);

  const visible = logs.filter(l => {
    if (filter === 'ALL')      return true;
    if (filter === 'RPC')      return l.type?.includes('RPC') || l.type?.includes('FALLBACK');
    if (filter === 'SWAP')     return l.type?.includes('SWAP') || l.type?.includes('BATTERY');
    if (filter === 'FAILURES') return l.type?.includes('OFFLINE') || l.type?.includes('FAIL');
    return true;
  });

  // auto-scroll to bottom
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [visible.length]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
          <div className="card-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
            <Terminal size={18} />
          </div>
          <div>
            <p className="card-title">RPC Telemetry Stream</p>
            <p className="card-subtitle">Live inter-node packets &amp; events</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* filter pills */}
          <div style={{ display: 'flex', background: 'rgba(5,8,14,0.7)', padding: '3px', borderRadius: 8, border: '1px solid var(--border-base)', gap: 2 }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: 6,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  border: filter === f ? '1px solid rgba(168,85,247,0.45)' : '1px solid transparent',
                  background: filter === f ? 'rgba(168,85,247,0.22)' : 'transparent',
                  color: filter === f ? '#c084fc' : 'var(--text-3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{f}</button>
            ))}
          </div>
          <button
            onClick={onClearLogs}
            title="Clear"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-base)', borderRadius: 8, padding: '0.32rem 0.5rem', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* terminal */}
      <div
        ref={termRef}
        style={{
          background: '#020407',
          border: '1px solid var(--border-base)',
          borderRadius: 10,
          padding: '0.85rem 1rem',
          fontFamily: 'var(--mono)',
          fontSize: '0.7rem',
          lineHeight: 1.75,
          flex: 1,
          minHeight: 220,
          maxHeight: 340,
          overflowY: 'auto',
        }}
      >
        {visible.length === 0 ? (
          <span style={{ color: 'var(--text-4)', fontStyle: 'italic' }}>
            Awaiting network events…
          </span>
        ) : (
          visible.slice(-60).map((log, i) => {
            const tag  = getTag(log.type || '');
            const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false });
            const payload = typeof log.payload === 'object' ? JSON.stringify(log.payload) : (log.payload || '');

            return (
              <div key={log.id || i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', padding: '0.05rem 0', borderBottom: '1px solid rgba(255,255,255,0.015)' }}>
                <span style={{ color: 'var(--text-4)', flexShrink: 0 }}>{time}</span>
                <span className={tag.cls} style={{ flexShrink: 0, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6rem', background: 'rgba(255,255,255,0.04)', padding: '0.05rem 0.4rem', borderRadius: 4 }}>
                  {tag.label}
                </span>
                <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>[{log.source || 'GATEWAY'}]</span>
                <span style={{ color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: '#e2e8f0' }}>{log.type}</strong>
                  {payload && <span style={{ color: 'var(--text-3)' }}> {payload.slice(0, 120)}</span>}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* count */}
      <div style={{ fontSize: '0.67rem', color: 'var(--text-4)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
        {visible.length} events
      </div>
    </div>
  );
}
