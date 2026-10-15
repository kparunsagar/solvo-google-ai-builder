import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  UserCheck,
  Database,
  Mail,
  Scale,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Badge & Title */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-4">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Personal Data Protection Notice (DPDPA Alignment — Roadmap)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Privacy Policy & Data Protection Charter
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Last Updated: September 25, 2026 • Effective Date: Immediate
          </p>
        </div>

        {/* Quick Highlights Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-10">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Key Privacy Guarantees</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Zero Data Selling:</strong> We never sell, rent, or trade your personal or geolocation data to advertisers or third-party data brokers.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Data Encryption in Transit:</strong> All web requests are protected via TLS/HTTPS; database access is guarded by role-based security rules.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Razorpay Secure Payments:</strong> We never store credit/debit card numbers or UPI PINs. Transactions are tokenized by RBI-authorized aggregators.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Right to Erasure:</strong> You can request permanent deletion of your profile and data anytime by writing to our Grievance Officer.</span>
            </div>
          </div>
        </div>

        {/* Legal Body Sections */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-10 text-slate-700 leading-relaxed text-sm">
          {/* Section 1 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">1</span>
              <span>Identity of Data Fiduciary</span>
            </h3>
            <p className="text-slate-600 mb-3">
              This Privacy Policy applies to the mobile and web platforms operated by <strong>SOLVO</strong> (“we”, “our”, or “us”), having its operational office at B.H. Road, Sagara, Shivamogga District, Karnataka — 577401, India.
            </p>
            <p className="text-slate-600">
              For any queries or formal notices, our official communications email is <a href="mailto:urbanaiidea@gmail.com" className="text-blue-600 font-semibold underline">urbanaiidea@gmail.com</a>.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">2</span>
              <span>Categories of Personal Data We Collect</span>
            </h3>
            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">A. Customer Data</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
                  <li><strong>Identity & Contact:</strong> Full name, telephone/mobile number, email address.</li>
                  <li><strong>Service Delivery Address:</strong> Street address, locality, landmark, pincode, and precise GPS coordinates obtained strictly when dispatching technicians.</li>
                  <li><strong>Booking & Invoicing History:</strong> Services booked, technician assigned, itemized spare parts, and invoices.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">B. Technician & Service Partner Data</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
                  <li><strong>KYC Verification:</strong> Aadhaar number (masked), PAN card, police clearance certificate, and live facial photograph for verification.</li>
                  <li><strong>Professional Credentials:</strong> Trade experience, certifications, vehicle registration (if applicable).</li>
                  <li><strong>Payout Coordinates:</strong> UPI ID, bank account details for direct commission and labor disbursements.</li>
                  <li><strong>Real-time Location:</strong> Live GPS coordinates while on active duty to compute ETA and matching algorithms.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">C. Technical & Security Telemetry</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
                  <li>IP address, device model, operating system, anti-tamper security telemetry (to prevent unauthorized client-side inspection or reverse engineering attacks under Indian IT Act 2000 Section 66).</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">3</span>
              <span>Lawful Purpose & Grounds for Processing</span>
            </h3>
            <p className="text-slate-600 mb-3">
              We process personal data solely for explicit service delivery purposes (aligned with DPDPA frameworks — Roadmap):
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-xs pl-2">
              <li>Facilitating on-demand home service bookings between customers and verified technicians.</li>
              <li>Issuing GST-compliant invoices and managing the 30-Day Free Rework Warranty.</li>
              <li>Preventing platform fraud, impersonation, and maintaining safety protocols.</li>
              <li>Complying with statutory reporting requirements under Indian tax and applicable laws.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">4</span>
              <span>Payment Information & Razorpay Security</span>
            </h3>
            <p className="text-slate-600">
              Payments processed via online gateway are routed through <strong>Razorpay Software Pvt. Ltd.</strong>, an RBI-authorized Payment Aggregator. SOLVO does not store your credit card numbers, CVVs, or UPI PINs on any server. All payment sessions are secured with 256-bit SSL encryption and tokenization compliant with PCI-DSS Level 1 guidelines.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">5</span>
              <span>User Privacy Rights & Access Requests (Roadmap Alignment)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Right to Access Summary:</span>
                <span>You can review the personal data processed, booking logs, and active credentials in your profile dashboard.</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Right to Correction & Erasure:</span>
                <span>You can update inaccurate records or request total account and data purging upon request.</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Right to Grievance Redressal:</span>
                <span>Direct access to our dedicated Data Protection Officer with mandatory 48-hour response SLA.</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Right to Nominate:</span>
                <span>Nominate an individual to exercise your privacy rights in the event of death or incapacity.</span>
              </div>
            </div>
          </section>

          {/* Section 6 - Grievance Officer */}
          <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-base font-extrabold text-blue-900 mb-2 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-700" />
              <span>Statutory Grievance Redressal & Data Protection Officer</span>
            </h3>
            <p className="text-xs text-blue-800 mb-4">
              In accordance with the Information Technology Act 2000 and consumer data privacy standards, any grievances or requests regarding privacy and data practices should be addressed to:
            </p>
            <div className="space-y-1.5 text-xs text-slate-800">
              <p><strong>Designation:</strong> Data Grievance Redressal Officer</p>
              <p><strong>Entity:</strong> SOLVO</p>
              <p><strong>Address:</strong> B.H. Road, Sagara, Shivamogga, Karnataka — 577401</p>
              <p>
                <strong>Official Email:</strong>{' '}
                <a href="mailto:urbanaiidea@gmail.com" className="text-blue-600 font-bold underline">
                  urbanaiidea@gmail.com
                </a>
              </p>
              <p className="text-slate-500 pt-1">Response Time: Within 48 hours as mandated by Indian Law.</p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 text-center flex items-center justify-center gap-6 text-xs text-slate-500">
          <Link to="/terms" className="hover:text-slate-900 underline">Terms of Service</Link>
          <span>•</span>
          <Link to="/refund-policy" className="hover:text-slate-900 underline">Refund Policy</Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-slate-900 underline">Contact Us</Link>
        </div>
      </div>
    </div>
  );
};
