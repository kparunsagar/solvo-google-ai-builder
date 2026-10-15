import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Compass, Bike, Clock, Gauge, BatteryCharging } from 'lucide-react';

interface BikeTrackingMapProps {
  customerLocality: string;
  customerLat?: number;
  customerLng?: number;
  bookingId: string;
  providerName?: string;
  status?: string;
  cityId?: string;
}

export const BikeTrackingMap: React.FC<BikeTrackingMapProps> = ({
  customerLocality,
  customerLat = 14.1670,
  customerLng = 75.0298,
  bookingId,
  providerName = 'Manjunath K (On Bike)',
  status = 'ON_THE_WAY',
  cityId = 'sagara'
}) => {
  // Live GPS telemetry from Python microservice
  const [telemetry, setTelemetry] = useState<any>({
    lat: customerLat - 0.012,
    lng: customerLng - 0.015,
    heading_deg: 45,
    speed_kmh: 32.5,
    remaining_km: 1.8,
    eta_mins: 7,
    progress_pct: 35
  });

  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    // Connect to Python WebSocket telemetry microservice (port 8001) with fallback
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`ws://${window.location.hostname}:8001/ws/tracking/${bookingId}`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'BIKE_LOCATION_UPDATE' && data.telemetry) {
            setTelemetry(data.telemetry);
          }
        } catch (e) {}
      };
    } catch (e) {}

    // Poll fallback if websocket closed
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8001/api/tracking/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.lat) {
            setTelemetry((prev: any) => ({ ...prev, ...data }));
          }
        }
      } catch (e) {}
    }, 2000);

    return () => {
      ws?.close();
      clearInterval(interval);
    };
  }, [bookingId]);

  // Start animated bike dispatch simulation
  const triggerSimulation = async () => {
    setIsSimulating(true);
    try {
      await fetch(
        `http://${window.location.hostname}:8001/api/tracking/simulate/${bookingId}?dest_lat=${customerLat}&dest_lng=${customerLng}`,
        { method: 'POST' }
      );
    } catch (e) {
      console.warn('Direct python simulation endpoint unreachable, using client animation', e);
      // Client-side smooth bike movement fallback
      let p = 0;
      const simTimer = setInterval(() => {
        p += 5;
        if (p > 100) {
          clearInterval(simTimer);
          setIsSimulating(false);
          return;
        }
        setTelemetry((prev: any) => ({
          ...prev,
          progress_pct: p,
          remaining_km: Math.max(0.1, Number((1.8 * (1 - p / 100)).toFixed(1))),
          eta_mins: Math.max(1, Math.round(7 * (1 - p / 100))),
          speed_kmh: p === 100 ? 0 : 31.0
        }));
      }, 1000);
    }
  };

  // Interpolated visual coordinates on canvas (0 to 100%)
  const bikeProgress = telemetry.progress_pct || 40;
  const bikeX = 25 + (bikeProgress * 0.5); // from 25% to 75%
  const bikeY = 65 - (bikeProgress * 0.3); // moving towards customer

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '2px solid #3b82f6',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(37,99,235,0.12)',
      marginBottom: 20
    }}>
      {/* Top Telemetry Dashboard Bar */}
      <div style={{
        padding: '12px 18px',
        backgroundColor: '#1e293b',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Bike size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Live Bike Tracking</span>
              <span style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 10
              }}>
                GPS LIVE
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {providerName} • {customerLocality}
            </div>
          </div>
        </div>

        {/* Live Gauges: Speed & Distance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
            <Gauge size={14} color="#38bdf8" />
            <span style={{ fontWeight: 700 }}>{telemetry.speed_kmh || 30} km/h</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
            <Clock size={14} color="#f59e0b" />
            <span style={{ fontWeight: 700 }}>ETA ~{telemetry.eta_mins || 6} mins</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#10b981' }}>
            <MapPin size={14} />
            <span style={{ fontWeight: 800 }}>{telemetry.remaining_km || 1.2} km away</span>
          </div>

          <button
            onClick={triggerSimulation}
            style={{
              padding: '5px 12px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: 8,
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Navigation size={12} />
            <span>{isSimulating ? 'Simulating...' : 'Simulate Bike Ride'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas with Realistic Road Styling */}
      <div style={{
        height: 260,
        position: 'relative',
        backgroundColor: '#0f172a',
        backgroundImage: `
          linear-gradient(to right, rgba(51, 65, 85, 0.3) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(51, 65, 85, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
        overflow: 'hidden'
      }}>
        {/* Road Path */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
          {/* Main Road Line */}
          <path
            d="M 120 200 Q 280 180, 480 120 T 780 80"
            fill="none"
            stroke="#334155"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M 120 200 Q 280 180, 480 120 T 780 80"
            fill="none"
            stroke="#64748b"
            strokeWidth="18"
            strokeLinecap="round"
          />
          {/* Center Road Dash */}
          <path
            d="M 120 200 Q 280 180, 480 120 T 780 80"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="10 10"
          />
        </svg>

        {/* Origin / Starting Hub */}
        <div style={{
          position: 'absolute',
          left: '15%',
          bottom: '22%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: '#64748b',
            border: '2px solid #ffffff',
            margin: '0 auto 4px'
          }} />
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
            Technician Base
          </span>
        </div>

        {/* CUSTOMER DESTINATION PIN */}
        <div style={{
          position: 'absolute',
          right: '18%',
          top: '32%',
          transform: 'translate(50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            padding: 8,
            borderRadius: '50%',
            boxShadow: '0 0 16px rgba(239, 68, 68, 0.8)',
            border: '2px solid #ffffff'
          }}>
            <MapPin size={20} />
          </div>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: '0.72rem',
            fontWeight: 800,
            marginTop: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap'
          }}>
            🏠 Your Doorstep ({customerLocality})
          </div>
        </div>

        {/* MOVING BIKE SYMBOL WITH REALISTIC HEADING & PULSE */}
        <div style={{
          position: 'absolute',
          left: `${bikeX}%`,
          top: `${bikeY}%`,
          transform: 'translate(-50%, -50%)',
          transition: 'all 1.2s linear',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Outer Pulsing Glow */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
          }} className="animate-pulse-glow">
            {/* Inner Bike Vehicle Container */}
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
              transform: `rotate(${telemetry.heading_deg || 40}deg)`
            }}>
              {/* Bike Icon / Symbol */}
              <Bike size={22} strokeWidth={2.4} />
            </div>
          </div>

          {/* Bike Pro Label & Current Speed */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #334155',
            color: '#34d399',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: '0.68rem',
            fontWeight: 800,
            marginTop: 4,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span>🏍️ Pro on Bike</span>
            <span style={{ color: '#ffffff' }}>• {telemetry.speed_kmh || 30} km/h</span>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div style={{
        padding: '10px 18px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, marginRight: 20 }}>
          <span style={{ fontWeight: 700, color: '#334155' }}>Progress:</span>
          <div style={{ flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${bikeProgress}%`,
              height: '100%',
              backgroundColor: '#10b981',
              transition: 'width 1.2s linear'
            }} />
          </div>
          <span style={{ fontWeight: 800, color: '#059669' }}>{bikeProgress}%</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: '#059669', fontWeight: 700 }}>
            ✓ Verified Sagara Pro on Hero Splendor / Activa
          </span>
        </div>
      </div>
    </div>
  );
};
