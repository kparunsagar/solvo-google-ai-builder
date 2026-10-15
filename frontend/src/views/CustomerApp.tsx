import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Zap,
  Sparkles,
  Tv,
  Hammer,
  Paintbrush,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Check,
  Search,
  Star,
  BadgePercent,
  Shield
} from 'lucide-react';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { LiveTracker } from '../components/LiveTracker';
import { SmartBookingTracker } from '../components/SmartBookingTracker';
import { SagaraMap } from '../components/SagaraMap';
import { BikeTrackingMap } from '../components/BikeTrackingMap';
import { PaymentModal } from '../components/PaymentModal';
import { ReviewModal } from '../components/ReviewModal';
import { AuthModal } from '../components/auth/AuthModal';
import { ItemizedInvoiceModal } from '../components/ItemizedInvoiceModal';
import { clearAppCache } from '../lib/cache';
import { ServiceUnavailable } from '../components/ServiceUnavailable';
import { LocationState } from '../services/microservices/location.service';
import { SAGARA_LOCALITIES } from '../data/sagara-localities';

const ICON_MAP: Record<string, any> = {
  Wrench,
  Zap,
  Sparkles,
  Tv,
  Hammer,
  Paintbrush
};

interface CustomerAppProps {
  language: 'en' | 'kn';
  customerUser: any;
  locationState?: LocationState;
  onOpenLocationDrawer?: () => void;
  onSwitchToSagara?: () => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  language,
  customerUser,
  locationState,
  onOpenLocationDrawer,
  onSwitchToSagara
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedLocality, setSelectedLocality] = useState(SAGARA_LOCALITIES[0]);
  const [addressNotes, setAddressNotes] = useState('');
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState<'book' | 'active' | 'history'>('book');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadCategories();
    loadBookings();

    // Subscribe to WebSocket events for live updates
    const unsubscribe = socket.subscribe((payload) => {
      if (payload.type === 'BOOKING_UPDATED' && payload.booking) {
        if (payload.booking.customer_id === customerUser?.id) {
          setActiveBooking(payload.booking);
          loadBookings();
        }
      }
    });

    return () => unsubscribe();
  }, [customerUser?.id]);

  async function loadCategories() {
    try {
      const data = await api.getCategories();
      setCategories(data);
      if (data.length > 0) {
        selectCategory(data[0]);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  async function selectCategory(cat: any) {
    setSelectedCategory(cat);
    try {
      const data = await api.getServices(cat.id);
      setServices(data);
      setSelectedService(null);
    } catch (err) {
      console.error('Failed to load services', err);
    }
  }

  async function loadBookings() {
    try {
      const custId = customerUser?.id || 'usr-guest';
      const list = await api.getBookings({ customerId: custId });
      setBookingHistory(list);
      const ongoing = list.find(
        (b) => !['REVIEWED', 'CANCELLED'].includes(b.status)
      );
      if (ongoing) {
        setActiveBooking(ongoing);
      }
    } catch (err) {
      console.error('Failed to load customer bookings', err);
    }
  }

  const [loggedInCustomer, setLoggedInCustomer] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('urbanai_active_user') || localStorage.getItem('urbanai_customer_token');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [consultationLocation, setConsultationLocation] = useState<any>(null);

  const handlePlaceBooking = async () => {
    if (!selectedService) return;
    // Strict Guard: Must be authenticated via mobile OTP
    if (!loggedInCustomer) {
      setShowAuthModal(true);
      return;
    }

    try {
      const targetLocality = consultationLocation?.locality || locationState?.locality || `${selectedLocality.name}, ${selectedLocality.regionName}`;
      const targetText = consultationLocation?.addressText || locationState?.formattedAddress || selectedLocality.landmark;
      const targetLat = consultationLocation?.lat || locationState?.lat || selectedLocality.lat;
      const targetLng = consultationLocation?.lng || locationState?.lng || selectedLocality.lng;

      const res = await api.createBooking({
        customerId: loggedInCustomer.id,
        serviceId: selectedService.id,
        addressLocality: targetLocality,
        addressText: targetText,
        addressLat: targetLat,
        addressLng: targetLng,
        customerNotes: addressNotes || 'Live consultation doorstep dispatch via SOLVO'
      });

      setActiveBooking(res.booking);
      setSelectedService(null);
      setViewTab('active');
      loadBookings();
    } catch (err: any) {
      alert(`Booking failed: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewTab('book')}
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 700,
              backgroundColor: viewTab === 'book' ? '#2563eb' : '#ffffff',
              color: viewTab === 'book' ? '#ffffff' : '#64748b',
              border: '1px solid #e2e8f0'
            }}
          >
            {language === 'kn' ? 'ಸೇವೆಗಳನ್ನು ಹುಡುಕಿ' : 'Book a Service'}
          </button>

          {activeBooking && (
            <button
              onClick={() => setViewTab('active')}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: viewTab === 'active' ? '#2563eb' : '#eff6ff',
                color: viewTab === 'active' ? '#ffffff' : '#2563eb',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>{language === 'kn' ? 'ಪ್ರಸ್ತುತ ಬುಕಿಂಗ್' : 'Active Booking'}</span>
            </button>
          )}

          {loggedInCustomer && (
            <button
              onClick={() => setViewTab('history')}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                fontSize: '0.85rem',
                fontWeight: 700,
                backgroundColor: viewTab === 'history' ? '#2563eb' : '#ffffff',
                color: viewTab === 'history' ? '#ffffff' : '#64748b',
                border: '1px solid #e2e8f0'
              }}
            >
              {language === 'kn' ? 'ಹಿಂದಿನ ಬುಕಿಂಗ್' : 'Booking History'}
            </button>
          )}

          {!loggedInCustomer && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#eff6ff',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.78rem',
              color: '#1e40af',
              fontWeight: 700
            }}>
              <span>Sign in to view in-progress bookings & live tracking</span>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Locality Dropdown & User Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#475569' }}>
            <MapPin size={14} color="#ef4444" />
            <span style={{ fontWeight: 600 }}>Locality:</span>
            <select
              value={selectedLocality.id}
              onChange={(e) => {
                const loc = SAGARA_LOCALITIES.find((l) => l.id === e.target.value);
                if (loc) setSelectedLocality(loc);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontWeight: 700,
                color: '#0f172a'
              }}
            >
              {SAGARA_LOCALITIES.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {language === 'kn' ? loc.name_kn : loc.name}, {loc.regionName} (PIN: {loc.pincode})
                </option>
              ))}
            </select>
          </div>

          {/* User Status / Login Button */}
          {loggedInCustomer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', backgroundColor: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <span style={{ color: '#166534', fontWeight: 700 }}>📱 +91 {loggedInCustomer.phone}</span>
              <button
                type="button"
                onClick={async () => {
                  await clearAppCache({ reload: false });
                  setLoggedInCustomer(null);
                  window.location.reload();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textDecoration: 'underline'
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #2563eb',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🔐 Login with Mobile OTP
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: ACTIVE BOOKING LIVE TRACKER */}
      {viewTab === 'active' && activeBooking && (
        <div className="w-full">
          <SmartBookingTracker
            booking={activeBooking}
            onBookingUpdated={(b) => setActiveBooking(b)}
            onPayRazorpay={() => setShowPaymentModal(true)}
            onBack={() => setViewTab('book')}
          />
        </div>
      )}

      {/* VIEW 2: SERVICE BOOKING CATALOG */}
      {viewTab === 'book' && (
        locationState && !locationState.isServiceable ? (
          <ServiceUnavailable
            location={locationState}
            onSwitchToSagara={onSwitchToSagara || (() => {})}
            onChangeLocation={onOpenLocationDrawer || (() => {})}
          />
        ) : (
          <div>
            {/* Active Job Alert Pill if one exists */}
          {activeBooking && (
            <div
              onClick={() => setViewTab('active')}
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563eb' }} className="radar-ping" />
                <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.85rem' }}>
                  Booking {activeBooking.booking_code} is currently {activeBooking.status}. Click to track live!
                </span>
              </div>
              <ChevronRight size={18} color="#2563eb" />
            </div>
          )}

          {/* Retail Hero Banner with Search */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
            borderRadius: 20,
            padding: '36px 32px',
            color: '#ffffff',
            marginBottom: 20,
            boxShadow: '0 10px 30px rgba(37,99,235,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ maxWidth: 680, position: 'relative', zIndex: 2 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: 12
              }}>
                <Sparkles size={14} color="#fbbf24" />
                <span>India's Trusted Hyperlocal Marketplace</span>
              </span>

              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {language === 'kn' ? 'SOLVO — ನಿಮ್ಮ ಮನೆ ಬಾಗಿಲಿಗೆ ವಿಶ್ವಾಸಾರ್ಹ ಸೇವೆಗಳು' : 'Expert Home Services at Your Doorstep'}
              </h2>
              <p style={{ opacity: 0.9, fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 20 }}>
                {language === 'kn'
                  ? 'ಪ್ಲಂಬಿಂಗ್, ಎಲೆಕ್ಟ್ರಿಕಲ್, ಡೀಪ್ ಕ್ಲೀನಿಂಗ್ ಮತ್ತು ಉಪಕರಣ ದುರಸ್ತಿ — ತಕ್ಷಣದ ಬುಕಿಂಗ್ ಮತ್ತು ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್.'
                  : 'Verified local technicians for AC repair, plumbing, electrical works & deep cleaning with instant live GPS tracking.'}
              </p>

              {/* Retail Search Bar */}
              <div style={{ position: 'relative', maxWidth: 560 }}>
                <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: 16, top: 14 }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 'Tap leakage', 'Fan repair', 'AC service', 'Cleaning'..."
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    borderRadius: 12,
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Retail Trust Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>100% KYC Verified</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Background checked pros</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>60-Min Arrival</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Live bike GPS dispatch</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>30-Day Warranty</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Free rework guarantee</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BadgePercent size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Flat ₹100 Off</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Applied on checkout</div>
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
            {language === 'kn' ? 'ಸೇವಾ ವಿಭಾಗಗಳು' : 'Browse by Trade Category'}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 28
          }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              const IconComp = ICON_MAP[cat.icon] || Wrench;

              return (
                <div
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    padding: '16px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10
                  }}>
                    <IconComp size={22} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                    {language === 'kn' ? cat.name_kn : cat.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                    Base ₹{cat.base_inspection_fee}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Services in Selected Category */}
          {selectedCategory && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {language === 'kn' ? selectedCategory.name_kn : selectedCategory.name} Services
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Verified, KYC-checked professionals ready to dispatch
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 700, backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: 20 }}>
                  {services.filter(s => !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.toLowerCase())).length} options
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
                {services
                  .filter(s => !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((service) => {
                  const isChosen = selectedService?.id === service.id;
                  const originalPrice = service.base_price + 100;

                  return (
                    <div
                      key={service.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        border: isChosen ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        padding: '22px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isChosen ? '0 8px 24px rgba(37,99,235,0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Top Retail Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          <Star size={12} fill="#059669" />
                          <span>4.92 (1.2k+ reviews)</span>
                        </div>

                        <span style={{
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}>
                          SAVE ₹100
                        </span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                            {language === 'kn' ? service.name_kn : service.name}
                          </h4>
                        </div>

                        {/* Retail Price Display */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 10px' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                            ₹{service.base_price}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            ₹{originalPrice}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                            Doorstep Inspection Included
                          </span>
                        </div>

                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
                          {service.description}
                        </p>

                        <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: '#475569', marginBottom: 14 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
                            <Clock size={12} color="#2563eb" /> {service.estimated_duration_mins} mins
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
                            <ShieldCheck size={12} color="#059669" /> {service.warranty_days} days warranty
                          </span>
                        </div>

                        {/* Included Tasks Checklist */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: 10, marginBottom: 16, border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Included in Package:
                          </div>
                          {service.included_tasks?.map((task: string, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#475569', marginBottom: 4 }}>
                              <Check size={12} color="#10b981" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedService(service)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: 10,
                          backgroundColor: isChosen ? '#2563eb' : '#eff6ff',
                          color: isChosen ? '#ffffff' : '#2563eb',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          border: isChosen ? 'none' : '1px solid #bfdbfe',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: isChosen ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isChosen ? <Check size={16} /> : null}
                        <span>{isChosen ? 'Selected for Doorstep Dispatch' : '+ Select Service'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Booking Confirmation Drawer / Sheet */}
          {selectedService && (
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderTop: '1px solid #cbd5e1',
              padding: '16px 24px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
              zIndex: 90
            }}>
              <div style={{
                maxWidth: 1200,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Confirm Booking for:
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedService.name} • {consultationLocation?.locality || locationState?.locality || `${selectedLocality.name}, ${selectedLocality.regionName}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Estimate</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>
                      ₹{selectedService.base_price + Math.round(selectedService.base_price * 0.15 * 0.18)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!loggedInCustomer) {
                        setShowAuthModal(true);
                      } else {
                        handlePlaceBooking();
                      }
                    }}
                    style={{
                      padding: '12px 28px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{loggedInCustomer ? 'Confirm & Dispatch Pro' : 'Login to Book in 45 Mins'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )
      )}

      {/* VIEW 3: BOOKING HISTORY */}
      {viewTab === 'history' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
            {language === 'kn' ? 'ನಿಮ್ಮ ಹಿಂದಿನ ಬುಕಿಂಗ್‌ಗಳು' : 'Your Past Bookings in Sagara'}
          </h3>

          {bookingHistory.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: 12 }}>
              No bookings yet. Book a service above!
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {bookingHistory.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setActiveBooking(b);
                    setViewTab('active');
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.85rem' }}>{b.booking_code}</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{b.service?.name}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                      📍 {b.address_locality} • {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>₹{b.total_amount}</div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>{b.status}</div>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showPaymentModal && activeBooking && (
        <PaymentModal
          booking={activeBooking}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(updated) => {
            setActiveBooking(updated);
            setShowPaymentModal(false);
          }}
        />
      )}

      {showReviewModal && activeBooking && (
        <ReviewModal
          booking={activeBooking}
          onClose={() => setShowReviewModal(false)}
          onSuccess={(updated) => {
            setActiveBooking(updated);
            setShowReviewModal(false);
          }}
        />
      )}

      {/* Itemized Tax Invoice Modal */}
      {showInvoiceModal && activeBooking && (
        <ItemizedInvoiceModal
          booking={activeBooking}
          customerUser={loggedInCustomer || customerUser}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Universal Simplified Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        defaultRole="customer"
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          try {
            const u = localStorage.getItem('mud_active_user');
            if (u) setLoggedInCustomer(JSON.parse(u));
          } catch {}
          setShowAuthModal(false);
        }}
      />
    </div>
  );
};
