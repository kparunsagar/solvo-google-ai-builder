import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  FileCheck,
  ScanFace
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeFaceBiometrics, BiometricAnalysisResult } from '@/lib/biometricAi';
import { compressPhotoLowMemory } from '@/utils/lowMemoryPhoto';

export const KycPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState<'info' | 'aadhaar' | 'camera_ai' | 'review' | 'success'>('info');

  // Form State
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [tradeCategory, setTradeCategory] = useState('Plumbing & Sanitary');
  const [experienceYears, setExperienceYears] = useState('3');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Photos & AI Biometrics
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(null);
  const [faceAiPhoto, setFaceAiPhoto] = useState<string | null>(null);
  const [faceAnalysis, setFaceAnalysis] = useState<BiometricAnalysisResult | null>(null);
  const [analyzingFace, setAnalyzingFace] = useState(false);

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stop camera on unmount or step change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Direct camera access not supported. Please use the Device Camera button below.');
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('[Camera] getUserMedia failed:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or use the file camera capture below.'
          : err.message || 'Unable to open camera.'
      );
      setCameraActive(false);
    }
  };

  // Helper: Low-memory progressive compression preventing mobile out-of-memory crashes
  const compressImage = (source: File | string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return compressPhotoLowMemory(source, { maxWidth, quality });
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress face photo to prevent Firestore size limit errors
    const compressed = await compressImage(canvas.toDataURL('image/jpeg', 0.8), 800, 0.7);
    setFaceAiPhoto(compressed);
    stopCamera();

    // Trigger AI Biometric analysis
    setAnalyzingFace(true);
    try {
      const result = await analyzeFaceBiometrics(canvas);
      setFaceAnalysis(result);
    } catch {
      setFaceAnalysis(null);
    } finally {
      setAnalyzingFace(false);
    }
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalyzingFace(true);
      compressImage(file, 800, 0.7).then(async (compressed) => {
        setFaceAiPhoto(compressed);
        stopCamera();

        try {
          const result = await analyzeFaceBiometrics(compressed);
          setFaceAnalysis(result);
        } catch {
          setFaceAnalysis(null);
        } finally {
          setAnalyzingFace(false);
        }
      });
    }
  };

  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, 800, 0.7).then((compressed) => {
        setAadhaarPhoto(compressed);
      });
    }
  };

  const handleSubmitKyc = async () => {
    if (aadhaarNumber.replace(/\D/g, '').length !== 12) {
      alert('Aadhaar number must be exactly 12 numeric digits.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitKyc({
        name: fullName || user?.name || 'Technician Candidate',
        phone: phone || user?.phone || '',
        email: user?.email || '',
        trade_category: tradeCategory,
        experience_years: Number(experienceYears) || 3,
        locality: 'Sagara, Karnataka',
        aadhaar_number: aadhaarNumber.replace(/\D/g, ''),
        aadhaar_photo_url: aadhaarPhoto || '',
        face_ai_photo_url: faceAiPhoto || ''
      });
      updateUser({ kyc_status: 'pending' });
      setStep('success');
    } catch (err: any) {
      alert(err.message || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Navigation */}
        <button
          onClick={() => {
            stopCamera();
            navigate('/technician');
          }}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Technician Dashboard
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="w-6 h-6 text-blue-200" />
              </div>
              <span className="text-xs uppercase font-bold tracking-widest text-blue-200">
                Official Verification Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Technician Identity Verification</h1>
            <p className="text-sm text-blue-100 mt-1">
              Verify your professional credentials to receive customer service bookings in Sagara.
            </p>

            {/* Stepper Bar */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/20 text-xs">
              {[
                { id: 'info', label: '1. Profile' },
                { id: 'aadhaar', label: '2. Aadhaar' },
                { id: 'camera_ai', label: '3. Photo Match' },
                { id: 'review', label: '4. Submit' },
              ].map((s) => (
                <div
                  key={s.id}
                  className={`font-semibold transition-colors ${
                    step === s.id ? 'text-white underline underline-offset-4' : 'text-blue-200/70'
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Info */}
          {step === 'info' && (
            <div className="p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Step 1: Your Professional Profile</h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Full Legal Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full legal name"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Primary Trade Skill</label>
                  <select
                    value={tradeCategory}
                    onChange={(e) => setTradeCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Plumbing & Sanitary">Plumbing & Sanitary</option>
                    <option value="Electrical & Wiring">Electrical & Wiring</option>
                    <option value="AC & Appliance Service">AC & Appliance Service</option>
                    <option value="Deep Home Cleaning">Deep Home Cleaning</option>
                    <option value="Carpentry & Furniture">Carpentry & Furniture</option>
                    <option value="Interior Painting">Interior Painting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mobile Contact</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setStep('aadhaar')}
                disabled={!fullName || !phone}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
              >
                Proceed to Aadhaar Upload <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Aadhaar */}
          {step === 'aadhaar' && (
            <div className="p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Step 2: Aadhaar Card Verification</h2>
              <p className="text-xs text-slate-500">
                Aadhaar identity is verified by Sagara administration in accordance with government regulations.
              </p>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    12-Digit UIDAI Aadhaar Number
                  </label>
                  <span className={`text-[11px] font-bold ${
                    aadhaarNumber.length === 12 
                      ? 'text-emerald-600' 
                      : 'text-amber-600'
                  }`}>
                    {aadhaarNumber.length === 12 
                      ? '✓ Valid (12 / 12 digits)' 
                      : `${aadhaarNumber.length} / 12 digits required`}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{12}"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Enter 12 numeric digits (e.g. 543289012345)"
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:outline-none transition-all ${
                    aadhaarNumber.length === 12 
                      ? 'border-emerald-400 bg-emerald-50/20 focus:ring-emerald-500 text-slate-900 font-bold' 
                      : 'border-slate-200 focus:ring-blue-600'
                  }`}
                />
                {aadhaarNumber.length > 0 && aadhaarNumber.length < 12 && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Aadhaar must be exactly 12 digits. {12 - aadhaarNumber.length} more digits needed.
                  </p>
                )}
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors">
                {aadhaarPhoto ? (
                  <div className="space-y-3">
                    <img
                      src={aadhaarPhoto}
                      alt="Aadhaar document"
                      className="max-h-48 mx-auto rounded-xl border border-slate-200 shadow-sm"
                    />
                    <button
                      onClick={() => setAadhaarPhoto(null)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove & re-upload
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Upload Aadhaar Front Photo</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG, or PDF (Auto-compressed for verification)</p>
                    <label className="inline-block mt-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition">
                      Choose Document
                      <input type="file" accept="image/*" onChange={handleAadhaarUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="px-5 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('camera_ai')}
                  disabled={!aadhaarPhoto || aadhaarNumber.length !== 12}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition"
                >
                  Proceed to Live Photo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Camera AI Face (Fixed with permanent video tag & device fallback) */}
          {step === 'camera_ai' && (
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 3: Live Facial Biometric Capture</h2>
                  <p className="text-xs text-slate-500">
                    Capture a clear front-facing selfie to match against your identity document.
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" /> Identity Match
                </span>
              </div>

              {/* Viewport: Video element is permanently rendered to prevent null ref */}
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${cameraActive && !faceAiPhoto ? 'block' : 'hidden'}`}
                />

                {faceAiPhoto && (
                  <img src={faceAiPhoto} alt="Captured face" className="w-full h-full object-cover" />
                )}

                {!cameraActive && !faceAiPhoto && (
                  <div className="text-center p-6 text-white">
                    <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Camera is Ready</p>
                    <p className="text-xs text-slate-400 mt-1">Tap below to open webcam or device camera</p>
                  </div>
                )}

                {/* Facial Guide Oval */}
                {cameraActive && !faceAiPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-44 h-56 border-2 border-dashed border-emerald-400 rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
                        Position Face Here
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {cameraError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* AI Biometric Analysis Card */}
              {faceAiPhoto && (
                <div className="mt-3">
                  {analyzingFace && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3 text-indigo-900 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                      <span>AI Vision Engine is analyzing face clarity, ambient lighting & focus...</span>
                    </div>
                  )}

                  {!analyzingFace && faceAnalysis && (
                    <div className={`border rounded-2xl p-4 text-xs ${
                      faceAnalysis.passed
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                        : 'bg-red-50/90 border-red-300 text-red-950'
                    }`}>
                      <div className="flex items-start gap-3">
                        {faceAnalysis.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm">
                              {faceAnalysis.passed ? '✅ Face Biometrics Verified' : '⚠️ Quality Issue: Recapture Recommended'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              faceAnalysis.passed ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                            }`}>
                              {faceAnalysis.score}% AI Score
                            </span>
                          </div>

                          {!faceAnalysis.passed && (
                            <p className="font-bold text-red-900 mt-1.5 leading-relaxed">
                              {faceAnalysis.reason}
                            </p>
                          )}

                          <p className={`mt-1 text-[11px] ${faceAnalysis.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                            {faceAnalysis.passed
                              ? 'Face is centered with optimal lighting and focus. Ready for administrative review.'
                              : 'Please ensure your face is directly in front of the camera with good lighting, then tap "Recapture Face Scan" below.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Camera Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {!faceAiPhoto ? (
                  <>
                    {!cameraActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-sm"
                      >
                        <Camera className="w-4 h-4" /> Open Web Camera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={captureFace}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-sm"
                      >
                        <Camera className="w-4 h-4" /> Capture Photo Now
                      </button>
                    )}

                    {/* Native device camera fallback */}
                    <label className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-sm cursor-pointer text-center">
                      <Upload className="w-4 h-4" /> Device Selfie Camera
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleSelfieUpload}
                        className="hidden"
                      />
                    </label>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFaceAiPhoto(null);
                      setFaceAnalysis(null);
                      startCamera();
                    }}
                    className={`col-span-2 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-sm text-white ${
                      faceAnalysis && !faceAnalysis.passed
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" /> Recapture Face Scan (Camera)
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStep('aadhaar');
                  }}
                  className="px-5 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStep('review');
                  }}
                  disabled={!faceAiPhoto}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition text-sm"
                >
                  Review Application <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 'review' && (
            <div className="p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Step 4: Confirm Details</h2>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Technician Name:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Skill Category:</span>
                  <span className="font-bold text-blue-600">{tradeCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Experience:</span>
                  <span className="font-bold text-slate-900">{experienceYears} Years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aadhaar Card (12-Digit):</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    ✓ {aadhaarNumber.slice(0, 4)} {aadhaarNumber.slice(4, 8)} {aadhaarNumber.slice(8, 12)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Face Verification:</span>
                  <span className="font-bold text-emerald-600">✓ Photo Captured</span>
                </div>
              </div>

              <button
                onClick={handleSubmitKyc}
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 text-base shadow-lg transition"
              >
                {submitting ? 'Submitting…' : 'Submit Verification for Approval'}
              </button>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <div className="p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Application Submitted</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your verification documents have been received by the Sagara administration desk for approval.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 text-left space-y-1">
                <p className="font-bold">Next steps:</p>
                <p>• Admin reviews your documents and credentials.</p>
                <p>• You will be notified once approved.</p>
                <p>• Once approved, you can start accepting customer service requests.</p>
              </div>
              <button
                onClick={() => navigate('/technician')}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition shadow"
              >
                Return to Technician Workbench
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
