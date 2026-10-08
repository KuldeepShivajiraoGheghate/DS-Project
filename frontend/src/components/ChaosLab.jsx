import React, { useState } from 'react';
import axios from 'axios';
import { Flame, RotateCcw, ZapOff, ShieldCheck, Server } from 'lucide-react';

const NODE_META = {
  'STA-001': { name: 'Station A (Downtown Hub)',  port: 5001, code: 'station:a', color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
  'STA-002': { name: 'Station B (Tech Park)',     port: 5002, code: 'station:b', color: '#06b6d4', glow: 'rgba(6,182,212,0.3)' },
  'STA-003': { name: 'Station C (Airport Link)',  port: 5003, code: 'station:c', color: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
};

export default function ChaosLab({ stations = [], onActionFeedback, onRefresh }) {
  const [loading, setLoading] = useState(false);

  const runAll = async (endpoint, successMsg, feedbackType) => {
    setLoading(true);
    try {
      for (const st of stations) {
        if (st.status === 'ONLINE') await axios.post(`${st.url}${endpoint}`);
      }
      onActionFeedback?.({ type: feedbackType, message: successMsg });
      onRefresh?.();
    } catch (e) {
      onActionFeedback?.({ type: 'error', message: e.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <div className="card card-rose" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.08), var(--bg-card))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.5)', color: '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={26} className="animate-pulse" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', marginBottom: 3 }}>
                Distributed Fault Tolerance &amp; Chaos Engineering Lab
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                Simulate node crash failures, test heartbeat detection, and prove zero single-point-of-failure resiliency
              </p>
            </div>
          </div>
          <span className="pill red">CHAOS ACTIVE</span>
        </div>
      </div>

      {/* ── Node Failure Cards ── */}
      <div>
        <p className="section-label"><Server size={12} /> Autonomous Node Failure Testing</p>
        <div className="grid-3">
          {stations.map(st => {
            const meta    = NODE_META[st.id] || {};
            const online  = st.status === 'ONLINE';
            return (
              <div
                key={st.id}
                className="card"
                style={{
                  borderColor: online ? `${meta.color}55` : 'var(--border-rose)',
                  boxShadow: `var(--shadow-card), 0 0 24px -6px ${online ? meta.glow : 'rgba(244,63,94,0.25)'}`,
                  display: 'flex', flexDirection: 'column', gap: '1rem',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <strong className="mono" style={{ fontSize: '0.9rem', color: '#fff' }}>{st.id}</strong>
                      <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--text-3)' }}>:{meta.port}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 2 }}>{meta.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{st.location}</div>
                  </div>
                  <span className={`pill ${online ? 'green' : 'red'}`}>{st.status}</span>
                </div>

                {/* Telemetry */}
                <div className="mono" style={{ background: 'rgba(5,8,14,0.8)', border: '1px solid var(--border-base)', borderRadius: 8, padding: '0.65rem 0.85rem', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Heartbeat:</span>
                    <strong style={{ color: online ? '#34d399' : '#f87171' }}>{online ? `${st.latencyMs || 2}ms (OK)` : 'FAILED — TIMEOUT'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Available Stock:</span>
                    <strong style={{ color: '#34d399' }}>{st.stats?.available ?? 0} packs</strong>
                  </div>
                </div>

                {/* Terminal command */}
                <div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-3)', fontWeight: 600, marginBottom: 5 }}>Crash / Revive Terminal:</div>
                  <div className="mono" style={{ background: '#030508', borderRadius: 8, padding: '0.55rem 0.75rem', border: '1px solid var(--border-base)', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: '#fb7185' }}># To crash: Ctrl+C in the node terminal</span>
                    <span style={{ color: '#34d399' }}>npm run {meta.code}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Global Fault Injection ── */}
      <div className="card">
        <p className="section-label"><Flame size={12} /> Network-Wide Fault Injection</p>
        <div className="grid-2">
          {/* Drain */}
          <div style={{ padding: '1.15rem', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                <ZapOff size={17} /> Scenario 1: Complete Fleet Depletion
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                Drains all 3 stations to 0 available batteries simultaneously. Demonstrates how the smart coordinator detects total mesh exhaustion.
              </p>
            </div>
            <button onClick={() => runAll('/api/chaos/drain', 'All stations drained to 0. Test Smart Swap to see total exhaustion routing.', 'warning')}
              disabled={loading} className="btn btn-amber" style={{ alignSelf: 'flex-start' }}>
              <ZapOff size={13} /> Drain All to 0
            </button>
          </div>

          {/* Reset */}
          <div style={{ padding: '1.15rem', borderRadius: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#34d399', fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                <RotateCcw size={17} /> Scenario 2: Restore Factory Inventory
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                Resets all 3 station databases to factory defaults (6 batteries each), ready for new swap and reservation demonstrations.
              </p>
            </div>
            <button onClick={() => runAll('/api/chaos/reset', 'All stations restored to factory inventory!', 'success')}
              disabled={loading} className="btn btn-green" style={{ alignSelf: 'flex-start' }}>
              <RotateCcw size={13} /> Restore All
            </button>
          </div>
        </div>
      </div>

      {/* ── Academic Defense ── */}
      <div className="card" style={{ borderColor: 'rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.04)' }}>
        <div style={{ display: 'flex', gap: '0.9rem' }}>
          <ShieldCheck size={22} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 6, fontSize: '0.9rem' }}>
              Fault Tolerance Evaluation &amp; Academic Defense
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
              Each station node maintains <strong style={{ color: '#fff' }}>complete database autonomy</strong>. If Station B crashes, the Gateway Failure Detector detects the broken heartbeat within 2 seconds via its periodic health-poll loop. Station A and Station C continue fulfilling requests independently — demonstrating <strong style={{ color: '#fff' }}>zero single-point-of-failure</strong> in a distributed microservice mesh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
