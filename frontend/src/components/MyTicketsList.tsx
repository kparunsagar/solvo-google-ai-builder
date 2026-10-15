import React, { useState, useEffect } from 'react';
import { Headphones, Plus, Clock, CheckCircle2, MessageSquare, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SupportModal } from '@/components/SupportModal';
import { TicketChatModal, SupportTicket } from '@/components/TicketChatModal';
import { db, isFirebaseLive } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { cn, formatDistanceToNow } from '@/lib/utils';

interface MyTicketsListProps {
  initialTicketId?: string | null;
}

export const MyTicketsList: React.FC<MyTicketsListProps> = ({ initialTicketId }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Load tickets from localStorage & subscribe to Firestore
  useEffect(() => {
    if (!user) return;

    const loadLocal = () => {
      try {
        const raw = localStorage.getItem('mud_support_tickets');
        if (raw) {
          const all: SupportTicket[] = JSON.parse(raw);
          const myTickets = all.filter(
            (t) =>
              t.user_id === user.id ||
              (user.phone && t.user_phone && t.user_phone.includes(user.phone)) ||
              (user.email && t.user_email && t.user_email.toLowerCase() === user.email.toLowerCase())
          );
          setTickets(myTickets);
          if (initialTicketId) {
            const matched = myTickets.find((t) => t.id === initialTicketId || t.ticket_code === initialTicketId);
            if (matched) setSelectedTicket(matched);
          }
        }
      } catch {}
      setLoading(false);
    };

    loadLocal();

    // Firestore real-time query
    if (isFirebaseLive()) {
      try {
        const colRef = collection(db, 'support_tickets');
        const q = query(colRef, where('user_id', '==', user.id));
        const unsub = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
            setTickets((prev) => {
              const map = new Map<string, SupportTicket>();
              prev.forEach((t) => map.set(t.id, t));
              list.forEach((t) => map.set(t.id, t));
              const combined = Array.from(map.values()).sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              return combined;
            });
          }
        });
        return () => unsub();
      } catch (err) {
        console.warn('[MyTicketsList] Firestore query error:', err);
      }
    }

    // Window / BroadcastChannel event listeners
    const handleSync = () => loadLocal();
    window.addEventListener('urbandaily_sync_event', handleSync);
    return () => window.removeEventListener('urbandaily_sync_event', handleSync);
  }, [user, initialTicketId]);

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'ALL') return true;
    if (filter === 'OPEN') return t.status === 'OPEN';
    if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filter === 'RESOLVED') return t.status === 'RESOLVED' || t.status === 'CLOSED';
    return true;
  });

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'RESOLVED':
        return { bg: 'bg-emerald-100 text-emerald-700', label: 'Resolved' };
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-100 text-blue-700', label: 'In Progress' };
      case 'CLOSED':
        return { bg: 'bg-slate-100 text-slate-700', label: 'Closed' };
      default:
        return { bg: 'bg-amber-100 text-amber-700', label: 'Open' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-blue-500/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-200 shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black">My Support Tickets</h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">
              Direct, isolated communication desk with SOLVO Operations Specialists.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Ticket</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0',
              filter === st
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {st === 'ALL'
              ? `All Tickets (${tickets.length})`
              : st === 'OPEN'
              ? `Open (${tickets.filter((t) => t.status === 'OPEN').length})`
              : st === 'IN_PROGRESS'
              ? `In Progress (${tickets.filter((t) => t.status === 'IN_PROGRESS').length})`
              : `Resolved (${tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length})`}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm font-medium">Loading your support tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Support Tickets Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Need help with a booking, payment, KYC verification, or service delivery? Raise a ticket and a specialist will assist you promptly.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Submit a Ticket</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const badge = getStatusBadge(ticket.status);
            const msgCount = (ticket.messages && ticket.messages.length) || (ticket.admin_response ? 2 : 1);
            let timeAgo = '';
            try {
              timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
            } catch {}

            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-1.5">
                    <span className="font-mono font-bold text-blue-600 text-xs sm:text-sm">
                      {ticket.ticket_code}
                    </span>
                    <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase', badge.bg)}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {ticket.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">{timeAgo}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                    {ticket.subject}
                  </h4>

                  <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                    {ticket.admin_response
                      ? `Support: ${ticket.admin_response}`
                      : ticket.message || 'No description'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold bg-slate-50 px-2.5 py-1.5 rounded-xl">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span>{msgCount}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Support Creation Modal */}
      <SupportModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Isolated Ticket Conversation Chat Modal */}
      <TicketChatModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onTicketUpdated={(updated) => {
          setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
      />
    </div>
  );
};
