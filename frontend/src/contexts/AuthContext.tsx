import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { db, auth, isFirebaseLive } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'provider' | 'admin';
  avatar: string | null;
  address: string;
  kyc_status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  trade_category?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronous initialization from localStorage prevents flash/reset on application restart
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('mud_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('mud_active_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (!u.phone) {
          const storedPhone = localStorage.getItem('mud_customer_phone') || localStorage.getItem('mud_remembered_phone') || localStorage.getItem('mud_technician_phone');
          if (storedPhone) u.phone = storedPhone;
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('mud_token');
    const cached = localStorage.getItem('mud_active_user');

    if (storedToken) {
      setToken(storedToken);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!parsed.phone) {
            const storedPhone = localStorage.getItem('mud_customer_phone') || localStorage.getItem('mud_remembered_phone') || localStorage.getItem('mud_technician_phone');
            if (storedPhone) parsed.phone = storedPhone;
          }
          setUser(parsed);
        } catch {}
      }

      api.getMe()
        .then(({ user: u }) => {
          if (u) {
            if (!u.phone) {
              const storedPhone = localStorage.getItem('mud_customer_phone') || localStorage.getItem('mud_remembered_phone') || localStorage.getItem('mud_technician_phone');
              if (storedPhone) u.phone = storedPhone;
            }
            setUser(u);
            try {
              localStorage.setItem('mud_active_user', JSON.stringify(u));
            } catch {}
          }
        })
        .catch((e) => {
          // Keep local cached user session intact if backend is offline or restarting
          console.warn('[AuthContext] getMe fetch notice (persisting offline session):', e?.message || e);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // ─── Auto-update user email from Google / Firebase Auth ────────────────────
  useEffect(() => {
    if (!isFirebaseLive()) return;
    try {
      const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser?.email) {
          const googleEmail = fbUser.email;
          setUser(prev => {
            if (!prev) return prev;
            if (prev.email === googleEmail) return prev;
            const updated: User = {
              ...prev,
              email: googleEmail
            };
            try {
              localStorage.setItem('mud_active_user', JSON.stringify(updated));
              localStorage.setItem('mud_remembered_email', googleEmail);
            } catch {}
            return updated;
          });
        }
      });
      return () => unsubAuth();
    } catch (e) {
      console.warn('[AuthContext] onAuthStateChanged listener warning:', e);
    }
  }, []);

  // ─── Real-time KYC & Profile listener (Firestore & PeopleData) ──────────────
  // When admin or user updates profile/KYC, immediately update the live UI
  useEffect(() => {
    if (!user?.id) return;

    // 1. Listen to global PeopleData updates
    const handlePeopleDataUpdate = (e: any) => {
      const record = e?.detail;
      if (record && (record.userId === user.id || record.id === user.id)) {
        setUser(prev => {
          if (!prev) return prev;
          const updated: User = {
            ...prev,
            name: record.fullName || record.displayName || prev.name,
            email: record.email !== undefined ? record.email : prev.email,
            phone: record.phone !== undefined ? record.phone : prev.phone,
            address: record.address !== undefined ? record.address : prev.address,
            avatar: record.avatar !== undefined ? record.avatar : prev.avatar,
            role: record.role === 'technician' ? 'provider' : (record.role || prev.role),
            trade_category: record.tradeCategory || prev.trade_category,
            kyc_status: record.kycStatus || prev.kyc_status
          };
          try {
            localStorage.setItem('mud_active_user', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    };

    window.addEventListener('mud_peopledata_updated', handlePeopleDataUpdate);

    // 2. Real-time Firestore Snapshot Listeners
    let unsubUsers: (() => void) | null = null;
    let unsubPeople: (() => void) | null = null;

    if (isFirebaseLive()) {
      try {
        unsubUsers = onSnapshot(doc(db, 'users', user.id), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const liveKycStatus = data?.kyc_status as User['kyc_status'];
            const liveTradeCategory = data?.trade_category as string | undefined;
            const liveAvatar = data?.avatar as string | undefined;
            const liveName = (data?.name || data?.fullName) as string | undefined;
            const liveAddress = data?.address as string | undefined;
            const liveEmail = data?.email as string | undefined;
            const livePhone = data?.phone as string | undefined;

            setUser(prev => {
              if (!prev) return prev;
              const effectivePhone = (livePhone && livePhone.trim()) ? livePhone : prev.phone;
              const updatedUser: User = {
                ...prev,
                ...(liveName ? { name: liveName } : {}),
                ...(liveEmail !== undefined ? { email: liveEmail } : {}),
                phone: effectivePhone,
                ...(liveAddress !== undefined ? { address: liveAddress } : {}),
                ...(liveAvatar !== undefined ? { avatar: liveAvatar } : {}),
                ...(liveKycStatus ? { kyc_status: liveKycStatus } : {}),
                ...(liveTradeCategory ? { trade_category: liveTradeCategory } : {})
              };

              try {
                localStorage.setItem('mud_active_user', JSON.stringify(updatedUser));
                if (effectivePhone) {
                  localStorage.setItem('mud_customer_phone', effectivePhone);
                  localStorage.setItem('mud_remembered_phone', effectivePhone);
                }
              } catch {}

              return updatedUser;
            });
          }
        });

        unsubPeople = onSnapshot(doc(db, 'peopledata', user.id), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUser(prev => {
              if (!prev) return prev;
              const effectivePhone = (data.phone && String(data.phone).trim()) ? data.phone : prev.phone;
              const updated: User = {
                ...prev,
                name: data.fullName || data.displayName || prev.name,
                email: data.email !== undefined ? data.email : prev.email,
                phone: effectivePhone,
                address: data.address !== undefined ? data.address : prev.address,
                avatar: data.avatar !== undefined ? data.avatar : prev.avatar,
                role: data.role === 'technician' ? 'provider' : (data.role || prev.role),
                trade_category: data.tradeCategory || prev.trade_category,
                kyc_status: data.kycStatus || prev.kyc_status
              };

              try {
                localStorage.setItem('mud_active_user', JSON.stringify(updated));
                if (effectivePhone) {
                  localStorage.setItem('mud_customer_phone', effectivePhone);
                  localStorage.setItem('mud_remembered_phone', effectivePhone);
                }
              } catch {}

              return updated;
            });
          }
        });
      } catch (e) {
        console.warn('[AuthContext] Firestore live listener warning:', e);
      }
    }

    return () => {
      window.removeEventListener('mud_peopledata_updated', handlePeopleDataUpdate);
      if (unsubUsers) unsubUsers();
      if (unsubPeople) unsubPeople();
    };
  }, [user?.id]);


  const login = (tok: string, u: User) => {
    try {
      localStorage.setItem('mud_token', tok);
      localStorage.setItem('mud_active_user', JSON.stringify(u));
      if (u.phone) {
        localStorage.setItem('mud_customer_phone', u.phone);
        localStorage.setItem('mud_remembered_phone', u.phone);
      }
    } catch {}
    setToken(tok);
    setUser(u);
  };

  const logout = () => {
    try {
      if (auth && typeof auth.signOut === 'function') {
        auth.signOut().catch(() => {});
      }
    } catch {}
    try {
      localStorage.removeItem('mud_token');
      localStorage.removeItem('mud_active_user');
      localStorage.removeItem('mud_firestore_bookings');
      localStorage.removeItem('mud_remembered_name');
      localStorage.removeItem('mud_remembered_email');
      localStorage.removeItem('mud_remembered_phone');
      localStorage.removeItem('mud_customer_phone');
      localStorage.removeItem('mud_technician_phone');
      localStorage.removeItem('mud_remembered_method');
      sessionStorage.clear();
    } catch {}
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('mud_active_user', JSON.stringify(updated));
        if (updates.phone) {
          const clean = String(updates.phone).replace(/\D/g, '').slice(-10);
          localStorage.setItem('mud_customer_phone', clean);
          localStorage.setItem('mud_remembered_phone', clean);
          if (updated.role === 'provider') {
            localStorage.setItem('mud_technician_phone', clean);
          }
        }
        if (updates.email) {
          localStorage.setItem('mud_remembered_email', updates.email);
        }
      } catch (e) {
        console.warn('[AuthContext] Failed to update mud_active_user in localStorage', e);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}


