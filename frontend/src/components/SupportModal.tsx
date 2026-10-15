import React, { useState } from 'react';
import { X, Headphones, CheckCircle2, AlertTriangle, Send, ShieldAlert, LifeBuoy } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseLive } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getSecureRandomDigits } from '@/utils/crypto';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<'BILLING' | 'SERVICE_QUALITY' | 'DELAYS' | 'KYC_ASSISTANCE' | 'TECHNICAL_SUPPORT' | 'GENERAL'>('DELAYS');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [contact, setContact] = useState(user?.phone || user?.email || '');
  const [loading, setLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Please provide both subject and details for your request.');
      return;
    }

    setLoading(true);
    setError('');

    const ticketId = `tkt-${Date.now()}`;
    const ticketCode = `TKT-${getSecureRandomDigits(4)}`;
    const ticketRecord = {
      id: ticketId,
      ticket_code: ticketCode,
      user_id: user?.id || 'guest_user',
      user_name: name.trim() || user?.name || 'Customer / Technician',
      user_email: user?.email || (contact.includes('@') ? contact : ''),
      user_phone: user?.phone || (!contact.includes('@') ? contact : ''),
      user_role: user?.role === 'provider' ? 'technician' : 'customer',
      category,
      subject: subject.trim(),
      message: message.trim(),
      priority,
      status: 'OPEN',
      created_at: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender_id: user?.id || 'guest_user',
          sender_name: name.trim() || user?.name || 'Customer / Technician',
          sender_role: user?.role === 'provider' ? 'technician' : 'customer',
          message: message.trim(),
          created_at: new Date().toISOString()
        }
      ]
    };

    try {
      // 1. Save to local storage
      const existing = JSON.parse(localStorage.getItem('mud_support_tickets') || '[]');
      existing.unshift(ticketRecord);
      localStorage.setItem('mud_support_tickets', JSON.stringify(existing));

      // 2. Persist to Cloud Firestore
      if (isFirebaseLive()) {
        try {
          await setDoc(doc(db, 'support_tickets', ticketId), {
            ...ticketRecord,
            firestore_created_at: serverTimestamp()
          });
        } catch (fErr) {
          console.warn('[Firestore Support] Cloud save warning:', fErr);
        }
      }

      // 3. Broadcast to cross-portal sync bus
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bus = new BroadcastChannel('urbandaily_sync_bus');
          bus.postMessage({ type: 'NEW_SUPPORT_TICKET', payload: ticketRecord, timestamp: Date.now() });
        }
        window.dispatchEvent(new CustomEvent('urbandaily_sync_event', { detail: { type: 'NEW_SUPPORT_TICKET', payload: ticketRecord } }));
      } catch {}

      setTicketSuccess(ticketCode);
    } catch (err: any) {
      setError(err.message || 'Failed to submit support request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setTicketSuccess(null);
    setSubject('');
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 relative">
          <button
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Headphones className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Customer & Technician Support</h3>
              <p className="text-xs text-blue-100">Live 24/7 Operations Desk • Sagara Central Hub</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {ticketSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-1">Ticket Submitted Successfully!</h4>
              <p className="text-sm text-slate-500 mb-4">
                Your ticket reference code is{' '}
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {ticketSuccess}
                </span>
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 text-left mb-6 space-y-1">
                <p>✓ <strong>Transmitted to Operations Admin Desk</strong></p>
                <p>✓ Priority: <span className="font-bold text-amber-600">{priority}</span></p>
                <p>✓ An operations supervisor will review and update this ticket shortly.</p>
              </div>
              <button
                onClick={handleResetAndClose}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
              >
                Back to Portal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* User details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / Email</label>
                  <input
                    type="text"
                    required
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="Phone or email"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Issue Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="DELAYS">Technician Delay</option>
                    <option value="SERVICE_QUALITY">Service Quality Concern</option>
                    <option value="BILLING">Billing / Refund Query</option>
                    <option value="KYC_ASSISTANCE">Technician KYC Help</option>
                    <option value="TECHNICAL_SUPPORT">App / Portal Problem</option>
                    <option value="GENERAL">General Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="LOW">Low (General Query)</option>
                    <option value="MEDIUM">Medium (Standard Request)</option>
                    <option value="HIGH">High (Active Booking Issue)</option>
                    <option value="URGENT">Urgent (Immediate Help)</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Technician running 20 mins late for AC service"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              {/* Detailed Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Please describe what happened, booking reference if any, and how we can assist..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting to Operations...' : 'Submit Support Request'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
