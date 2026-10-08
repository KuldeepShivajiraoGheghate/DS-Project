import React from 'react';
import NetworkTopology from './NetworkTopology';
import { Server, Zap, Activity, Clock } from 'lucide-react';

export default function GlobalDashboard({ stations = [], fleetData = [], onReserveSuccess, onActionFeedback, onSelectStation }) {
  const online    = stations.filter(s => s.status === 'ONLINE').length;
  const available = stations.reduce((a, s) => a + (s.stats?.available || 0), 0);
  const charging  = stations.reduce((a, s) => a + (s.stats?.charging  || 0), 0);
  const reserved  = stations.reduce((a, s) => a + (s.stats?.reserved  || 0), 0);

  const kpis = [
    { label: 'Distributed Nodes',    value: `${online}/3`,  sub: 'Station A, B, C microservices',  icon: Server,   color: '#38bdf8', accent: '#38bdf8' },
    { label: 'Available Swap Stock', value: available,       sub: `~${available * 85} kWh ready`,   icon: Zap,      color: '#34d399', accent: '#34d399' },
    { label: 'In Charging Bays',     value: charging,        sub: 'Automated trickle active',        icon: Activity, color: '#fbbf24', accent: '#fbbf24' },
    { label: 'Active Reservations',  value: reserved,        sub: 'Distributed locks held',          icon: Clock,    color: '#c084fc', accent: '#c084fc' },
  ];

  return (
    <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── KPI Metrics Row ── */}
      <div className="kpi-grid">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div className="kpi-box" key={k.label} style={{ '--accent-color': k.accent }}>
              <div className="kpi-label">
                <span>{k.label}</span>
                <Icon size={13} color={k.color} />
              </div>
              <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Network Topology (Full Width) ── */}
      <div>
        <NetworkTopology stations={stations} onSelectStation={onSelectStation} />
      </div>

    </div>
  );
}
