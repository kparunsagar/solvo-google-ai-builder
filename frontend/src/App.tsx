import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Headphones, CheckCircle, Phone, X, Sparkles, AlertTriangle, WifiOff, BellRing } from 'lucide-react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { remoteConfigService } from '@/services/remoteConfig.service';
import { messagingService, PushNotificationPayload } from '@/services/messaging.service';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { LocationDrawer } from '@/components/LocationDrawer';
import { ServiceUnavailableModal } from '@/components/ServiceUnavailableModal';
import { WelcomeGreetingModal } from '@/components/WelcomeGreetingModal';
import { LocationState, locationService } from '@/services/microservices/location.service';
import { AuthModal } from '@/components/auth/AuthModal';
import { SupportModal } from '@/components/SupportModal';
import { CustomerAiModal } from '@/components/CustomerAiModal';
import { HomePage } from '@/pages/HomePage';
import { ServicesPage } from '@/pages/ServicesPage';
import { BookingPage } from '@/pages/BookingPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TechnicianPage } from '@/pages/TechnicianPage';
import { KycPage } from '@/pages/KycPage';
import { AdminPage } from '@/pages/AdminPage';
import { AboutPage } from '@/pages/AboutPage';
import { PartnerPage } from '@/pages/PartnerPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { ContactPage } from '@/pages/ContactPage';
import { RefundPolicyPage } from '@/pages/RefundPolicyPage';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Route guard: only providers and technicians can access technician routes
function ProviderRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  const isTech = user.role === 'provider' || (user.role as string) === 'technician';
  if (!isTech) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Route guard: customers are blocked from technician routes
function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  const isTech = user?.role === 'provider' || (user?.role as string) === 'technician';
  if (isTech) return <Navigate to="/technician" replace />;
  return <>{children}</>;
}

// Route guard: strictly restrict admin mission control to verified administrators
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  const isTech = user?.role === 'provider' || (user?.role as string) === 'technician';
  if (!user || user.role !== 'admin') {
    return <Navigate to={isTech ? '/technician' : '/'} replace />;
  }
  return <>{children}</>;
}

// Inner app that has access to AuthContext
function AppInner() {
  const { token, user } = useAuth();
  const [locationLabel, setLocationLabel] = useState(() => {
    const verified = locationService.getVerifiedLocation();
    return verified ? verified.locality : 'Detecting live location...';
  });
  const [detectedLocation, setDetectedLocation] = useState<LocationState | null>(() => {
    return locationService.getVerifiedLocation();
  });
  const [serviceUnavailableOpen, setServiceUnavailableOpen] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<'customer' | 'provider'>('customer');
  const [supportOpen, setSupportOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [emergencyBanner, setEmergencyBanner] = useState<string>('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pushToast, setPushToast] = useState<PushNotificationPayload | null>(null);
  const location = useLocation();

  // Scroll to top on every route transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ─── Firebase Remote Config & Cloud Messaging Initialization ────────────────
  useEffect(() => {
    // 1. Remote Config
    remoteConfigService.init().then((cfg) => {
      if (cfg.emergencyBannerText) {
        setEmergencyBanner(cfg.emergencyBannerText);
      }
    });

    // 2. Web Push Notifications
    messagingService.init().then((ready) => {
      if (ready) {
        messagingService.onForeground((payload) => {
          setPushToast(payload);
          setTimeout(() => setPushToast(null), 8000);
        });
      }
    });

    // 3. Network Connection Liveness Monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Automatic Device Live Location Resolution ──────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const detectLiveLocation = async () => {
      try {
        const verified = locationService.getVerifiedLocation();
        if (verified && (verified.source === 'search' || verified.source === 'manual')) {
          setDetectedLocation(verified);
          setLocationLabel(verified.locality);
          if (verified.isServiceable) {
            setServiceUnavailableOpen(false);
          } else {
            setServiceUnavailableOpen(true);
          }
          return;
        }

        const loc = await locationService.resolveLiveLocation({ enableHighAccuracy: true, timeoutMs: 15000 });
        if (!isMounted) return;
        setDetectedLocation(loc);

        if (loc.isServiceable) {
          setLocationLabel(loc.locality);
          setServiceUnavailableOpen(false);
        } else {
          // Device GPS explicitly verified coordinates outside active hubs (e.g. Mumbai, Delhi, etc.)
          const label = loc.locality || `${loc.city || 'Unknown Area'}, ${loc.state || 'Karnataka'}`;
          setLocationLabel(label);
          setServiceUnavailableOpen(true);
        }
      } catch (e) {
        console.warn('[App] Live location auto-detection error:', e);
        if (isMounted) {
          const fallback = locationService.getStoredLocation();
          setLocationLabel(fallback.locality || 'Gandhi Nagar, Sagara');
          if (!fallback.isServiceable) {
            setServiceUnavailableOpen(true);
          }
        }
      }
    };

    detectLiveLocation();
    return () => { isMounted = false; };
  }, []);

  const handleRecheckGpsLocation = async () => {
    try {
      const loc = await locationService.resolveLiveLocation({ enableHighAccuracy: true, forceGps: true, timeoutMs: 15000 });
      setDetectedLocation(loc);
      if (loc.isServiceable) {
        setLocationLabel(loc.locality);
        setServiceUnavailableOpen(false);
      } else {
        const label = loc.locality || `${loc.city || 'Unknown Area'}, ${loc.state || 'Karnataka'}`;
        setLocationLabel(label);
        setServiceUnavailableOpen(true);
      }
    } catch (err) {
      console.warn('Re-check GPS error:', err);
    }
  };

  // ─── Listen to Global Location Synchronization Events ───────────────────────
  useEffect(() => {
    const handleLocationChange = (e: any) => {
      const loc = e.detail as LocationState;
      if (loc) {
        setLocationLabel(loc.locality);
        setDetectedLocation(loc);
      }
    };
    window.addEventListener('mud_location_changed', handleLocationChange);
    return () => window.removeEventListener('mud_location_changed', handleLocationChange);
  }, []);

  // ─── Booking Accepted Notification (customer receives technician details & robo phone) ───
  const [bookingAcceptedInfo, setBookingAcceptedInfo] = useState<{
    technician_name: string;
    technician_phone: string;
    technician_avatar_url?: string;
    tech_uid?: string;
    booking_id?: string;
  } | null>(null);

  useEffect(() => {
    const handleAccepted = (e: any) => {
      setBookingAcceptedInfo({
        technician_name: e.detail?.technician_name || 'Your Assigned Technician',
        technician_phone: e.detail?.technician_phone || e.detail?.technician_masked_phone || '+91 80 4719 3320',
        technician_avatar_url: e.detail?.technician_avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
        tech_uid: e.detail?.tech_uid || 'UD-SGR-00412',
        booking_id: e.detail?.booking_id || ''
      });
      setTimeout(() => setBookingAcceptedInfo(null), 15000);
    };
    window.addEventListener('mud_booking_accepted', handleAccepted);
    return () => window.removeEventListener('mud_booking_accepted', handleAccepted);
  }, []);

  // ─── Welcome Greeting Modal (New User / Google Login Celebration) ───────────
  const [welcomeGreeting, setWelcomeGreeting] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const handleGreeting = (e: any) => {
      const email = e.detail?.email;
      if (email) {
        const welcomeKey = `mud_welcome_shown_${email.trim().toLowerCase()}`;
        if (localStorage.getItem(welcomeKey) === 'true') {
          return; // Returning user: never show welcome greeting modal again
        }
        localStorage.setItem(welcomeKey, 'true');
        setWelcomeGreeting({
          name: e.detail.name || 'Friend',
          email
        });
      }
    };
    window.addEventListener('mud_show_welcome_greeting', handleGreeting);
    return () => window.removeEventListener('mud_show_welcome_greeting', handleGreeting);
  }, []);

  const handleOpenAuth = (role: 'customer' | 'provider' = 'customer') => {
    setAuthRole(role);
    setAuthOpen(true);
  };

  return (
    <SocketProvider token={token}>
      <div className="flex flex-col min-h-screen bg-slate-50">
        {/* ─── Remote Config Emergency / Monsoon Notice Banner ─────────────── */}
        {emergencyBanner && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-50">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" />
              <span>{emergencyBanner}</span>
            </div>
            <button
              onClick={() => setEmergencyBanner('')}
              className="text-amber-100 hover:text-white p-1 rounded-md"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── High Availability Offline Persistence Indicator ─────────────── */}
        {isOffline && (
          <div className="bg-slate-900 text-slate-200 px-3 py-1.5 text-[11px] font-semibold flex items-center justify-center gap-2 border-b border-slate-800">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>High-Availability Mode: Operating from local IndexedDB offline storage (zero latency). Changes will automatically synchronize when network is restored.</span>
          </div>
        )}

        {!location.pathname.startsWith('/admin') && (
          <Header
            onOpenAuth={handleOpenAuth}
            onOpenLocationDrawer={() => setLocationDrawerOpen(true)}
            onRecheckGps={handleRecheckGpsLocation}
            onOpenAiConcierge={() => setAiModalOpen(true)}
            locationLabel={locationLabel}
            currentLocation={detectedLocation}
          />
        )}

        <main className="flex-1">
          <Routes>
            {/* Customer-only routes */}
            <Route path="/" element={<CustomerRoute><HomePage /></CustomerRoute>} />
            <Route path="/services" element={<CustomerRoute><ServicesPage /></CustomerRoute>} />
            <Route path="/book/:serviceId" element={<CustomerRoute><BookingPage /></CustomerRoute>} />
            <Route path="/bookings" element={<CustomerRoute><BookingsPage /></CustomerRoute>} />

            {/* Provider-only routes */}
            <Route path="/technician" element={<ProviderRoute><TechnicianPage /></ProviderRoute>} />
            <Route path="/kyc" element={<ProviderRoute><KycPage /></ProviderRoute>} />

            {/* Shared & Operations */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

            {/* Public Information & Legal Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />

            {/* Catch-all: route by role */}
            <Route path="*" element={
              user?.role === 'provider'
                ? <Navigate to="/technician" replace />
                : <Navigate to="/" replace />
            } />
          </Routes>
        </main>

        {/* Global Footer (with mobile bottom padding) */}
        {!location.pathname.startsWith('/admin') && <Footer />}

        {/* Mobile Bottom Navigation */}
        {!location.pathname.startsWith('/admin') && <BottomNav />}

        {/* Global Drawers & Modals */}
        <LocationDrawer
          isOpen={locationDrawerOpen}
          currentLocality={locationLabel}
          onClose={() => setLocationDrawerOpen(false)}
          onSelect={(label, locState) => {
            setLocationLabel(label);
            if (locState) {
              setDetectedLocation(locState);
              locationService.saveLocation(locState);
            }
          }}
          onUnserviceableLocation={(loc) => {
            setDetectedLocation(loc);
            setServiceUnavailableOpen(true);
          }}
        />

        <ServiceUnavailableModal
          isOpen={serviceUnavailableOpen}
          location={detectedLocation}
          onClose={() => setServiceUnavailableOpen(false)}
          onExploreDemo={() => setServiceUnavailableOpen(false)}
          onRecheckGps={handleRecheckGpsLocation}
        />

        <AuthModal
          isOpen={authOpen}
          defaultRole={authRole}
          onClose={() => setAuthOpen(false)}
        />

        {/* 🎉 First-time User & Google SSO Welcome Celebration Modal */}
        <WelcomeGreetingModal
          isOpen={!!welcomeGreeting}
          userName={welcomeGreeting?.name || ''}
          userEmail={welcomeGreeting?.email || ''}
          onClose={() => setWelcomeGreeting(null)}
        />

        <CustomerAiModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          currentLocation={detectedLocation}
        />

        {/* Floating Help & Support Action */}
        <button
          onClick={() => setSupportOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-6 z-40 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl hover:bg-blue-600 transition-all transform hover:scale-105 border border-slate-700"
          title="Need help? Open 24/7 Operations Support"
        >
          <Headphones className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold tracking-wide">Support Desk</span>
        </button>

        <SupportModal
          isOpen={supportOpen}
          onClose={() => setSupportOpen(false)}
        />

        {/* ─── Booking Accepted Notification Toast (Photo + Name + Robo Telephony) ─── */}
        {bookingAcceptedInfo && (
          <div style={{
            position: 'fixed',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '92%',
            maxWidth: 480,
            backgroundColor: '#064e3b',
            color: '#ffffff',
            borderRadius: 20,
            padding: '16px 20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15)',
            animation: 'slideDown 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: '#10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle size={15} color="#fff" />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Technician Assigned • Verification Card
                </span>
              </div>
              <button
                onClick={() => setBookingAcceptedInfo(null)}
                style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', padding: 2 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Technician Profile Card: Photo + Name + Tech ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: 14 }}>
              {bookingAcceptedInfo.technician_avatar_url ? (
                <img
                  src={bookingAcceptedInfo.technician_avatar_url}
                  alt={bookingAcceptedInfo.technician_name}
                  style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', border: '2px solid #10b981', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                  {bookingAcceptedInfo.technician_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                    {bookingAcceptedInfo.technician_name}
                  </h4>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, backgroundColor: 'rgba(16,185,129,0.3)', color: '#a7f3d0', padding: '1px 6px', borderRadius: 4 }}>
                    KYC Verified
                  </span>
                </div>
                {bookingAcceptedInfo.tech_uid && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#a7f3d0', fontFamily: 'monospace' }}>
                    ID: {bookingAcceptedInfo.tech_uid}
                  </p>
                )}
              </div>
            </div>

            {/* Robo Masked Phone Number Strip */}
            {bookingAcceptedInfo.technician_phone && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                backgroundColor: '#065f46', borderRadius: 12, padding: '10px 14px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} color="#34d399" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                      {bookingAcceptedInfo.technician_phone}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#a7f3d0', marginTop: 2 }}>
                    🛡️ Real mobile number hidden for privacy (Urban Daily Robo Telephony Bridge)
                  </div>
                </div>

                <a
                  href={`tel:${bookingAcceptedInfo.technician_phone.replace(/[^0-9+]/g, '')}`}
                  style={{
                    backgroundColor: '#10b981', color: '#ffffff',
                    fontWeight: 800, fontSize: '0.75rem', padding: '6px 12px',
                    borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                  }}
                >
                  <Phone size={12} /> Call
                </a>
              </div>
            )}

            <div style={{ fontSize: '0.72rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Technician is on the way to your doorstep.</span>
              <a href="/bookings" style={{ color: '#ffffff', fontWeight: 700, textDecoration: 'underline' }}>
                Track Live →
              </a>
            </div>
          </div>
        )}

        {/* ─── Real-time Web Push Notification Toast (FCM) ──────────────────── */}
        {pushToast && (
          <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 animate-in slide-in-from-top-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-100">{pushToast.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{pushToast.body}</p>
            </div>
            <button
              onClick={() => setPushToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </SocketProvider>

  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <NotificationProvider>
              <AppInner />
            </NotificationProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
