import React, { useState } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import {
  Car, Zap, MapPin, CheckCircle2, AlertTriangle,
  ArrowRightLeft, Navigation, Battery, BatteryCharging,
  Ticket, LocateFixed, Hash, User, ShieldCheck, BookmarkCheck,
  ExternalLink, Unlock, Sparkles, Check, X, Maximize2, AlertOctagon
} from 'lucide-react';

const STATION_DEFS = [
  { 
    id: 'STA-001', 
    name: 'Tata Power EV Charging Station', 
    shortName: 'Tata Power (Nigdi)',
    location: 'Plot no 140, Sector Number 23, Shree Vihar, Transport Nagar, Nigdi, Pimpri-Chinchwad, Maharashtra 411044',
    mapsQuery: 'Tata Power EV Charging Station, Plot no 140, Sector Number 23, Shree Vihar, Transport Nagar, Nigdi, Pimpri-Chinchwad, Maharashtra 411044',
    dist: 1.8, 
    drive: '4 min',  
    color: '#10b981', 
    glow: 'rgba(16,185,129,0.3)',  
    url: 'http://localhost:5001' 
  },
  { 
    id: 'STA-003', 
    name: 'Nikol Charging Station', 
    shortName: 'Nikol (Nigdi)',
    location: 'Sector 32 A, Nigdi, Pimpri-Chinchwad, Maharashtra 412101',
    mapsQuery: 'Nikol Charging Station, Sector 32 A, Nigdi, Pimpri-Chinchwad, Maharashtra 412101',
    dist: 2.6, 
    drive: '6 min', 
    color: '#a855f7', 
    glow: 'rgba(168,85,247,0.3)',  
    url: 'http://localhost:5003' 
  },
  { 
    id: 'STA-002', 
    name: 'ChargeZone EV Charging Station', 
    shortName: 'ChargeZone (Wakad)',
    location: 'No 136/1A/6, Old Mumbai - Pune Hwy, Mane Wasti, Kemse Vasti, Wakad, Pimpri-Chinchwad, Maharashtra 411057',
    mapsQuery: 'ChargeZone EV Charging Station, No 136/1A/6, Old Mumbai - Pune Hwy, Mane Wasti, Kemse Vasti, Wakad, Pimpri-Chinchwad, Maharashtra 411057',
    dist: 3.2, 
    drive: '7 min',  
    color: '#06b6d4', 
    glow: 'rgba(6,182,212,0.3)',   
    url: 'http://localhost:5002' 
  },
];

/* ── Big View Modal Popup for the Active Pass ── */
function FullPassModal({ 
  resvState, 
  fleetData = [],
  onActionFeedback, 
  onRefresh, 
  onDismiss, 
  onClose,
  onReReroute
}) {
  const { data, userId, vehicleId, depleted, actionType = 'RESERVE' } = resvState;
  const resv      = data.reservation || data;
  const battery   = resv?.battery || {};
  const batId     = battery.id    || resv?.batteryId   || '—';
  const batCharge = battery.charge ?? resv?.charge ?? '—';
  const batType   = battery.type  || 'Lithium-Ion Pack';

  const [swapLoading, setSwapLoading]     = useState(false);
  const [swapCompleted, setSwapCompleted] = useState(false);

  // Which station was actually allocated?
  const allocStationId = resv?.stationId || battery?.stationId || data?.reservation?.stationId || (data?.fallbackOccurred
    ? (STATION_DEFS.find(s => data?.fallbackReason?.includes(s.name) || data?.fallbackReason?.includes(s.shortName))?.id || 'STA-003')
    : null);

  const allocDef = STATION_DEFS.find(s => s.id === allocStationId) ||
                   STATION_DEFS.find(s => data?.fallbackReason?.includes(s.name) || data?.fallbackReason?.includes(s.shortName)) ||
                   STATION_DEFS[0];

  // Check if this allocated station is currently DRAINED (0 available)
  const stationAvail = fleetData.find(f => f.stationId === allocDef.id)?.batteries?.filter(b => b.status === 'AVAILABLE').length ?? 0;
  const isDrained = stationAvail === 0;

  const cardColor = isDrained ? '#f43f5e' : allocDef.color;
  const cardGlow  = isDrained ? 'rgba(244,63,94,0.45)' : allocDef.glow;

  const bayNum = batId.replace(/[^0-9]/g, '') || '01';
  const passTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  const passDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Direct Google Maps Directions URL
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(allocDef.mapsQuery)}`;

  // Handler to Unlock Bay & Complete Swap
  const handleUnlockAndSwap = async () => {
    setSwapLoading(true);
    try {
      await axios.post(`${allocDef.url}/api/swap`, {
        reservedBatteryId: batId,
        returnBatteryCharge: depleted,
        userId: battery.reservedBy || userId,
        vehicleId: battery.vehicleId || vehicleId,
      });

      setSwapCompleted(true);
      onActionFeedback?.({
        type: 'success',
        message: `🎉 Bay ${bayNum} Unlocked at ${allocDef.name}! Dispensed ${batId} (${batCharge}%) to ${userId}. Depleted pack inserted for charging.`
      });
      onRefresh?.();
      try { confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } }); } catch {}

      // Automatically dismiss the reservation and close modal after swap
      setTimeout(() => {
        onDismiss?.();
        onClose?.();
      }, 3200);

    } catch (err) {
      onActionFeedback?.({
        type: 'error',
        message: `Failed to unlock bay: ${err.response?.data?.message || err.message}`
      });
    } finally {
      setSwapLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(2, 6, 14, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease both',
    }} onClick={onClose}>
      
      <div style={{
        maxWidth: 640,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        animation: 'fadeSlideUp 0.28s ease both'
      }} onClick={e => e.stopPropagation()}>

        {/* ── PASS CARD INSIDE MODAL (TURNS RED IF DRAINED) ── */}
        <div style={{
          borderRadius: 18,
          overflow: 'hidden',
          border: `1px solid ${swapCompleted ? '#10b981' : cardColor}88`,
          boxShadow: `0 0 50px -8px ${swapCompleted ? 'rgba(16,185,129,0.4)' : cardGlow}, 0 12px 40px rgba(0,0,0,0.85)`,
        }}>

          {/* Top Header Bar */}
          <div style={{
            background: swapCompleted 
              ? 'linear-gradient(135deg, #059669, #10b981)' 
              : isDrained
                ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
                : `linear-gradient(135deg, ${allocDef.color}cc, ${allocDef.color}66)`,
            padding: '1.1rem 1.4rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {swapCompleted ? (
                <Sparkles size={24} color="#fff" />
              ) : isDrained ? (
                <AlertOctagon size={24} color="#fff" />
              ) : (
                <CheckCircle2 size={24} color="#fff" />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', letterSpacing: '-0.02em' }}>
                  {swapCompleted 
                    ? '🎉 Battery Swapped & Unlocked Successfully!' 
                    : isDrained
                      ? '⚠️ Warning: Reserved Station is Drained!'
                      : (actionType === 'SWAP' ? 'Battery Swap Pass ✓' : 'Active Battery Reservation Pass ✓')}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                  {passDate} · {passTime} · {isDrained ? 'Local stock is 0 — RPC Reroute Recommended' : 'Station Socket Locked & Ready'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isDrained ? (
                <span className="pill red" style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.4)', border: '1px solid #fff', padding: '0.2rem 0.6rem', color: '#fff' }}>
                  DRAINED (0 AVAIL)
                </span>
              ) : data.fallbackOccurred ? (
                <span className="pill amber" style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.7)', padding: '0.2rem 0.6rem' }}>
                  <ArrowRightLeft size={11} /> RPC FALLBACK
                </span>
              ) : null}
              
              <button 
                onClick={onClose} 
                style={{ background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%', color: '#fff', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ background: 'rgba(6,10,18,0.98)', padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

            {/* Drained Alert Banner */}
            {isDrained && (
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: 12,
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                color: '#fb7185',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color="#f43f5e" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Station Stock Depleted:</strong> This station has 0 remaining packs.
                  </div>
                </div>
                {onReReroute && (
                  <button onClick={onReReroute} className="btn btn-cyan" style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', flexShrink: 0 }}>
                    <ArrowRightLeft size={12} /> Auto-Reroute to Nearest ({STATION_DEFS[1].name})
                  </button>
                )}
              </div>
            )}

            {/* Station + Bay row */}
            <div style={{ display: 'flex', gap: '0.85rem' }}>
              {/* Station box */}
              <div style={{
                flex: 1, padding: '1.1rem', borderRadius: 14,
                background: isDrained ? 'rgba(244, 63, 94, 0.1)' : `${allocDef.color}12`,
                border: `1px solid ${cardColor}44`,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: cardColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Assigned Station {isDrained && '(DRAINED)'}
                  </span>
                  <span className="mono" style={{ fontSize: '0.65rem', color: cardColor, background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                    {allocDef.id}
                  </span>
                </div>

                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginTop: 2 }}>
                  {allocDef.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.74rem', color: 'var(--text-2)', marginTop: 4 }}>
                  <MapPin size={14} color={cardColor} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{allocDef.location}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: isDrained ? '#fb7185' : '#38bdf8', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                  <LocateFixed size={12} color={isDrained ? '#fb7185' : '#38bdf8'} />
                  <span><strong>{allocDef.dist} km</strong> away · <strong>{allocDef.drive}</strong> drive</span>
                </div>
              </div>

              {/* Bay / Socket box */}
              <div style={{
                width: 130, padding: '1rem', borderRadius: 14,
                background: swapCompleted ? 'rgba(16,185,129,0.15)' : isDrained ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.06)',
                border: `1px solid ${swapCompleted ? '#10b981' : isDrained ? '#f43f5e' : 'rgba(16,185,129,0.3)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: isDrained ? '#fb7185' : '#34d399', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bay / Socket</div>
                <div className="mono" style={{ fontSize: '2.2rem', fontWeight: 800, color: isDrained ? '#fb7185' : '#34d399', lineHeight: 1 }}>
                  {bayNum}
                </div>
                <BatteryCharging size={20} color={isDrained ? '#fb7185' : '#34d399'} className={swapCompleted ? '' : 'animate-pulse'} />
                <div style={{ fontSize: '0.62rem', color: swapCompleted ? '#34d399' : isDrained ? '#fb7185' : 'var(--text-3)', fontWeight: 700 }}>
                  {swapCompleted ? '✓ Swapped' : isDrained ? 'Station Drained' : 'Reserved & Locked'}
                </div>
              </div>
            </div>

            {/* Battery detail row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.65rem' }}>
              {[
                { icon: Hash,           label: 'Battery Pack',    value: batId,          color: isDrained ? '#fb7185' : '#38bdf8' },
                { icon: Battery,        label: 'Charge Level',    value: `${batCharge}%`, color: batCharge > 70 ? '#34d399' : batCharge > 40 ? '#f59e0b' : '#f43f5e' },
                { icon: BatteryCharging,label: 'Type',            value: batType.split('(')[0].trim(), color: '#c084fc' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{ padding: '0.7rem 0.85rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-base)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <Icon size={11} color={color} />
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Charge bar comparison */}
            {typeof batCharge === 'number' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-3)', marginBottom: 5, fontFamily: 'var(--mono)' }}>
                  <span>Your vehicle: <strong style={{ color: '#f43f5e' }}>{depleted}%</strong></span>
                  <span>Assigned pack: <strong style={{ color: isDrained ? '#fb7185' : '#34d399' }}>{batCharge}%</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${depleted}%`, background: '#f43f5e', borderRadius: 99 }} />
                  </div>
                  <ArrowRightLeft size={12} color="var(--text-3)" />
                  <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${batCharge}%`, background: isDrained ? '#f43f5e' : '#34d399', borderRadius: 99, boxShadow: `0 0 8px ${isDrained ? 'rgba(244,63,94,0.5)' : 'rgba(52,211,153,0.5)'}`, transition: 'width 1s ease' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Rider details */}
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              {[
                { icon: User,  label: 'Driver ID',   value: battery.reservedBy || userId },
                { icon: Car,   label: 'Vehicle Plate', value: battery.vehicleId || vehicleId },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.85rem', borderRadius: 9, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-base)' }}>
                  <Icon size={13} color="var(--text-3)" />
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 800 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fallback reason (if any) */}
            {data.fallbackOccurred && data.fallbackReason && (
              <div style={{ padding: '0.65rem 0.85rem', borderRadius: 9, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.72rem', color: '#fbbf24', lineHeight: 1.5 }}>
                <ArrowRightLeft size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                {data.fallbackReason}
              </div>
            )}

            {/* ── ACTION BUTTONS IN MODAL ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.25rem' }}>
              
              {/* Primary "Unlock Bay & Complete Swap" Action Button */}
              {!swapCompleted ? (
                <button
                  onClick={handleUnlockAndSwap}
                  disabled={swapLoading}
                  className="btn btn-green"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    background: isDrained 
                      ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
                      : 'linear-gradient(135deg, #059669, #10b981)',
                    boxShadow: isDrained
                      ? '0 4px 24px rgba(244, 63, 94, 0.45)'
                      : '0 4px 24px rgba(16, 185, 129, 0.45)'
                  }}
                >
                  <Unlock size={18} />
                  <span>{swapLoading ? 'Unlocking Bay Socket…' : `⚡ Unlock Bay ${bayNum} & Complete Swap`}</span>
                </button>
              ) : (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: '#34d399',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  <Check size={18} color="#34d399" />
                  <span>Swap Complete! Dispensed Pack Installed.</span>
                </div>
              )}

              {/* Navigation & Cancel */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-cyan"
                  style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    textDecoration: 'none', 
                    padding: '0.7rem',
                    fontSize: '0.82rem'
                  }}
                >
                  <Navigation size={15} />
                  <span>Navigate on Google Maps</span>
                  <ExternalLink size={12} style={{ marginLeft: 3, opacity: 0.8 }} />
                </a>

                <button onClick={() => { onDismiss?.(); onClose?.(); }} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '0.7rem' }}>
                  <ArrowRightLeft size={14} /> Cancel Reservation
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Main Driver Portal ── */
export default function DriverPortal({ 
  stations = [], 
  fleetData = [], 
  driverId = 'EV-DRIVER-101', 
  setDriverId, 
  vehicleId = 'KA-01-EV-2024', 
  setVehicleId, 
  activeReservation,
  setActiveReservation,
  onActionFeedback, 
  onRefresh 
}) {
  const [depleted,   setDepleted]   = useState(15);
  const [preferred,  setPreferred]  = useState('STA-001');
  const [loading,    setLoading]    = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showModal,  setShowModal]  = useState(false);

  const getStationData = id => stations.find(s => s.id === id) || {};
  const getAvail       = id => fleetData.find(f => f.stationId === id)?.batteries?.filter(b => b.status === 'AVAILABLE').length ?? 0;

  // Find nearest available station
  const findNearestAvailableStation = (origId) => {
    const onlineWithStock = STATION_DEFS
      .filter(s => s.id !== origId && getAvail(s.id) > 0 && getStationData(s.id).status === 'ONLINE')
      .sort((a, b) => a.dist - b.dist);
    return onlineWithStock[0] || null;
  };

  // 1. Reserve Battery Pack Workflow
  const handleReserve = async () => {
    setLoading(true);
    setActionError(null);

    let targetStationId = preferred;

    // Proximity check: If preferred station is drained, find nearest available station first
    if (getAvail(preferred) === 0) {
      const nearest = findNearestAvailableStation(preferred);
      if (nearest) {
        targetStationId = nearest.id;
      }
    }

    try {
      const r = await axios.post('http://localhost:5000/api/smart-swap', {
        preferredStationId: targetStationId,
        userId: driverId || 'EV-DRIVER-101',
        vehicleId: vehicleId || 'KA-01-EV-2024',
        returnBatteryCharge: depleted,
      });

      // If we manually redirected to nearest, inject fallback info
      if (targetStationId !== preferred && !r.data.fallbackOccurred) {
        const origDef = STATION_DEFS.find(s => s.id === preferred);
        const nearDef = STATION_DEFS.find(s => s.id === targetStationId);
        r.data.fallbackOccurred = true;
        r.data.fallbackReason = `${origDef.name} was out of batteries (0 available). Automatically allocated to nearest station: ${nearDef.name} (${nearDef.dist} km away).`;
      }

      const resvState = {
        data: r.data,
        userId: driverId || 'EV-DRIVER-101',
        vehicleId: vehicleId || 'KA-01-EV-2024',
        depleted,
        actionType: 'RESERVE',
      };

      // Set active reservation in persistent state (App.jsx + localStorage)
      setActiveReservation?.(resvState);

      const resv  = r.data.reservation || r.data;
      const batId = resv?.battery?.id || '—';
      onActionFeedback?.({ 
        type: 'success', 
        message: `Pack ${batId} reserved at ${STATION_DEFS.find(s => s.id === targetStationId)?.name}!${r.data.fallbackOccurred ? ' (Proximity Fallback)' : ''}` 
      });
      onRefresh?.();
      try { confetti({ particleCount: 80, spread: 80, origin: { y: 0.55 } }); } catch {}
    } catch (e) {
      setActionError(e.response?.data?.message || e.message);
      onActionFeedback?.({ type: 'error', message: e.response?.data?.message || e.message });
    } finally { setLoading(false); }
  };

  // 2. Instant Swap Workflow
  const handleInstantSwap = async () => {
    setLoading(true);
    setActionError(null);

    let targetStationId = preferred;

    // Proximity check: If preferred station is drained, find nearest available station first
    if (getAvail(preferred) === 0) {
      const nearest = findNearestAvailableStation(preferred);
      if (nearest) {
        targetStationId = nearest.id;
      }
    }

    try {
      const r = await axios.post('http://localhost:5000/api/smart-swap', {
        preferredStationId: targetStationId,
        userId: driverId || 'EV-DRIVER-101',
        vehicleId: vehicleId || 'KA-01-EV-2024',
        returnBatteryCharge: depleted,
      });

      // If we manually redirected to nearest, inject fallback info
      if (targetStationId !== preferred && !r.data.fallbackOccurred) {
        const origDef = STATION_DEFS.find(s => s.id === preferred);
        const nearDef = STATION_DEFS.find(s => s.id === targetStationId);
        r.data.fallbackOccurred = true;
        r.data.fallbackReason = `${origDef.name} was out of batteries (0 available). Nearest available station is ${nearDef.name} (${nearDef.dist} km away).`;
      }

      const resvState = {
        data: r.data,
        userId: driverId || 'EV-DRIVER-101',
        vehicleId: vehicleId || 'KA-01-EV-2024',
        depleted,
        actionType: 'SWAP',
      };

      setActiveReservation?.(resvState);

      const resv  = r.data.reservation || r.data;
      const batId = resv?.battery?.id || '—';
      onActionFeedback?.({ 
        type: 'success', 
        message: `Swap approved! Pack ${batId} assigned at ${STATION_DEFS.find(s => s.id === targetStationId)?.name}.` 
      });
      onRefresh?.();
      try { confetti({ particleCount: 80, spread: 80, origin: { y: 0.55 } }); } catch {}
    } catch (e) {
      setActionError(e.response?.data?.message || e.message);
      onActionFeedback?.({ type: 'error', message: e.response?.data?.message || e.message });
    } finally { setLoading(false); }
  };

  // Helper for small card details & DRAINED CHECK
  const activeResvData = activeReservation?.data?.reservation || activeReservation?.data;
  const activeBatId    = activeResvData?.battery?.id || activeResvData?.batteryId || '—';
  const activeCharge   = activeResvData?.battery?.charge ?? activeResvData?.charge ?? '—';
  const activeBayNum   = activeBatId.replace(/[^0-9]/g, '') || '01';
  const activeStationId = activeResvData?.stationId || activeResvData?.battery?.stationId || activeReservation?.data?.reservation?.stationId || (activeReservation?.data?.fallbackOccurred
    ? (STATION_DEFS.find(s => activeReservation?.data?.fallbackReason?.includes(s.name) || activeReservation?.data?.fallbackReason?.includes(s.shortName))?.id || 'STA-003')
    : null);
  const activeAllocDef = STATION_DEFS.find(s => s.id === activeStationId) ||
                         STATION_DEFS.find(s => activeReservation?.data?.fallbackReason?.includes(s.name) || activeReservation?.data?.fallbackReason?.includes(s.shortName)) ||
                         STATION_DEFS[0];

  // Dynamic Drained Check: Check if currently allocated station has 0 available batteries
  const isAllocDrained = (fleetData.find(f => f.stationId === activeAllocDef.id)?.batteries?.filter(b => b.status === 'AVAILABLE').length ?? 0) === 0;

  const smallCardColor = isAllocDrained ? '#f43f5e' : activeAllocDef.color;
  const smallCardGlow  = isAllocDrained ? 'rgba(244, 63, 94, 0.45)' : activeAllocDef.glow;

  return (
    <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Full Pass Big View Modal (Opens when small card is clicked) */}
      {showModal && activeReservation && (
        <FullPassModal
          resvState={activeReservation}
          fleetData={fleetData}
          onActionFeedback={onActionFeedback}
          onRefresh={onRefresh}
          onDismiss={() => setActiveReservation?.(null)}
          onClose={() => setShowModal(false)}
          onReReroute={() => { setShowModal(false); handleInstantSwap(); }}
        />
      )}

      {/* Header */}
      <div className="card card-cyan" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), var(--bg-card))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.5)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 3 }}>
              EV Driver Self-Service Portal (Pune Network)
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              Reserve your battery pack in advance or request an instant swap across Nigdi &amp; Wakad charging stations
            </p>
          </div>
        </div>
      </div>

      {/* ── BOOKING FORM GRID ── */}
      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* Left: Station selector + Driver Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Station Selection */}
          <div className="card">
            <p className="section-label"><Navigation size={12} /> Select Target Station (Pune Network)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {STATION_DEFS.map(def => {
                const st    = getStationData(def.id);
                const avail = getAvail(def.id);
                const online= st.status === 'ONLINE';
                const sel   = preferred === def.id;
                const isItemDrained = avail === 0;

                return (
                  <div
                    key={def.id}
                    onClick={() => online && setPreferred(def.id)}
                    style={{
                      padding: '0.95rem 1.1rem', borderRadius: 12,
                      border: `1px solid ${sel ? (isItemDrained ? '#f43f5e' : def.color) : 'var(--border-base)'}`,
                      background: sel ? (isItemDrained ? 'rgba(244,63,94,0.1)' : `${def.color}0d`) : 'rgba(6,10,18,0.6)',
                      cursor: online ? 'pointer' : 'not-allowed',
                      opacity: online ? 1 : 0.5,
                      transition: 'all 0.2s',
                      boxShadow: sel ? `0 0 18px -4px ${isItemDrained ? 'rgba(244,63,94,0.4)' : def.glow}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: isItemDrained ? '#f43f5e' : def.color }} className="animate-pulse" />}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{def.name}</strong>
                            <span className="mono" style={{ fontSize: '0.65rem', color: isItemDrained ? '#f43f5e' : def.color }}>{def.id}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                            <MapPin size={11} color={isItemDrained ? '#f43f5e' : def.color} /> {def.location}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: isItemDrained ? '#fb7185' : '#38bdf8', marginTop: 2 }}>
                            {def.dist} km · {def.drive} drive {isItemDrained ? '· (DEPLETED)' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--mono)', color: avail > 0 ? def.color : '#f43f5e' }}>{avail}</div>
                        <div style={{ fontSize: '0.62rem', color: avail > 0 ? 'var(--text-3)' : '#f43f5e', fontWeight: avail > 0 ? 'normal' : 'bold' }}>
                          {avail > 0 ? 'available' : 'DRAINED'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver Profile Form */}
          <div className="card">
            <p className="section-label"><User size={12} /> Driver Profile &amp; Vehicle</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
                  Driver ID / Name (Stored in Reservation)
                </label>
                <input 
                  value={driverId} 
                  onChange={e => setDriverId ? setDriverId(e.target.value) : null} 
                  placeholder="e.g. EV-DRIVER-101"
                  className="input-control mono" 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
                  Vehicle License Plate
                </label>
                <input 
                  value={vehicleId} 
                  onChange={e => setVehicleId ? setVehicleId(e.target.value) : null} 
                  placeholder="e.g. MH-14-EV-2024"
                  className="input-control mono" 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
                  Current Battery Charge: <strong style={{ color: '#f43f5e' }}>{depleted}%</strong>
                </label>
                <input type="range" min={1} max={40} value={depleted} onChange={e => setDepleted(+e.target.value)} style={{ width: '100%', accentColor: '#f43f5e' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-4)', marginTop: 3 }}>
                  <span>1% critical</span><span>40% low</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Reservation & Swap Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="card">
            <p className="section-label"><Zap size={12} /> Station Action Dispatcher</p>
            
            <div style={{ padding: '1.35rem', background: 'rgba(5,8,14,0.6)', borderRadius: 12, border: '1px solid var(--border-base)', marginBottom: '1.15rem' }}>
              <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '0.5rem', textAlign: 'center' }}>
                Target Allocation Destination
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: '0.86rem', fontWeight: 700 }}>
                <span style={{ color: '#f43f5e' }}>Depleted ({depleted}%)</span>
                <ArrowRightLeft size={16} color="var(--text-3)" />
                <span style={{ color: getAvail(preferred) > 0 ? '#34d399' : '#f43f5e' }}>
                  {STATION_DEFS.find(s => s.id === preferred)?.name} ({preferred})
                </span>
              </div>
              
              {/* Drained / Out-of-stock Alert */}
              {getAvail(preferred) === 0 && (
                <div style={{
                  marginTop: '0.85rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  textAlign: 'left'
                }}>
                  <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: '0.73rem', color: '#fbbf24', lineHeight: 1.45 }}>
                    <strong>{STATION_DEFS.find(s => s.id === preferred)?.name} is Depleted (0 Available):</strong>
                    <div style={{ color: 'var(--text-2)', marginTop: 2 }}>
                      Click <strong>"Execute Instant Swap"</strong> below. The system will automatically reroute to the nearest available station: <strong>{STATION_DEFS[1].name} (2.6 km away in Nigdi)</strong>!
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>
                Reserving locks the battery exclusively for <strong style={{ color: '#38bdf8' }}>{driverId}</strong> in the hardware bay rack.
              </div>
            </div>

            {/* Action Buttons: 1. Reserve Pack, 2. Smart Swap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={handleReserve} 
                disabled={loading} 
                className="btn btn-cyan" 
                style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.85rem' }}
              >
                <BookmarkCheck size={16} />
                {loading ? 'Reserving Pack…' : `Reserve Battery Pack for ${driverId}`}
              </button>

              <button 
                onClick={handleInstantSwap} 
                disabled={loading} 
                className="btn btn-green" 
                style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.85rem' }}
              >
                <Zap size={16} />
                {loading ? 'Processing Swap…' : 'Execute Instant Swap'}
              </button>
            </div>
          </div>

          {/* Error display */}
          {actionError && (
            <div className="card card-rose">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#fb7185', marginBottom: 4 }}>Request Failed</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{actionError}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── SMALL RESERVATION CARD (TURNS RED IF DRAINED) ── */}
          {activeReservation && (
            <div
              onClick={() => setShowModal(true)}
              className="card"
              style={{
                cursor: 'pointer',
                border: `1px solid ${smallCardColor}`,
                background: isAllocDrained 
                  ? 'linear-gradient(135deg, rgba(244,63,94,0.18), rgba(6,10,18,0.95))'
                  : `linear-gradient(135deg, ${activeAllocDef.color}14, rgba(6,10,18,0.9))`,
                boxShadow: `0 0 24px -4px ${smallCardGlow}`,
                padding: '1.1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'all 0.22s ease',
                animation: 'fadeSlideUp 0.25s ease both'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = smallCardColor;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 28px -2px ${smallCardGlow}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = smallCardColor;
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = `0 0 24px -4px ${smallCardGlow}`;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: isAllocDrained ? 'rgba(244,63,94,0.22)' : `${activeAllocDef.color}22`,
                  border: `1px solid ${smallCardColor}66`,
                  color: smallCardColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isAllocDrained ? <AlertOctagon size={22} color="#f43f5e" /> : <Ticket size={22} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{activeAllocDef.name}</strong>
                    <span className={`pill ${isAllocDrained ? 'red' : 'green'}`} style={{ fontSize: '0.58rem', padding: '0.1rem 0.4rem' }}>
                      {isAllocDrained ? 'DRAINED (0 AVAIL)' : `BAY ${activeBayNum}`}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Pack: <strong style={{ color: isAllocDrained ? '#fb7185' : '#38bdf8' }}>{activeBatId}</strong> ({activeCharge}%)</span>
                    <span>·</span>
                    <span style={{ color: isAllocDrained ? '#fb7185' : '#c084fc' }}>
                      {isAllocDrained ? '⚠️ Station Stock Depleted' : `Locked: ${driverId}`}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: smallCardColor, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                <span>{isAllocDrained ? 'View & Reroute' : 'View & Unlock'}</span>
                <Maximize2 size={14} />
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
