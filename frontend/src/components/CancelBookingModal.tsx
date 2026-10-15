import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Loader2, HelpCircle } from 'lucide-react';
import { api } from '../lib/api';

export const CANCELLATION_REASONS = [
  'Technician delayed / taking too long',
  'Changed my mind / No longer needed',
  'Booked by mistake / Incorrect service selected',
  'Found alternative solution / Fixed it myself',
  'Pricing or quotation issue',
  'Other (please specify)'
];

interface CancelBookingModalProps {
  isOpen: boolean;
  bookingId: string;
  bookingCode?: string;
  serviceTitle?: string;
  onClose: () => void;
  onSuccess: (booking: any) => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  bookingId,
  bookingCode,
  serviceTitle,
  onClose,
  onSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOther = selectedReason === 'Other (please specify)';

  const handleConfirmCancel = async () => {
    if (isOther && !customNote.trim()) {
      setError('Please provide a brief reason for cancellation.');
      return;
    }

    setLoading(true);
    setError(null);

    const finalReason = isOther
      ? `Other: ${customNote.trim()}`
      : customNote.trim()
      ? `${selectedReason} - ${customNote.trim()}`
      : selectedReason;

    try {
      const result = await api.cancelBooking(bookingId, finalReason, customNote.trim());
      onSuccess(result?.booking || { id: bookingId, status: 'CANCELLED', cancellation_reason: finalReason });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Cancel Booking</h3>
              <p className="text-xs text-slate-500">
                {serviceTitle ? `${serviceTitle} • ` : ''}
                Ref: <span className="font-mono font-semibold">{bookingCode || bookingId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Advisory banner */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cancellation Policy</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                Cancellation is free before the technician commences work. If a technician is already assigned, they will be notified immediately and released.
              </p>
            </div>
          </div>

          {/* Reason selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5">
              Please select a reason for cancellation
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <label
                    key={reason}
                    onClick={() => {
                      setSelectedReason(reason);
                      if (error) setError(null);
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-50/40 text-slate-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancellation_reason"
                      value={reason}
                      checked={isSelected}
                      onChange={() => setSelectedReason(reason)}
                      className="text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span className="text-xs">{reason}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isOther ? 'Please specify reason *' : 'Additional comments / feedback (optional)'}
            </label>
            <textarea
              rows={3}
              value={customNote}
              onChange={(e) => {
                setCustomNote(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                isOther
                  ? 'Tell us why you would like to cancel...'
                  : 'Any feedback to help us improve our service...'
              }
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
          >
            Keep My Booking
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm Cancellation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
