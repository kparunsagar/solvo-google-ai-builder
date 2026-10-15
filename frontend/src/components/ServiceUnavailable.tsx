import React, { useState } from 'react';
import { MapPin, BellRing, Check, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { LocationState } from '../services/microservices/location.service';

interface ServiceUnavailableProps {
  location: LocationState;
  onSwitchToSagara: () => void;
  onChangeLocation: () => void;
}

export const ServiceUnavailable: React.FC<ServiceUnavailableProps> = ({
  location,
  onSwitchToSagara,
  onChangeLocation
}) => {
  const [contact, setContact] = useState('');
  const [isNotified, setIsNotified] = useState(false);

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setIsNotified(true);
  };

  return (
    <div style={{
      maxWidth: 640,
      margin: '40px auto',
      padding: '40px 24px',
      backgroundColor: '#ffffff',
      borderRadius: 24,
      border: '1px solid #e2e8f0',
      boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
      textAlign: 'center'
    }}>
      {/* Zepto Style Pin / Alert Graphic */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        boxShadow: '0 0 0 10px rgba(245, 158, 11, 0.1)'
      }}>
        <MapPin size={40} />
      </div>

      <span style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: 20,
        backgroundColor: '#fef3c7',
        color: '#b45309',
        fontSize: '0.78rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 14
      }}>
        Expansion Zone
      </span>

      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
        We are not in {location.city || 'your area'} yet!
      </h2>

      <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
        SOLVO is currently operational across selected hubs with 
        45-minute rapid doorstep dispatch. We are launching in <strong>{location.city}</strong> soon!
      </p>

      {/* Notify Me Form */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: 28,
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <BellRing size={18} color="#2563eb" />
          <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0, fontSize: '0.95rem' }}>
            Want SOLVO in {location.city}?
          </h4>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 14px' }}>
          Leave your mobile number or email. We'll send you an invite and ₹150 launch credit as soon as we open!
        </p>

        {isNotified ? (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 10,
            padding: '12px 16px',
            color: '#065f46',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700
          }}>
            <Check size={18} color="#059669" />
            <span>Thank you! We've registered your priority alert for {location.city}.</span>
          </div>
        ) : (
          <form onSubmit={handleNotifyMe} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              required
              placeholder="Enter mobile number or email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                fontWeight: 600
              }}
            />
            <button
              type="submit"
              style={{
                padding: '12px 20px',
                borderRadius: 10,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Notify Me
            </button>
          </form>
        )}
      </div>

      {/* Call to Actions (Browse & Demo in Sagara) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <button
          onClick={onSwitchToSagara}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '14px 24px',
            borderRadius: 12,
            backgroundColor: '#059669',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(5,150,105,0.3)'
          }}
        >
          <Sparkles size={18} />
          <span>Switch to Sagara (Browse & Demo Mode)</span>
        </button>

        <button
          onClick={onChangeLocation}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 8,
            textDecoration: 'underline'
          }}
        >
          Choose another delivery location
        </button>
      </div>
    </div>
  );
};
