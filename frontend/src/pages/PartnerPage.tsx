import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Clock,
  Award,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  Users,
  ChevronRight,
  Sparkles,
  Zap,
  Building
} from 'lucide-react';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export const PartnerPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useOptionalAuth();
  const user = auth?.user;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    trade: 'electrician',
    experienceYears: '3-5 years',
    locality: 'Sagara Town',
    hasTwoWheeler: true
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = JSON.parse(localStorage.getItem('mud_partner_inquiries') || '[]');
      existing.push({
        ...formData,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('mud_partner_inquiries', JSON.stringify(existing));
    } catch (err) {
      console.warn('Storage failed:', err);
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Join 150+ Verified Technicians in Sagara & Shivamogga</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
            Earn More. Work On Your Terms.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
              Partner with SOLVO
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
            Are you a skilled electrician, plumber, AC specialist, or home technician? Get guaranteed daily customer bookings, instant UPI settlements, and zero onboarding fee.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#apply-form"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-7 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
            >
              <span>Apply Online in 2 Mins</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            {user?.role === 'provider' ? (
              <Link
                to="/technician"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl backdrop-blur-xs transition-all"
              >
                <span>Go to Technician Portal</span>
              </Link>
            ) : (
              <a
                href="tel:+918183224400"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl backdrop-blur-xs transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call Partner Desk: +91 8183 224400</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Value Pillars for Partners */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Wallet,
              title: '₹35k - ₹65k/Mo',
              desc: 'High daily job density with transparent platform commission.',
              color: 'text-emerald-600 bg-emerald-50'
            },
            {
              icon: Zap,
              title: 'Instant Payouts',
              desc: 'Direct UPI & bank transfers right after job sign-off.',
              color: 'text-blue-600 bg-blue-50'
            },
            {
              icon: ShieldCheck,
              title: '₹5L Accidental Cover',
              desc: 'Free insurance protection while on active duty.',
              color: 'text-purple-600 bg-purple-50'
            },
            {
              icon: Clock,
              title: 'Flexible Schedule',
              desc: 'Full-time or part-time. Turn toggle online whenever free.',
              color: 'text-amber-600 bg-amber-50'
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col items-center text-center"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-1">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4-Step Onboarding Process */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">Fast & Transparent</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 mb-3">
            How to Get Started in 4 Easy Steps
          </h2>
          <p className="text-slate-500 text-sm">
            Zero joining fees. Get verified and start accepting bookings within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '1',
              title: 'Submit Application',
              desc: 'Fill out your basic trade details and contact information in the form below.'
            },
            {
              step: '2',
              title: 'KYC Verification',
              desc: 'Upload your Aadhaar card and pass our instant digital background check.'
            },
            {
              step: '3',
              title: 'Safety Briefing',
              desc: 'Complete a 15-minute briefing on platform safety, app usage, and customer standards.'
            },
            {
              step: '4',
              title: 'Receive Bookings',
              desc: 'Go online, accept bookings in your neighborhood, and get paid directly.'
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-black text-sm flex items-center justify-center mb-4">
                {item.step}
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Application Form & Contact */}
      <section id="apply-form" className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-6 sm:px-10 py-8 text-white">
            <h3 className="text-2xl font-black">Partner Express Application</h3>
            <p className="text-slate-300 text-sm mt-1">
              Join as a verified technician partner in Sagara, Soraba, Hosanagara, and surrounding areas.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-2">Application Received!</h4>
                <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                  Thank you, <strong>{formData.name}</strong>. Our partner onboarding manager will call you at <strong>{formData.phone}</strong> within 4 business hours to finalize your KYC.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/kyc"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
                  >
                    <span>Proceed to KYC Document Upload</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 underline px-3 py-2 cursor-pointer"
                  >
                    Submit another application
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Manjunath Gowda"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      WhatsApp / Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Primary Trade / Expertise *
                    </label>
                    <select
                      value={formData.trade}
                      onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="electrician">Electrician & Wiring</option>
                      <option value="plumber">Plumbing & Sanitary</option>
                      <option value="appliance">Appliance & AC Repair</option>
                      <option value="carpenter">Carpentry & Furniture</option>
                      <option value="painter">Painting & Waterproofing</option>
                      <option value="cleaning">Home Deep Cleaning</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Years of Experience
                    </label>
                    <select
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="1-2 years">1 - 2 Years</option>
                      <option value="3-5 years">3 - 5 Years</option>
                      <option value="5-10 years">5 - 10 Years</option>
                      <option value="10+ years">10+ Years Master Craftsperson</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Locality / Base Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sagara Main Road, Subhash Nagar, Jog"
                      value={formData.locality}
                      onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Two-Wheeler / Transport Available?
                    </label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="transport"
                          checked={formData.hasTwoWheeler}
                          onChange={() => setFormData({ ...formData, hasTwoWheeler: true })}
                        />
                        <span>Yes (Bike / Scooter)</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="transport"
                          checked={!formData.hasTwoWheeler}
                          onChange={() => setFormData({ ...formData, hasTwoWheeler: false })}
                        />
                        <span>No (Public / Shared)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md transition-all text-base cursor-pointer"
                  >
                    Submit Partner Application
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-3">
                    By submitting, you agree to our Terms of Service & Privacy Policy. No registration fee is charged.
                  </p>
                </div>
              </form>
            )}

            <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Partner Support Desk:</span>
                <a href="mailto:urbanaiidea@gmail.com" className="text-blue-600 font-semibold underline">
                  urbanaiidea@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Direct Helpline: +91 8183 224400</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
