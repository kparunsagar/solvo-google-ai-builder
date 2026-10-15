import React from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Mail,
  CreditCard,
  Banknote
} from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-4">
            <RotateCcw className="w-4 h-4 text-emerald-600" />
            <span>Fair & Transparent Customer Guarantee</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Last Updated: September 25, 2026 • Compliant with Indian Consumer Protection (E-Commerce) Rules
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <div className="text-2xl font-black text-emerald-600 mb-1">100% Free</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prior to Dispatch</div>
            <p className="text-xs text-slate-500 mt-1">Zero fee if cancelled before technician sets out.</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <div className="text-2xl font-black text-blue-600 mb-1">30 Days</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Free Rework Warranty</div>
            <p className="text-xs text-slate-500 mt-1">Free labor rework if problem persists.</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <div className="text-2xl font-black text-purple-600 mb-1">3 - 5 Days</div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Refund Timeline</div>
            <p className="text-xs text-slate-500 mt-1">Direct to original source (UPI / Bank Account).</p>
          </div>
        </div>

        {/* Policy Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-slate-700 leading-relaxed text-sm">
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">1</span>
              <span>Cancellation Rules & Timelines</span>
            </h3>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Cancellation before technician dispatch:</strong> 100% instant full refund to your original payment method. No questions asked.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Free Rescheduling:</strong> You can reschedule any booking to another date/slot at zero cost up to 2 hours before the scheduled time.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Cancellation after technician arrival:</strong> If cancelled after the technician has traveled and arrived at your doorstep, a nominal minimum inspection/visiting fee of ₹50 is deducted to compensate fuel costs; the rest of any prepaid amount is refunded.</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">2</span>
              <span>30-Day Free Rework First Resolution</span>
            </h3>
            <p className="text-xs text-slate-600 mb-2">
              If you are dissatisfied with a repair or the issue recurs:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 pl-2">
              <li>Open your Customer Profile → Select the Booking Receipt → Click "Raise Warranty Claim".</li>
              <li>A senior technician or supervisor is dispatched within 24 hours to inspect and rework the fault for free.</li>
              <li>If the issue cannot be resolved or our service is found deficient, our support desk issues a full or proportionate refund.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">3</span>
              <span>Refund Modes & Turnaround SLA</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 mb-0.5">Online Gateway (Razorpay)</h4>
                  <p className="text-slate-600">Reversed directly to the originating UPI ID, debit card, or net banking account within 3 to 5 business days.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <Banknote className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 mb-0.5">Cash on Delivery (COD)</h4>
                  <p className="text-slate-600">Refunded via instant UPI transfer (Google Pay / PhonePe) to your verified mobile number upon support approval.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <span>Refund Escalation & Dispute Desk</span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              If your refund has not reflected after 5 business days, or for any special escalation:
            </p>
            <div className="space-y-1 text-xs text-slate-700">
              <p><strong>Official Inquiries:</strong> <a href="mailto:urbanaiidea@gmail.com" className="text-blue-600 font-bold underline">urbanaiidea@gmail.com</a></p>
              <p><strong>Customer Helpline:</strong> <a href="tel:+918183224400" className="text-blue-600 font-bold">+91 8183 224400</a></p>
              <p className="text-slate-500 pt-1">Please include your 6-digit Booking ID and phone number for instant lookup.</p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 text-center flex items-center justify-center gap-6 text-xs text-slate-500">
          <Link to="/terms" className="hover:text-slate-900 underline">Terms of Service</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-slate-900 underline">Privacy Policy</Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-slate-900 underline">Contact Us</Link>
        </div>
      </div>
    </div>
  );
};
