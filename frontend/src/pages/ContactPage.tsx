import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Headphones,
  HelpCircle,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useOptionalAuth } from '@/contexts/AuthContext';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'How fast can a technician arrive at my home in Sagara?',
    a: 'In urban Sagara, our average technician arrival SLA is under 60 minutes for priority slots. You can also schedule bookings for convenient future time slots.'
  },
  {
    q: 'What does the 30-Day Free Rework Warranty cover?',
    a: 'Our 30-Day Warranty covers all labor and repair workmanship performed by the technician. If the exact same issue reoccurs within 30 days, we send a technician back to fix it with zero additional labor charge.'
  },
  {
    q: 'How are technicians verified on SOLVO?',
    a: 'Every technician undergoes a rigorous multi-tier vetting process, including Government Aadhaar authentication, live photo verification, and hands-on practical skill testing.'
  },
  {
    q: 'How do I pay for my service?',
    a: 'You can pay securely online via Razorpay (UPI, Google Pay, PhonePe, Debit/Credit Card, Net Banking) or select Cash on Delivery (COD) once the work is completed.'
  },
  {
    q: 'How can I become a partner technician?',
    a: 'Visit our Partner With Us page or fill out the contact form selecting "Technician Partner Inquiry". Onboarding is 100% free with no joining deposit required.'
  }
];

export const ContactPage: React.FC = () => {
  const auth = useOptionalAuth();
  const user = auth?.user;
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: 'Customer Booking Support',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const messages = JSON.parse(localStorage.getItem('mud_contact_messages') || '[]');
      messages.push({
        ...formData,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('mud_contact_messages', JSON.stringify(messages));
    } catch (err) {
      console.warn('Storage failed:', err);
    }
    setSubmitted(true);
  };

  const mailtoLink = 'mailto:urbanaiidea@gmail.com?subject=' + encodeURIComponent(formData.subject) + '&body=' + encodeURIComponent(formData.message);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-4">
            <Headphones className="w-4 h-4 text-blue-600" />
            <span>Customer & Partner Support Hub</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            We Are Here to Help
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Have questions about a booking, want to partner with us, or need warranty assistance? Reach out to our dedicated support team.
          </p>
        </div>

        {/* Contact Information Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-1">Email Us</h3>
            <p className="text-xs text-slate-500 mb-3">Direct response within 4-12 hours</p>
            <a
              href="mailto:urbanaiidea@gmail.com"
              className="mt-auto text-blue-600 hover:text-blue-700 font-bold text-sm underline break-all"
            >
              urbanaiidea@gmail.com
            </a>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-1">Helpline</h3>
            <p className="text-xs text-slate-500 mb-3">7:00 AM – 9:00 PM IST (Mon - Sun)</p>
            <a
              href="tel:+918183224400"
              className="mt-auto text-emerald-600 hover:text-emerald-700 font-bold text-sm"
            >
              +91 8183 224400
            </a>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-1">Office</h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-auto">
              B.H. Road, Sagara, Shivamogga District, Karnataka — 577401
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-1">Operating Hours</h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-auto">
              365 Days a Year • Emergency technician dispatch from 7:00 AM to 9:00 PM daily.
            </p>
          </div>
        </div>

        {/* Main Grid: Form + FAQs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Send Us a Direct Message</h2>
            </div>

            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Message Delivered!</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  Thank you for reaching out. We have logged your request. Our support specialist will respond to <strong>{formData.email || formData.phone}</strong> promptly.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href={mailtoLink}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Open Email Client</span>
                  </a>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                  >
                    Send another query
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Hegde"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mobile Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Inquiry Subject *
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="Customer Booking Support">Customer Booking Support</option>
                      <option value="Technician Partner Application">Technician Partner Application</option>
                      <option value="Payment & Invoicing Inquiry">Payment & Invoicing Inquiry</option>
                      <option value="Warranty Claim (30-Day Free Rework)">Warranty Claim (30-Day Free Rework)</option>
                      <option value="Grievance / DPDPA Privacy Officer">Grievance / DPDPA Privacy Officer</option>
                      <option value="General Feedback">General Feedback</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    How can we help you? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide details about your query or booking number..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Inquiry to Support Team</span>
                </button>
              </form>
            )}
          </div>

          {/* FAQ Accordion */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Frequently Asked</h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-100 rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-800 transition"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
              <div>
                <p className="font-bold">Have an urgent repair?</p>
                <p className="text-[11px] text-blue-700">Book online in 30 seconds</p>
              </div>
              <Link
                to="/services"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
