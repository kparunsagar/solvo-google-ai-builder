import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Headphones, Clock, CheckCircle2, AlertCircle, ShieldCheck, User } from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseLive } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatDistanceToNow } from '@/lib/utils';
import { getSecureRandomString } from '@/utils/crypto';

export interface SupportTicketMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'customer' | 'technician' | 'support_specialist' | 'admin';
  message: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_code: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_role: 'customer' | 'technician';
  category: string;
  subject: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  admin_response?: string;
  assigned_to?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  messages?: SupportTicketMessage[];
  unread_user?: boolean;
  unread_admin?: boolean;
}

interface TicketChatModalProps {
  ticket: SupportTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated?: (ticket: SupportTicket) => void;
}

export const TicketChatModal: React.FC<TicketChatModalProps> = ({
  ticket: initialTicket,
  isOpen,
  onClose,
  onTicketUpdated
}) => {
  const { user } = useAuth();
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(initialTicket);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTicket(initialTicket);
  }, [initialTicket]);

  // Real-time Firestore synchronization for this specific ticket
  useEffect(() => {
    if (!isOpen || !initialTicket?.id) return;

    if (isFirebaseLive()) {
      try {
        const unsub = onSnapshot(doc(db, 'support_tickets', initialTicket.id), (snap) => {
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() } as SupportTicket;
            setCurrentTicket(data);
            onTicketUpdated?.(data);
          }
        });
        return () => unsub();
      } catch (err) {
        console.warn('[TicketChatModal] Firestore listener error:', err);
      }
    }

    // Fallback sync via BroadcastChannel
    let bus: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bus = new BroadcastChannel('urbandaily_sync_bus');
        bus.onmessage = (evt) => {
          const { type, payload } = evt.data || {};
          if (
            (type === 'SUPPORT_TICKET_REPLY' || type === 'SUPPORT_TICKET_UPDATED') &&
            (payload?.ticketId === initialTicket.id || payload?.ticket?.id === initialTicket.id)
          ) {
            const updated = payload.ticket || payload;
            setCurrentTicket((prev) => (prev ? { ...prev, ...updated } : updated));
            if (updated) onTicketUpdated?.(updated);
          }
        };
      }
    } catch {}

    return () => {
      bus?.close();
    };
  }, [isOpen, initialTicket?.id, onTicketUpdated]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTicket?.messages, isOpen]);

  if (!isOpen || !currentTicket) return null;

  // Synthesize messages list for backward compatibility
  const messages: SupportTicketMessage[] =
    currentTicket.messages && currentTicket.messages.length > 0
      ? currentTicket.messages
      : [
          ...(currentTicket.message
            ? [
                {
                  id: `msg-${currentTicket.id}-init`,
                  sender_id: currentTicket.user_id || 'user',
                  sender_name: currentTicket.user_name || 'You',
                  sender_role: currentTicket.user_role || (user?.role === 'provider' ? 'technician' : 'customer'),
                  message: currentTicket.message,
                  created_at: currentTicket.created_at || new Date().toISOString()
                } as SupportTicketMessage
              ]
            : []),
          ...(currentTicket.admin_response
            ? [
                {
                  id: `msg-${currentTicket.id}-admin`,
                  sender_id: 'admin_specialist',
                  sender_name: currentTicket.assigned_to || 'Operations Support Specialist',
                  sender_role: 'support_specialist',
                  message: currentTicket.admin_response,
                  created_at: currentTicket.resolved_at || currentTicket.created_at || new Date().toISOString()
                } as SupportTicketMessage
              ]
            : [])
        ];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    const newMsg: SupportTicketMessage = {
      id: `msg-${Date.now()}-${getSecureRandomString(4)}`,
      sender_id: user?.id || 'user',
      sender_name: user?.name || currentTicket.user_name || 'User',
      sender_role: user?.role === 'provider' ? 'technician' : 'customer',
      message: messageText,
      created_at: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMsg];
    const newStatus = currentTicket.status === 'RESOLVED' || currentTicket.status === 'CLOSED' ? 'IN_PROGRESS' : currentTicket.status;

    const updatedTicket: SupportTicket = {
      ...currentTicket,
      messages: updatedMessages,
      status: newStatus,
      updated_at: new Date().toISOString(),
      unread_admin: true
    };

    setCurrentTicket(updatedTicket);
    onTicketUpdated?.(updatedTicket);

    try {
      // 1. Update localStorage
      const local = localStorage.getItem('mud_support_tickets');
      if (local) {
        const list: SupportTicket[] = JSON.parse(local);
        const idx = list.findIndex((t) => t.id === currentTicket.id);
        if (idx >= 0) {
          list[idx] = updatedTicket;
        } else {
          list.unshift(updatedTicket);
        }
        localStorage.setItem('mud_support_tickets', JSON.stringify(list));
      }

      // 2. Persist to Cloud Firestore
      if (isFirebaseLive()) {
        try {
          await setDoc(
            doc(db, 'support_tickets', currentTicket.id),
            {
              ...updatedTicket,
              firestore_updated_at: serverTimestamp()
            },
            { merge: true }
          );
        } catch (fErr) {
          console.warn('[TicketChatModal] Firestore update error:', fErr);
        }
      }

      // 3. Broadcast to sync bus
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bus = new BroadcastChannel('urbandaily_sync_bus');
          bus.postMessage({
            type: 'TICKET_MESSAGE_SENT',
            payload: {
              ticketId: currentTicket.id,
              message: newMsg,
              ticket: updatedTicket
            },
            timestamp: Date.now()
          });
        }
        window.dispatchEvent(
          new CustomEvent('urbandaily_sync_event', {
            detail: {
              type: 'TICKET_MESSAGE_SENT',
              payload: {
                ticketId: currentTicket.id,
                message: newMsg,
                ticket: updatedTicket
              }
            }
          })
        );
      } catch {}
    } catch (err) {
      console.error('[TicketChatModal] Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'RESOLVED':
        return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Resolved' };
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-100 text-blue-700 border-blue-200', label: 'In Progress' };
      case 'CLOSED':
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Closed' };
      default:
        return { bg: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Open' };
    }
  };

  const statusBadge = getStatusBadge(currentTicket.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-[90vh] max-h-[720px] animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-blue-400 text-sm sm:text-base">
                  {currentTicket.ticket_code}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border',
                    statusBadge.bg
                  )}
                >
                  {statusBadge.label}
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  {currentTicket.category.replace('_', ' ')}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-md mt-0.5">
                {currentTicket.subject}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {/* Ticket Introduction Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 text-xs text-slate-600 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Ticket Opened: {new Date(currentTicket.created_at).toLocaleString()}</span>
              <span>Priority: <strong className="text-amber-600">{currentTicket.priority}</strong></span>
            </div>
            <p className="text-slate-800 font-medium">{currentTicket.subject}</p>
            {currentTicket.assigned_to && (
              <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Assigned Specialist: {currentTicket.assigned_to}
              </p>
            )}
          </div>

          {/* Messages */}
          {messages.map((msg) => {
            const isMe =
              msg.sender_id === user?.id ||
              msg.sender_role === 'customer' ||
              msg.sender_role === 'technician';
            const isSpecialist =
              msg.sender_role === 'support_specialist' || msg.sender_role === 'admin';

            let relativeTime = '';
            try {
              relativeTime = formatDistanceToNow(new Date(msg.created_at), { addSuffix: true });
            } catch {}

            return (
              <div
                key={msg.id}
                className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm text-xs sm:text-sm',
                    isMe
                      ? user?.role === 'provider'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 opacity-80 text-[10px]">
                    {isSpecialist ? (
                      <span className="flex items-center gap-1 font-bold text-sky-400">
                        <Headphones className="w-3 h-3" />
                        {msg.sender_name} (Support)
                      </span>
                    ) : (
                      <span className="font-bold">{msg.sender_name}</span>
                    )}
                    <span>•</span>
                    <span>{relativeTime || new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message to the support specialist..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors flex items-center gap-1.5 shrink-0 text-xs sm:text-sm shadow-md shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
