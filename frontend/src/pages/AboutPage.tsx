import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Users,
  Clock,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Mail,
  Phone,
  Sparkles,
  Zap,
  Building,
  Target
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-slate-900 to-slate-900 text-white py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Empowering Local Communities • Powered by AI</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
            Hyperlocal Home Services,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
              Delivered with Absolute Trust
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
            SOLVO connects households across India and globally with background-verified, skilled professionals for all home repair, appliance, and maintenance needs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              <span>Explore Services</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/partner"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl backdrop-blur-xs transition-all"
            >
              <span>Partner With Us</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Numbers / Proof Points */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '60 Min', label: 'Express Arrival', sub: 'Hyperlocal Sagara coverage' },
            { value: '30-Day', label: 'Service Warranty', sub: 'Free rework guarantee' },
            { value: '100%', label: 'KYC Verified', sub: 'Aadhaar & photo evaluation' },
            { value: '₹0', label: 'Visiting Fee', sub: 'When service is booked' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 text-center flex flex-col justify-center"
            >
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm font-bold text-blue-600">{stat.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Story & Origin */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
              <Building className="w-4 h-4" />
              <span>Our Roots & Story</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4 leading-tight">
              Born in Sagara, Built to Elevate Every Local Indian Home
            </h2>
            <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p>
                In smaller cities and towns like Sagara, finding a trustworthy electrician, plumber, or appliance technician used to mean asking neighbors, making ten phone calls, and dealing with uncertain pricing and zero accountability.
              </p>
              <p>
                At the same time, skilled technicians worked long hours without steady income, struggling with unverified clients and middlemen who took hefty cuts without providing safety or technology.
              </p>
              <p>
                <strong>SOLVO</strong> was founded to bridge this exact gap. By bringing transparent algorithmic pricing, Aadhaar-verified background screening, real-time tracking, and a firm <strong>30-Day Free Rework Warranty</strong>, we make home maintenance as seamless and dependable as ordering online.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-8 relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>Our Operating Philosophy</span>
            </h3>
            <ul className="space-y-4">
              {[
                {
                  title: 'Zero Hidden Charges',
                  desc: 'Every price is clearly itemized upfront. No surprise bills or unauthorized add-ons.'
                },
                {
                  title: 'Dignity for Service Professionals',
                  desc: 'Technicians receive 100% fair payout, instant digital settlements, and free safety insurance.'
                },
                {
                  title: 'Strict Quality & Warranty Protection',
                  desc: 'Every service is backed by our official 30-Day Warranty. If something goes wrong, we fix it for free.'
                },
                {
                  title: 'High Availability & Local Dispatch',
                  desc: 'Optimized geo-clustering ensures local pros reach your doorstep in under 60 minutes.'
                }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-white border-y border-slate-200 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              Why Sagara Families Rely On Us
            </h2>
            <p className="text-slate-500 text-sm">
              We hold every booking to the highest standards of safety, quality, and technological reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Vetted & Aadhaar-Verified</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Every service professional undergoes multi-tier verification including Government Aadhaar authentication, facial photo match, and hands-on skill evaluation.
              </p>
              <div className="mt-auto text-xs text-blue-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 100% Verified Personnel
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">30-Day Guarantee</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                We take total ownership of work delivered. If any repaired component fails within 30 days, we dispatch a senior expert to resolve it at no extra labor cost.
              </p>
              <div className="mt-auto text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Hassle-Free Rework
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Digital Receipts</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Every service completed receives a formal GST-compliant itemized receipt under your profile, with detailed material logs and secure digital payments.
              </p>
              <div className="mt-auto text-xs text-purple-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Transparent Digital Ledger
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Location */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">Headquarters & Operations</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 mb-4">Have Questions or Want to Collaborate?</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                We are actively expanding across Karnataka and welcome inquiries from customers, institutional service partners, and talented professionals.
              </p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">General & Partnership Inquiries</span>
                    <a href="mailto:urbanaiidea@gmail.com" className="text-white hover:text-blue-300 font-medium underline">
                      urbanaiidea@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Customer Helpline</span>
                    <a href="tel:+918183224400" className="text-white hover:text-blue-300 font-medium">
                      +91 8183 224400
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Registered Office</span>
                    <span className="text-slate-200">
                      B.H. Road, Sagara, Shivamogga District, Karnataka — 577401
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 text-center">
              <h4 className="text-base font-bold text-white mb-2">Ready to experience better home services?</h4>
              <p className="text-xs text-slate-400 mb-6">
                Book a background-verified plumber, electrician, or appliance specialist in under 30 seconds.
              </p>
              <div className="space-y-3">
                <Link
                  to="/services"
                  className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition"
                >
                  Book a Service Now
                </Link>
                <Link
                  to="/contact"
                  className="block w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl text-xs transition"
                >
                  Contact Support Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
