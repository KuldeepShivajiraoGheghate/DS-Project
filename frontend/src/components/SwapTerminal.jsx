import React, { useState } from 'react';
import { 
  Zap, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Car, 
  User, 
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';

export default function SwapTerminal({ 
  isOpen, 
  onClose, 
  stations = [], 
  onSuccess 
}) {
  const [selectedStation, setSelectedStation] = useState('STA-001');
  const [batteryType, setBatteryType] = useState('');
  const [userId, setUserId] = useState('EV-DRIVER-402');
  const [vehicleId, setVehicleId] = useState('KA-01-EV-2024');
  const [returnCharge, setReturnCharge] = useState(18);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const currentStationObj = stations.find(s => s.id === selectedStation);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await axios.post('/api/smart-swap', {
        preferredStationId: selectedStation,
        userId,
        vehicleId,
        batteryType: batteryType || undefined,
        returnCharge: Number(returnCharge)
      });

      setResult(resp.data);
      onSuccess?.();

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (err) {}
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSwap = async () => {
    if (!result?.reservation?.battery?.id && !result?.reservation?.id) return;
    const bId = result.reservation.battery ? result.reservation.battery.id : result.reservation.id;
    const targetStation = stations.find(s => s.id === (result.reservation.stationId || selectedStation));

    if (!targetStation) return;

    setLoading(true);
    try {
      const resp = await axios.post(`${targetStation.url}/api/swap`, {
        reservedBatteryId: bId,
        returnBatteryCharge: Number(returnCharge),
        userId,
        vehicleId
      });

      setResult((prev) => ({
        ...prev,
        swapCompleted: true,
        swapDetails: resp.data
      }));
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        
        {/* Header */}
        <div className="modal-header">
          <div className="card-title-group">
            <div className="card-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Zap size={18} />
            </div>
            <div>
              <h2 className="card-title">Smart Battery Swap & Reservation Terminal</h2>
              <p className="card-subtitle">Distributed Routing with Automatic Inter-Station RPC Failover</p>
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
          
          {/* Result Card */}
          {result && (
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: '700', marginBottom: '0.6rem' }}>
                <CheckCircle2 size={16} />
                <span>Battery Allocation Successful!</span>
              </div>

              {result.fallbackOccurred && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fbbf24', marginBottom: '0.75rem' }}>
                  <ArrowRightLeft size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Inter-Station RPC Routing Triggered:</strong>
                    <div style={{ fontSize: '0.74rem' }}>{result.fallbackReason}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'rgba(5, 8, 14, 0.7)', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }} className="mono">
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Battery Assigned:</span>
                  <strong style={{ color: '#ffffff' }}>{result.reservation?.battery?.id || 'Allocated'}</strong> ({result.reservation?.battery?.charge || 95}%)
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Station Node:</span>
                  <strong style={{ color: '#38bdf8' }}>{result.reservation?.stationName || currentStationObj?.name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Driver:</span>
                  <strong style={{ color: '#ffffff' }}>{userId}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Vehicle:</span>
                  <strong style={{ color: '#ffffff' }}>{vehicleId}</strong>
                </div>
              </div>

              {!result.swapCompleted ? (
                <button
                  type="button"
                  onClick={handleCompleteSwap}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.6rem' }}
                >
                  <RotateCcw size={14} />
                  Complete Physical Swap (Exchange Depleted Battery)
                </button>
              ) : (
                <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#34d399', fontWeight: '600', textAlign: 'center' }}>
                  ✅ Swap Complete! Depleted pack connected to charging dock.
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', fontSize: '0.75rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Preferred Station Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Select Destination Station Node
              </label>
              <div className="grid-3">
                {stations.map(st => (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStation(st.id)}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: selectedStation === st.id ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                      background: selectedStation === st.id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(5, 8, 14, 0.5)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <strong className="mono" style={{ fontSize: '0.75rem', color: '#ffffff' }}>{st.id}</strong>
                      <span className={`badge ${st.status === 'ONLINE' ? 'badge-online' : 'badge-offline'}`}>
                        {st.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.name}</div>
                    <div className="mono" style={{ fontSize: '0.68rem', color: '#34d399', marginTop: '0.2rem' }}>
                      {st.stats?.available ?? 0} available
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User & EV Details */}
            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  EV Driver / Subscriber ID
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    className="input-control mono"
                    style={{ paddingLeft: '30px' }}
                    placeholder="e.g. EV-USER-801"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  EV Vehicle Plate / Registration
                </label>
                <div style={{ position: 'relative' }}>
                  <Car size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    required
                    className="input-control mono"
                    style={{ paddingLeft: '30px' }}
                    placeholder="e.g. KA-05-EV-9999"
                  />
                </div>
              </div>
            </div>

            {/* Battery Spec & Incoming Depleted Charge */}
            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Battery Type Filter (Optional)
                </label>
                <select
                  value={batteryType}
                  onChange={(e) => setBatteryType(e.target.value)}
                  className="input-control"
                >
                  <option value="">Any Compatible Battery</option>
                  <option value="Lithium-Ion Standard (75kWh)">Lithium-Ion Standard (75kWh)</option>
                  <option value="LFP High-Rate Fast-Charge (90kWh)">LFP Fast-Charge (90kWh)</option>
                  <option value="Solid-State Extended Range (120kWh)">Solid-State (120kWh)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Current Depleted Battery Level (% to Return)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={returnCharge}
                    onChange={(e) => setReturnCharge(e.target.value)}
                    style={{ flex: 1, accentColor: '#10b981' }}
                  />
                  <strong className="mono" style={{ fontSize: '0.8rem', color: '#fbbf24', minWidth: '35px' }}>{returnCharge}%</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                <Sparkles size={14} />
                {loading ? 'Routing via Distributed Nodes...' : 'Request Battery Swap / Reserve'}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
