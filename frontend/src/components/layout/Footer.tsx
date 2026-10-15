import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { DEFAULT_CATEGORIES } from '@/lib/api';

const COMPANY_LINKS = [
  { label: 'About Us', to: '/about' },
  { label: 'Partner with Us', to: '/partner' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Refund Policy', to: '/refund-policy' },
  { label: 'Contact Us', to: '/contact' },
];

export const Footer: React.FC = () => {
  // Top 5 primary featured service categories for the footer list
  const featuredCategories = DEFAULT_CATEGORIES.slice(0, 5);
  const totalCategoriesCount = DEFAULT_CATEGORIES.length;

  return (
    <footer className="bg-slate-900 text-slate-400 mt-16 pb-24 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div>
            <div className="mb-4">
              <BrandLogo variant="dark" size="md" showTagline />
            </div>
            <p className="text-sm leading-relaxed">
              Trusted hyperlocal home services platform.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Twitter"><Twitter className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Services - Dynamic & Scalable Product Explorer */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/services"
                className="text-white hover:text-blue-400 font-semibold text-sm uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 group"
                title="View all services catalog"
              >
                <span>Services</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30">
                {totalCategoriesCount}+ Categories
              </span>
            </div>

            <ul className="space-y-2 text-sm">
              {featuredCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/services?category=${cat.id}`}
                    className="hover:text-white transition-colors flex items-center justify-between group py-0.5"
                  >
                    <span>{cat.name}</span>
                    <span className="text-[11px] text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Browse →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Explore All Services CTA pill */}
            <div className="mt-3.5 pt-3 border-t border-slate-800">
              <Link
                to="/services"
                className="group flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-blue-600/20 border border-slate-700/80 hover:border-blue-500/40 text-xs font-semibold text-blue-400 hover:text-white transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-12 transition-transform" />
                  <span>Explore All Services</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-300 flex items-center gap-1">
                  Catalog <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>
          </div>

        {/* Company & Legal */}
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company & Legal</h4>
          <ul className="space-y-2 text-sm">
            {COMPANY_LINKS.map(item => (
              <li key={item.label}>
                <Link to={item.to} className="hover:text-white transition-colors">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
              <span>B.H. Road, Sagara, Shivamogga District, Karnataka — 577401</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400 shrink-0" />
              <a href="tel:+918183224400" className="hover:text-white transition-colors">+91 8183 224400</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <a href="mailto:urbanaiidea@gmail.com" className="hover:text-white transition-colors">urbanaiidea@gmail.com</a>
            </li>
          </ul>
          <div className="mt-4">
            <Link
              to="/contact"
              className="inline-flex items-center text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
            >
              Open Support & Grievance Desk →
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 mt-10 pt-6 text-xs text-slate-500">
        <p>© 2026 SOLVO. All rights reserved.</p>
      </div>
    </div>
  </footer>
  );
};
