import React, { useState, useEffect } from 'react';
import { MessageSquare, Check, X, Shield, Sparkles } from 'lucide-react';

interface SmsNotificationToastProps {
  phone: string;
  otp: string;
  onAutoFill: (otp: string) => void;
  onDismiss: () => void;
}

export const SmsNotificationToast: React.FC<SmsNotificationToastProps> = ({
  phone,
  otp,
  onAutoFill,
  onDismiss
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Play a subtle notification chime if supported
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before interaction
    }
  }, []);

  const handleCopy = () => {
    onAutoFill(otp);
    setCopied(true);
    setTimeout(() => {
      onDismiss();
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 18,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: '92%',
      maxWidth: 480,
      backgroundColor: '#0f172a',
      color: '#ffffff',
      borderRadius: 16,
      padding: '14px 18px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
      animation: 'slideDown 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <MessageSquare size={16} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            MESSAGES • VM-MYURBN • Just Now
          </span>
        </div>

        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#f1f5f9', lineHeight: 1.4 }}>
        <strong>+91 {phone}</strong>: Your SOLVO verification code is <span style={{
          backgroundColor: '#2563eb',
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: 6,
          fontWeight: 800,
          letterSpacing: '0.1em'
        }}>{otp}</span>. Valid for 10 minutes. Do not share this OTP.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            backgroundColor: copied ? '#059669' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          {copied ? <Check size={14} /> : <Sparkles size={14} />}
          <span>{copied ? 'Code Inserted!' : '⚡ 1-Click Auto-Fill'}</span>
        </button>
      </div>
    </div>
  );
};
