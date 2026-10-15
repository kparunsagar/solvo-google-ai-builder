import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Edit3,
  LogOut,
  ShieldCheck,
  BookOpen,
  ChevronRight,
  Headphones,
  X,
  Check,
  Camera,
  Sparkles,
  Upload,
  Plus,
  FileText,
  Receipt,
  Printer,
  Download,
  ExternalLink,
  Info,
  Briefcase,
  Scale,
  HelpCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { ItemizedInvoiceModal } from '@/components/ItemizedInvoiceModal';
import { api } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { clearAppCache } from '@/lib/cache';
import { getPeopleData, savePeopleData, CustomerReceipt, getCustomerReceipts } from '@/lib/peopledata';
import { resolveBookingBilling } from '@/lib/billing';
import { cn } from '@/lib/utils';

const PRESET_AVATARS = [
  '👨', '👩', '🧑‍🔧', '👨‍🔧', '👩‍🔧', '⚡', '🚰', '🛠️', '💼', '🏡', '🧑‍💻', '🌟'
];

function compressImage(dataUrl: string, maxWidth = 300, maxHeight = 300, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const ProfilePage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editTrade, setEditTrade] = useState('');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Customer Digital Receipts Sub-Collection
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CustomerReceipt | null>(null);

  // Hydrate authoritative profile from PeopleData layer on load
  useEffect(() => {
    if (!user?.id) return;
    getPeopleData({ userId: user.id, email: user.email || undefined, phone: user.phone || undefined })
      .then((rec) => {
        if (rec) {
          updateUser({
            name: rec.fullName || rec.displayName || user.name,
            email: rec.email !== undefined ? rec.email : user.email,
            phone: rec.phone !== undefined ? rec.phone : user.phone,
            address: rec.address !== undefined ? rec.address : user.address,
            avatar: rec.avatar !== undefined ? rec.avatar : user.avatar,
            trade_category: rec.tradeCategory || user.trade_category,
            kyc_status: rec.kycStatus || user.kyc_status
          });
        }
      })
      .catch(() => {});

    // Load customer receipts from DB sub-item
    setLoadingReceipts(true);
    getCustomerReceipts(user.id)
      .then((list) => setReceipts(list))
      .catch(() => {})
      .finally(() => setLoadingReceipts(false));

    const handleReceiptUpdate = () => {
      getCustomerReceipts(user.id).then(setReceipts).catch(() => {});
    };
    window.addEventListener('mud_receipt_saved', handleReceiptUpdate);
    window.addEventListener('mud_payment_completed', handleReceiptUpdate);
    return () => {
      window.removeEventListener('mud_receipt_saved', handleReceiptUpdate);
      window.removeEventListener('mud_payment_completed', handleReceiptUpdate);
    };
  }, [user?.id]);

  const handleOpenEdit = (focusField?: 'photo' | 'name' | 'email' | 'phone' | 'address') => {
    if (!user) return;
    const googleEmail = auth?.currentUser?.email;
    setEditName(user.name || '');
    setEditEmail(user.email || googleEmail || '');
    setEditPhone(user.phone || '');
    setEditAddress(user.address || '');
    setEditAvatar(user.avatar || '');
    setEditTrade(user.trade_category || '');
    setCustomPhotoUrl(user.avatar?.startsWith('http') || user.avatar?.startsWith('data:') ? user.avatar : '');
    setSaveSuccess(false);
    setSaveError('');
    setEditOpen(true);

    if (focusField === 'photo') {
      setTimeout(() => fileInputRef.current?.click(), 200);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result as string;
      const compressed = await compressImage(rawDataUrl);
      setCustomPhotoUrl(compressed);
      setEditAvatar(compressed);
      setSaveError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    const cleanPhone = editPhone.trim().replace(/\D/g, '').slice(-10);

    if (!trimmedName) {
      setSaveError('Full name is required.');
      return;
    }
    if (!trimmedEmail) {
      setSaveError('Email field is mandatory, without that no one can save it.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setSaveError('Please enter a valid email address (e.g. user@gmail.com).');
      return;
    }
    if (!cleanPhone) {
      setSaveError('10-digit mobile number is mandatory for your profile.');
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setSaveError('Please enter a valid 10-digit mobile number (e.g. 9845123456).');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const chosenAvatar = customPhotoUrl.trim() || editAvatar.trim() || undefined;
      const updates = {
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanPhone,
        address: editAddress.trim() || undefined,
        avatar: chosenAvatar,
        trade_category: user?.role === 'provider' ? editTrade : undefined
      };

      // 1. Commit to Dedicated PeopleData Entity Layer
      await savePeopleData({
        userId: user.id,
        fullName: updates.name,
        displayName: updates.name,
        email: updates.email,
        phone: updates.phone,
        avatar: updates.avatar,
        address: updates.address,
        role: user.role,
        tradeCategory: updates.trade_category,
        kycStatus: user.kyc_status
      });

      // 2. Commit to api and local auth context
      await api.updateProfile(updates);
      updateUser(updates);
      setSaveSuccess(true);
      setTimeout(() => {
        setEditOpen(false);
        setSaveSuccess(false);
      }, 900);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">My Profile</h2>
        <p className="text-slate-500 mb-6">Login to view and manage your profile</p>
        <button
          onClick={() => setAuthOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Login / Sign Up
        </button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  const kycBadge = {
    not_submitted: { label: 'KYC Not Submitted', color: 'bg-slate-100 text-slate-600' },
    pending: { label: 'KYC Under Review', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'KYC Verified ✓', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'KYC Rejected', color: 'bg-red-100 text-red-600' },
  }[user.kyc_status];

  const menuItems = [
    { icon: BookOpen, label: 'My Bookings', to: '/bookings' },
    {
      icon: Headphones,
      label: 'My Support Tickets',
      to: user.role === 'provider' ? '/technician?tab=tickets' : '/bookings?tab=tickets'
    },
    ...(user.role === 'provider'
      ? [{ icon: User, label: 'Technician Dashboard', to: '/technician' }]
      : []),
  ];

  const companyMenuItems = [
    { icon: Info, label: 'About SOLVO', to: '/about' },
    { icon: Briefcase, label: 'Partner With Us', to: '/partner' },
    { icon: HelpCircle, label: 'Help & Contact Support', to: '/contact' },
    { icon: Scale, label: 'Privacy Policy & Terms', to: '/privacy' },
  ];

  const renderAvatar = (avatar: string | null | undefined, name: string) => {
    if (avatar?.startsWith('http') || avatar?.startsWith('data:')) {
      return <img src={avatar} alt={name} className="w-full h-full object-cover rounded-2xl" />;
    }
    if (avatar) {
      return <span className="text-3xl">{avatar}</span>;
    }
    return <span className="text-2xl font-black">{name.charAt(0).toUpperCase()}</span>;
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 pb-24">

      {/* Profile Card Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white mb-6 relative overflow-hidden shadow-xl">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Interactive Avatar with Camera Upload */}
            <div
              onClick={() => handleOpenEdit('photo')}
              className="relative group cursor-pointer"
              title="Click to change profile photo"
            >
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white/20 flex items-center justify-center border-2 border-white/40 overflow-hidden shrink-0 shadow-inner">
                {renderAvatar(user.avatar, user.name)}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user.name}</h2>
                <button
                  onClick={() => handleOpenEdit('name')}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                  title="Edit Name"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5 font-medium">{user.email || user.phone}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-white/25 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                  {user.role === 'customer' ? '👤 Customer' : '🔧 Technician'}
                </span>
                {user.role === 'provider' && (
                  <span className={cn('text-xs font-bold px-3 py-1 rounded-full shadow-xs', kycBadge.color)}>
                    {kycBadge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prominent Edit Profile Button */}
          <button
            onClick={() => handleOpenEdit()}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-blue-600" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Profile Incomplete Warning Banner if email or mobile is missing */}
      {(!user.email || !user.phone) && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-black text-amber-900">
                Mandatory Contact Details Incomplete
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Both a verified <strong>Email Address</strong> and a <strong>10-digit Mobile Number</strong> are mandatory for all {user.role === 'provider' ? 'technician' : 'customer'} accounts.
                {!user.email && !user.phone
                  ? ' Both your email and mobile number are currently missing.'
                  : !user.email
                  ? ' Your email address is missing.'
                  : ' Your 10-digit mobile number is missing.'}
              </p>
              <button
                type="button"
                onClick={() => handleOpenEdit(!user.email ? 'email' : 'phone')}
                className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Complete Mandatory Details Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basic Details / Info Cards with Direct Edit Actions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Basic Profile Details</h3>
          <button
            onClick={() => handleOpenEdit()}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Update Details</span>
          </button>
        </div>

        <div className="space-y-3">
          {/* Full Name Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-200 p-4 flex items-center justify-between transition-colors shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Full Name</p>
                <p className="text-sm font-bold text-slate-900">{user.name}</p>
              </div>
            </div>
            <button
              onClick={() => handleOpenEdit('name')}
              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
            >
              Edit
            </button>
          </div>

          {/* Email Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-200 p-4 flex items-center justify-between transition-colors shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email Address / Gmail</p>
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">Required *</span>
                </div>
                <p className={cn("text-sm font-bold", user.email ? "text-slate-900" : "text-amber-600 font-extrabold")}>
                  {user.email || '⚠️ Mandatory — Email not added'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenEdit('email')}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors border",
                user.email
                  ? "text-blue-600 hover:bg-blue-50 border-blue-100"
                  : "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-xs"
              )}
            >
              {user.email ? 'Edit' : 'Add Email'}
            </button>
          </div>

          {/* Mobile Number Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-200 p-4 flex items-center justify-between transition-colors shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mobile Number</p>
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">Required *</span>
                </div>
                <p className={cn("text-sm font-bold", user.phone ? "text-slate-900" : "text-amber-600 font-extrabold")}>
                  {user.phone ? `+91 ${user.phone}` : '⚠️ Mandatory — Mobile not added'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenEdit('phone')}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors border flex items-center gap-1",
                user.phone
                  ? "text-blue-600 hover:bg-blue-50 border-blue-100"
                  : "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-xs"
              )}
            >
              {user.phone ? 'Edit' : <><Plus className="w-3 h-3" /> Add Phone</>}
            </button>
          </div>

          {/* Address Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-200 p-4 flex items-center justify-between transition-colors shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Delivery & Service Address</p>
                <p className="text-sm font-bold text-slate-900">{user.address || 'Sagara, Karnataka'}</p>
              </div>
            </div>
            <button
              onClick={() => handleOpenEdit('address')}
              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
            >
              Edit
            </button>
          </div>

          {/* Trade Specialization Card (Technicians only) */}
          {user.role === 'provider' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-200 p-4 flex items-center justify-between transition-colors shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Trade Specialization</p>
                  <p className={cn("text-sm font-bold", user.trade_category ? "text-slate-900" : "text-slate-400 italic")}>
                    {user.trade_category || 'General Home Services'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenEdit()}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🧾 Customer Digital Receipts (Sub-item under DB / PeopleData) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              My Receipts & Invoices
            </h3>
            <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {receipts.length}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">GST Invoice & 30-Day Warranty</span>
        </div>

        {loadingReceipts ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center text-xs text-slate-400">
            Loading your official receipts...
          </div>
        ) : receipts.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 text-center shadow-xs">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">No Service Receipts Yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Once a technician completes your work and payment is confirmed, your official itemized receipt, GST breakdown, and 30-Day Warranty Card will be permanently saved here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((rcp) => (
              <div
                key={rcp.id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-4 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-blue-600 font-mono">
                        {rcp.id}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        PAID ✓
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rcp.paidAt || rcp.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {rcp.serviceName}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400">Total Paid</span>
                    <p className="text-base font-black text-slate-900">
                      ₹{resolveBookingBilling(rcp).total}
                    </p>
                  </div>
                </div>

                {/* Items Repaired & Newly Added Materials */}
                <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1 mb-3">
                  {rcp.itemsRepaired && rcp.itemsRepaired.length > 0 && (
                    <div className="flex items-start gap-1">
                      <span className="font-bold text-slate-700 shrink-0">Repairs:</span>
                      <span className="truncate">{rcp.itemsRepaired.join(' • ')}</span>
                    </div>
                  )}
                  {rcp.newlyAddedMaterials && rcp.newlyAddedMaterials.length > 0 ? (
                    <div className="flex items-start gap-1 text-amber-800">
                      <span className="font-bold shrink-0">+ Materials Added:</span>
                      <span className="truncate">
                        {rcp.newlyAddedMaterials.map((m) => `${m.description} (₹${m.amount})`).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Standard service labor • No extra spare parts
                    </div>
                  )}
                  <div className="text-[11px] text-emerald-700 font-medium pt-0.5">
                    🛡️ 30-Day Free Rework Warranty Active (Expires: {rcp.warrantyValidUntil})
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Tech: <strong>{rcp.technicianName}</strong> • {rcp.paymentMethod}
                  </span>
                  <button
                    onClick={() => setSelectedReceipt(rcp)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    title="Download or Print this single receipt"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download / Print Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4 shadow-xs">
        {menuItems.map(({ icon: Icon, label, to }, i) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-4 hover:bg-slate-50 transition-colors',
              i > 0 && 'border-t border-slate-100'
            )}
          >
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-slate-800 text-left">{label}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      {/* Company & Support Information */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4 shadow-xs">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Company & Information</p>
        </div>
        {companyMenuItems.map(({ icon: Icon, label, to }, i) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-3.5 hover:bg-slate-50 transition-colors',
              i > 0 && 'border-t border-slate-100'
            )}
          >
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-slate-600" />
            </div>
            <span className="flex-1 text-xs font-semibold text-slate-700 text-left">{label}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      {/* KYC Banner for Technicians */}
      {user.role === 'provider' && user.kyc_status === 'not_submitted' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Complete Your KYC</p>
              <p className="text-xs text-amber-600 mt-0.5">Upload Aadhaar + face scan to start accepting jobs. Admin review takes 24-48 hours.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/kyc')}
            className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Start KYC Verification
          </button>
        </div>
      )}

      {/* Cache & Data Management */}
      <div className="space-y-3 mb-4">
        <button
          onClick={async () => {
            if (window.confirm('Clear all local application cache, offline storage, and reload latest version?')) {
              await clearAppCache({ reload: true });
            }
          }}
          className="flex items-center gap-3 w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-colors group shadow-xs cursor-pointer"
          title="Clear local application storage, service worker caches, and reload"
        >
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-800">Clear App Cache & Reload</p>
            <p className="text-[11px] text-slate-400">Flush offline data, service worker caches, and reload fresh</p>
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={async () => { await logout(); navigate('/'); }}
          className="flex items-center gap-3 w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl hover:bg-red-50 hover:border-red-200 transition-colors group shadow-xs cursor-pointer"
        >
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-sm font-semibold text-red-600">Sign Out</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Profile</h3>
                  <p className="text-xs text-slate-500">Update your photo, name, email & mobile</p>
                </div>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Profile updated successfully!
              </div>
            )}

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Photo / Avatar Section */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Profile Photo / Avatar
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-blue-500 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {renderAvatar(customPhotoUrl || editAvatar, editName || 'U')}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload from Device</span>
                    </button>
                    <p className="text-[11px] text-slate-500">Supports JPG, PNG, WebP (auto-optimized)</p>
                  </div>
                </div>

                {/* Preset Avatar Selector */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Or choose an avatar:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setEditAvatar(emoji);
                          setCustomPhotoUrl('');
                        }}
                        className={cn(
                          'w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer',
                          editAvatar === emoji && !customPhotoUrl
                            ? 'bg-blue-600 text-white scale-110 shadow-sm'
                            : 'bg-white hover:bg-slate-200 text-slate-800 border border-slate-200'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo URL option */}
                <div className="relative mt-3">
                  <Camera className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="Or paste image URL (https://...)"
                    value={customPhotoUrl.startsWith('data:') ? '' : customPhotoUrl}
                    onChange={(e) => {
                      setCustomPhotoUrl(e.target.value);
                      if (e.target.value) setEditAvatar(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Email Address / Gmail <span className="text-red-500">*</span>
                  </label>
                  {auth?.currentUser?.email && (
                    <button
                      type="button"
                      onClick={() => setEditEmail(auth.currentUser?.email || '')}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition cursor-pointer"
                      title="Auto-fill email from your verified Google account"
                    >
                      <span>⚡ Auto-sync Google</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Mail className={cn("absolute left-3 top-2.5 w-4 h-4", !editEmail.trim() ? "text-red-500" : "text-slate-400")} />
                  <input
                    type="email"
                    required
                    placeholder="Enter email address or Gmail"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={cn(
                      "w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2",
                      !editEmail.trim()
                        ? "border-red-400 bg-red-50/20 focus:ring-red-400 text-slate-900"
                        : "border-slate-200 focus:ring-blue-500"
                    )}
                  />
                </div>
                {!editEmail.trim() ? (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Email field is mandatory, without that no one can save it.
                  </p>
                ) : !/\S+@\S+\.\S+/.test(editEmail.trim()) ? (
                  <p className="text-[11px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Please enter a valid email format (e.g. user@gmail.com).
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Email configured • Auto-updated from Google login
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (10 digits) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    value={editPhone.replace(/^\+?91/, '').trim()}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mandatory for dispatch notifications, job tracking & SMS alerts
                </p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery & Service Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter delivery and service address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Trade for Technicians */}
              {user.role === 'provider' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trade Specialization
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <select
                      value={editTrade}
                      onChange={(e) => setEditTrade(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Specialization</option>
                      <option value="Plumbing & Sanitary">Plumbing & Sanitary</option>
                      <option value="Electrical & Wiring">Electrical & Wiring</option>
                      <option value="Deep Home Cleaning">Deep Home Cleaning</option>
                      <option value="AC & Appliance Service">AC & Appliance Service</option>
                      <option value="Carpentry & Furniture">Carpentry & Furniture</option>
                      <option value="Interior Painting">Interior Painting</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editName.trim() || !editEmail.trim() || !editPhone.trim()}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-md",
                    saving || !editName.trim() || !editEmail.trim() || !editPhone.trim()
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer"
                  )}
                  title={!editEmail.trim() ? "Email field is mandatory, without that no one can save it" : undefined}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <ItemizedInvoiceModal
          receipt={selectedReceipt}
          customerUser={user}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};


