import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck,
  ShieldCheck,
  Scale,
  AlertTriangle,
  HelpCircle,
  CreditCard,
  Wrench,
  CheckCircle2,
  Mail,
  MapPin
} from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold mb-4">
            <FileCheck className="w-4 h-4 text-slate-700" />
            <span>Official User Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Terms of Service & User Agreement
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Last Modified: September 25, 2026 • Effective for all Customers and Service Partners
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-10 text-slate-700 leading-relaxed text-sm">
          {/* Section 1 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">1</span>
              <span>Acceptance & Eligibility</span>
            </h3>
            <p className="text-slate-600 mb-3">
              These Terms of Service constitute a legally binding agreement between you (“User”, “Customer”, or “Technician Partner”) and <strong>SOLVO</strong> (“we”, “us”). By accessing our website, web application, or mobile services, you certify that you are at least 18 years of age and legally competent to enter into this contract under the Indian Contract Act, 1872.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">2</span>
              <span>Nature of Platform Services</span>
            </h3>
            <p className="text-slate-600 mb-3">
              SOLVO provides a digital matchmaking and marketplace platform that connects domestic households seeking home repair and maintenance services (“Customers”) with independent, background-verified skilled technicians and contractors (“Technicians” or “Service Partners”).
            </p>
            <p className="text-slate-600">
              Unless explicitly specified as an in-house specialized job, Service Partners operate as independent contractors. SOLVO enforces background verification, standard pricing cards, digital invoicing, and a 30-Day Rework Warranty for customer safety and quality assurance.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">3</span>
              <span>Booking, Pricing & Invoicing</span>
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">A. Standard Pricing & Itemization</h4>
                <p className="text-xs text-slate-600">
                  All labor charges are calculated according to our automated, algorithmic rate cards visible prior to booking. If additional materials or replacement parts are required, the technician must log them into the digital job desk for customer approval before installation.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">B. Payment Methods & Receipts</h4>
                <p className="text-xs text-slate-600">
                  Customers may settle the invoice via Razorpay (UPI, Credit/Debit Card, Net Banking) or Cash on Delivery (COD). Upon completion, an itemized GST invoice and 30-day warranty certificate are automatically saved under the Customer Profile.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">C. Platform Fee</h4>
                <p className="text-xs text-slate-600">
                  The platform retains an administrative and technology facilitation commission on completed orders to maintain insurance, customer support, and technology infrastructure.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">4</span>
              <span>30-Day Free Rework Warranty Policy</span>
            </h3>
            <p className="text-slate-600 mb-2">
              Every completed booking comes with our official <strong>30-Day Free Rework Warranty</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 pl-2">
              <li>Covers labor defects and workmanship faults directly connected to the specific task performed.</li>
              <li>Valid for 30 calendar days from the completion timestamp indicated on the official digital receipt.</li>
              <li>Excludes physical damage caused by external accidents, customer misuse, or unauthorized third-party tampering.</li>
              <li>Warranty claims are filed directly through the app or by emailing <a href="mailto:urbanaiidea@gmail.com" className="text-blue-600 font-semibold underline">urbanaiidea@gmail.com</a>.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">5</span>
              <span>Prohibition of Off-Platform Transactions & Price Gouging</span>
            </h3>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Strict Anti-Poaching & Cash Integrity Rule</span>
              </div>
              Customers and Technicians agree never to solicit or accept off-platform payments or side arrangements. Jobs settled off-platform immediately void all 30-Day Warranty protections, emergency insurance coverage, and lead to permanent account suspension.
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">6</span>
              <span>Security Shield & Prohibited Technological Conduct</span>
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              In compliance with Section 66 of the Indian Information Technology Act, 2000, users are prohibited from reverse-engineering, decompiling, automated web scraping, attempting to disable security shields, intercepting network API payloads, or injecting malicious XSS payloads. Violations trigger automated security logs and prosecution under relevant Indian cyber laws.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center">7</span>
              <span>Governing Law & Jurisdiction</span>
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>Sagara / Shivamogga, Karnataka</strong>.
            </p>
          </section>

          {/* Section 8 */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-700" />
              <span>Questions & Legal Inquiries</span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              For legal notices, contract questions, or service inquiries, please contact our legal counsel:
            </p>
            <div className="space-y-1 text-xs text-slate-700">
              <p><strong>Entity:</strong> SOLVO</p>
              <p><strong>Office:</strong> B.H. Road, Sagara, Shivamogga District, Karnataka — 577401</p>
              <p>
                <strong>Official Email:</strong>{' '}
                <a href="mailto:urbanaiidea@gmail.com" className="text-blue-600 font-bold underline">
                  urbanaiidea@gmail.com
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 text-center flex items-center justify-center gap-6 text-xs text-slate-500">
          <Link to="/privacy" className="hover:text-slate-900 underline">Privacy Policy</Link>
          <span>•</span>
          <Link to="/refund-policy" className="hover:text-slate-900 underline">Refund Policy</Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-slate-900 underline">Contact Us</Link>
        </div>
      </div>
    </div>
  );
};
