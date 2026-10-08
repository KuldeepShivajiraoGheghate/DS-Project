import React, { useState } from 'react';
import { 
  Flame, 
  X, 
  RotateCcw, 
  ZapOff, 
  ShieldCheck
} from 'lucide-react';
import axios from 'axios';

export default function ChaosPanel({ 
  isOpen, 
  onClose, 
  stations = [], 
  onActionFeedback 
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDrainAll = async () => {
    setLoading(true);
    try {
      for (const st of stations) {
        if (st.status === 'ONLINE') {
          await axios.post(`${st.url}/api/chaos/drain`);
        }
      }
      onActionFeedback?.({
        type: 'warning',
        message: 'Drained all stations! System now has 0 available batteries across entire network.'
      });
    } catch (err) {
      onActionFeedback?.({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    setLoading(true);
    try {
      for (const st of stations) {
        if (st.status === 'ONLINE') {
          await axios.post(`${st.url}/api/chaos/reset`);
        }
      }
      onActionFeedback?.({
        type: 'success',
        message: 'All stations reset to default stock.'
      });
    } catch (err) {
      onActionFeedback?.({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(to right, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.9))' }}>
          <div className="card-title-group">
            <div className="card-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              <Flame size={18} />
            </div>
            <div>
              <h2 className="card-title">Distributed Fault Tolerance & Chaos Control Lab</h2>
              <p className="card-subtitle">Simulate Node Failures, Crash Scenarios & Resilience</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.55rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          
          {/* Node Status Grid */}
          <div>
            <h3 style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
              Independent Node Fault Simulation
            </h3>

            <div className="grid-3">
              {stations.map(st => {
                const isOnline = st.status === 'ONLINE';

                return (
                  <div 
                    key={st.id}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      background: isOnline ? 'rgba(5, 8, 14, 0.6)' : 'rgba(239, 68, 68, 0.1)',
                      border: isOnline ? '1px solid var(--border-subtle)' : '1px solid rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong className="mono" style={{ fontSize: '0.8rem', color: '#ffffff' }}>{st.id}</strong>
                        <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                          {st.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{st.name.split('(')[0]}</div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.68rem' }}>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        {isOnline ? `Port ${st.port} Active` : 'Heartbeat failure detected'}
                      </p>
                      
                      <div className="mono" style={{ padding: '0.35rem', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        Terminal: <br />
                        <span style={{ color: '#f87171' }}>Ctrl+C</span> to crash <br />
                        <span style={{ color: '#34d399' }}>npm run {st.code.replace('-', ':')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Simulation Presets */}
          <div>
            <h3 style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
              Fault Injection Test Actions
            </h3>

            <div className="grid-2">
              <button
                type="button"
                onClick={handleDrainAll}
                disabled={loading}
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: '700', fontSize: '0.78rem' }}>
                  <ZapOff size={15} />
                  <span>Drain All Stations to 0</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Drains all nodes to test complete network exhaustion failure mode.
                </p>
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                disabled={loading}
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: '700', fontSize: '0.78rem' }}>
                  <RotateCcw size={15} />
                  <span>Restore Factory Fleet State</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Refreshes all node databases back to standard initial battery inventory.
                </p>
              </button>
            </div>
          </div>

          {/* Explanation banner */}
          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.2rem' }}>Fault Tolerance in Action:</strong>
              When one distributed node (e.g. Station B) is terminated, the Gateway health poller flags it offline, and peer nodes gracefully route reservations to remaining active stations without terminating the entire system.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
