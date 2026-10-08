import React from 'react';
import { BookOpen, X, CheckCircle, Cpu, Network, Layers, ShieldCheck, ArrowRightLeft, Radio } from 'lucide-react';

export default function SyllabusModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const mappings = [
    {
      syllabus: 'Distributed Systems',
      implementation: 'Station A (5001), Station B (5002), Station C (5003) operate as independent processes with isolated data storage.',
      icon: Cpu,
      color: '#34d399'
    },
    {
      syllabus: 'Types of Distributed Systems',
      implementation: 'Distributed client-server and peer-to-peer hybrid mesh topology with Gateway middleware.',
      icon: Network,
      color: '#38bdf8'
    },
    {
      syllabus: 'Multi-Node Architecture',
      implementation: 'Heterogeneous nodes (Stations A/B/C + Gateway + React Dashboard) communicating over standard network protocols.',
      icon: Layers,
      color: '#c084fc'
    },
    {
      syllabus: 'Design Issues: Consistency & Communication',
      implementation: 'Local database autonomy (no single shared database bottleneck) with state consistency achieved via RPC synchronization.',
      icon: ArrowRightLeft,
      color: '#fbbf24'
    },
    {
      syllabus: 'Middleware',
      implementation: 'Gateway reverse proxy, service registry, health poller, and message dispatcher on port 5000.',
      icon: Layers,
      color: '#60a5fa'
    },
    {
      syllabus: 'RPC (Remote Procedure Call)',
      implementation: 'Direct inter-station REST RPC (POST /api/rpc/query-available and POST /api/rpc/reserve-forward) when local node is depleted.',
      icon: ArrowRightLeft,
      color: '#34d399'
    },
    {
      syllabus: 'Message-Oriented Communication',
      implementation: 'Battery lifecycle events (Reserved, Released, Swapped, Drained) broadcast asynchronously across the network.',
      icon: Radio,
      color: '#f87171'
    },
    {
      syllabus: 'Stream-Oriented Communication',
      implementation: 'WebSocket (Socket.IO) real-time state telemetry streaming without client page reload.',
      icon: Radio,
      color: '#38bdf8'
    },
    {
      syllabus: 'Fault Tolerance & Failure Detection',
      implementation: 'Heartbeat polling detects node crashes (ONLINE -> OFFLINE). Network gracefully routes around offline nodes without termination.',
      icon: ShieldCheck,
      color: '#34d399'
    }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        
        {/* Header */}
        <div className="modal-header">
          <div className="card-title-group">
            <div className="card-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="card-title">Distributed Systems Syllabus Alignment Matrix</h2>
              <p className="card-subtitle">Academic Concept Mapping & Evaluation Guide</p>
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
          <div className="grid-2">
            {mappings.map((m, idx) => {
              const Icon = m.icon;

              return (
                <div 
                  key={idx} 
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(5, 8, 14, 0.65)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', color: m.color, flexShrink: 0, marginTop: '2px' }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: '#ffffff', display: 'block', marginBottom: '0.2rem' }}>{m.syllabus}</strong>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{m.implementation}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Demonstration Guide */}
          <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(5, 8, 14, 0.8)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#34d399', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle size={15} />
              Suggested 6-Step Faculty Demo Flow
            </h4>
            <ol style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }} className="mono">
              <li><strong style={{ color: '#ffffff' }}>Start Network:</strong> Show Station A, B, C running on ports 5001, 5002, 5003 with 🟢 ONLINE status.</li>
              <li><strong style={{ color: '#ffffff' }}>Local Reservation:</strong> Reserve battery B001 at Station A; observe real-time WebSocket update (Available: 7 → 6).</li>
              <li><strong style={{ color: '#ffffff' }}>Drain Station A:</strong> Click "Drain" on Station A to simulate 0 available batteries.</li>
              <li><strong style={{ color: '#ffffff' }}>Inter-Station RPC:</strong> Request a swap at Station A; observe RPC discovery packet queried to Station B & C and fallback allocated.</li>
              <li><strong style={{ color: '#ffffff' }}>Fault Tolerance (Crash):</strong> Stop Station B process; observe Gateway flag Station B 🔴 OFFLINE while A and C remain active.</li>
              <li><strong style={{ color: '#ffffff' }}>Recovery:</strong> Restart Station B; observe instant recovery back to 🟢 ONLINE state without restarting other nodes.</li>
            </ol>
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
