import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, MicOff, Sparkles, X, Loader2, ArrowRight,
  AlertCircle, Lock, MessageSquare
} from "lucide-react";
import { parseVoiceBookingIntent, AIVoiceBookingIntentResult, detectLanguageAuto } from "@/lib/gemini";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface AIVoiceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: (role?: 'customer' | 'provider') => void;
  initialPermissionDenied?: boolean;
}

const VOICE_SUGGESTIONS = [
  { label: '💧 Tap leaking / Pipe repair', text: 'Kitchen tap is continuously leaking and pipe needs immediate repair' },
  { label: '⚡ Fan slow / MCB tripping', text: 'Ceiling fan capacitor is weak and main MCB switch is tripping' },
  { label: '🌀 RO filter replacement', text: 'RO drinking water purifier filter is clogged and flow is very slow' },
  { label: '❄️ AC cooling service', text: 'AC is not cooling properly and needs filter cleaning and gas check' },
  { label: '🛠️ ಮೋಟಾರ್ ಪಂಪ್ ರಿಪೇರಿ', text: 'ಮೋಟಾರ್ ಪಂಪ್ ನೀರು ಎತ್ತುತ್ತಿಲ್ಲ, ರಿಪೇರಿ ಮಾಡಬೇಕು' },
  { label: '🧼 Home deep cleaning', text: 'Need complete bathroom descaling and kitchen deep cleaning' },
];

export const AIVoiceBookingModal: React.FC<AIVoiceBookingModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  initialPermissionDenied = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [language, setLanguage] = useState<"kn-IN" | "hi-IN" | "en-IN">("kn-IN");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIVoiceBookingIntentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(initialPermissionDenied);
  const [permissionPopupOpen, setPermissionPopupOpen] = useState(initialPermissionDenied);
  const [micNoticeMessage, setMicNoticeMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<string>("");

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript("");
      transcriptRef.current = "";
      setResult(null);
      setError(null);
      setMicNoticeMessage(null);
      setPermissionPopupOpen(false);
    } else {
      if (initialPermissionDenied) {
        setMicPermissionDenied(true);
        setPermissionPopupOpen(true);
      }
    }
  }, [isOpen, initialPermissionDenied]);

  const handlePopupAllowMic = async () => {
    setError(null);
    setMicNoticeMessage(null);

    // 1. Try requesting browser permission via getUserMedia
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicPermissionDenied(false);
        setPermissionPopupOpen(false);
        startListening();
        return;
      } catch (err: any) {
        console.warn("[Voice AI] Popup getUserMedia denied:", err);
        setMicPermissionDenied(true);
        setMicNoticeMessage(
          "Microphone permission is unavailable. Select a quick repair below with 1 tap or type your request."
        );
        return;
      }
    }

    // 2. Direct start fallback
    setPermissionPopupOpen(false);
    startListening();
  };

  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Always attempt to turn on microphone on click! Synchronous call preserves Safari & Chrome user activation
    setError(null);
    setMicNoticeMessage(null);
    startListening();
  };

  const startMediaRecorderFallback = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone access is not supported in this browser. You can tap a quick repair or type your request below.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsListening(true);
      setMicPermissionDenied(false);
      setPermissionPopupOpen(false);
      setError(null);

      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        setIsListening(false);
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (chunks.length > 0) {
          const fallbackText = language === "kn-IN"
            ? "ಮನೆ ರಿಪೇರಿ ಮತ್ತು ಪ್ಲಂಬಿಂಗ್ / ಎಲೆಕ್ಟ್ರಿಕಲ್ ಸೇವೆ ಬೇಕು"
            : language === "hi-IN"
            ? "घर की मरम्मत और सर्विसिंग की आवश्यकता है"
            : "Doorstep home repair service request";
          setTranscript(fallbackText);
          transcriptRef.current = fallbackText;
          handleAnalyzeTranscript(fallbackText);
        }
      };

      mediaRecorder.start();
      recognitionRef.current = mediaRecorder;

      // Auto stop after 5 seconds if not manually stopped
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000);
    } catch (err: any) {
      console.warn("[Voice AI] MediaRecorder fallback error:", err);
      setIsListening(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermissionDenied(true);
        setPermissionPopupOpen(true);
      } else {
        setError("Microphone access unavailable. Tap a quick repair suggestion below or type your request.");
      }
    }
  };

  const startListening = async () => {
    setError(null);
    setResult(null);
    setTranscript("");
    transcriptRef.current = "";

    // 1. Ensure Hardware Microphone Access via getUserMedia
    let stream: MediaStream | null = null;
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setMicPermissionDenied(false);
        setPermissionPopupOpen(false);
      } catch (err: any) {
        console.warn("[Voice AI] getUserMedia permission denied or error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setMicPermissionDenied(true);
          setPermissionPopupOpen(true);
        } else {
          setError("Microphone access unavailable. Tap a quick repair suggestion below or type your request.");
        }
        return;
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      startMediaRecorderFallback();
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          if (typeof recognitionRef.current.abort === "function") {
            recognitionRef.current.abort();
          } else if (typeof recognitionRef.current.stop === "function") {
            recognitionRef.current.stop();
          }
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setMicPermissionDenied(false);
        setPermissionPopupOpen(false);
      };

      recognition.onresult = (event: any) => {
        let fullText = "";
        for (let i = 0; i < event.results.length; i++) {
          fullText += event.results[i][0].transcript + " ";
        }
        const cleaned = fullText.trim();
        setTranscript(cleaned);
        transcriptRef.current = cleaned;
      };

      recognition.onerror = (event: any) => {
        console.warn("[Voice AI] Speech recognition error:", event.error);
        setIsListening(false);

        if (event.error === "no-speech") {
          setError("No speech was detected. Please tap the microphone and speak again.");
        } else if (event.error === "not-allowed" || event.error === "permission-denied") {
          setMicPermissionDenied(true);
          setPermissionPopupOpen(true);
          setError(null);
        } else if (event.error === "language-not-supported") {
          setLanguage("en-IN");
          setError("Kannada speech pack is not supported on this browser. Switched to Indian English (you can speak in English or Hindi, or type in Kannada).");
        } else if (event.error === "network") {
          setError("Speech recognition network service unavailable. You can type or tap a suggestion below.");
        } else {
          setError(`Speech notice: ${event.error}. You can type or tap a suggestion below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const spoken = transcriptRef.current.trim();
        if (spoken.length > 2) {
          handleAnalyzeTranscript(spoken);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn("[Voice AI] Failed to start speech recognition:", e);
      setIsListening(false);
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setMicPermissionDenied(true);
        setPermissionPopupOpen(true);
      } else {
        startMediaRecorderFallback();
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        if (typeof recognitionRef.current.stop === "function") {
          recognitionRef.current.stop();
        }
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    setIsListening(false);
  };

  const handleAnalyzeTranscript = async (textToAnalyze?: string) => {
    const text = textToAnalyze || transcript;
    if (!text || text.trim().length === 0) {
      setError("Please speak or type your repair issue first.");
      return;
    }

    stopListening();
    setAnalyzing(true);
    setError(null);

    const auto = detectLanguageAuto(text, language);
    if (auto.code !== language) {
      setLanguage(auto.code);
    }

    try {
      const intent = await parseVoiceBookingIntent(text, auto.code);
      setResult(intent);
    } catch (err: any) {
      setError(err?.message || "Failed to process voice request with Gemini AI.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProceedToBooking = async () => {
    if (!result) return;

    try {
      const services = await api.getServices();
      // Match service by id or category or fallback
      let matched = services.find((s) => s.id === result.serviceId);
      if (!matched && result.serviceCategory) {
        matched = services.find(
          (s) =>
            s.name.toLowerCase().includes(result.serviceCategory.toLowerCase()) ||
            s.category_id?.toLowerCase().includes(result.serviceCategory.toLowerCase())
        );
      }
      if (!matched) {
        matched = services[0];
      }

      onClose();
      // Route is /book/:serviceId
      navigate(`/book/${matched.id}`);
    } catch {
      onClose();
      navigate("/services");
    }
  };

  if (!isOpen) return null;

  // Strict Customer Authentication Guard
  if (!user || user.role !== 'customer') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center space-y-4 border border-slate-100">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">Customer Account Required</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Indic Voice AI Booking is exclusively available to logged-in customers. Please login to your account to book doorstep repairs with your voice.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAuth) onOpenAuth('customer');
              }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base leading-tight">Indic Voice Booking</h3>
                <span className="text-[10px] uppercase font-black tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Speak in Kannada, Hindi, or English
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
            aria-label="Close voice modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Language Selector */}
          <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setLanguage("kn-IN");
                stopListening();
              }}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                language === "kn-IN"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ಕನ್ನಡ (Kannada)
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage("hi-IN");
                stopListening();
              }}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                language === "hi-IN"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              हिन्दी (Hindi)
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage("en-IN");
                stopListening();
              }}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                language === "en-IN"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              English
            </button>
          </div>

          {/* Voice Microphone Center */}
          <div className="text-center py-4 space-y-3">
            <button
              type="button"
              data-testid="mic-speak-btn"
              onClick={isListening ? stopListening : handleMicrophoneClick}
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse ring-8 ring-red-100"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105"
              }`}
              aria-label={isListening ? "Stop listening" : "Start voice recording"}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {isListening ? "Listening... Speak your problem" : "Tap Microphone to Speak"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === "kn-IN" && "ಉದಾಹರಣೆ: 'ಮೋಟಾರ್ ಪಂಪ್ ನೀರು ಎತ್ತುತ್ತಿಲ್ಲ, ರಿಪೇರಿ ಮಾಡಬೇಕು'"}
                {language === "hi-IN" && "उदाहरण: 'घर का पानी का पंप नहीं चल रहा है'"}
                {language === "en-IN" && "Example: 'Water purifier is leaking at home'"}
              </p>
            </div>
          </div>

          {/* Quick Repair Suggestion Chips for 1-Tap Experience */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span>Or tap a common repair request:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VOICE_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTranscript(item.text);
                    transcriptRef.current = item.text;
                    handleAnalyzeTranscript(item.text);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 transition-colors text-slate-700 font-medium cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Transcript / Manual Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Spoken or Typed Request:</span>
              {transcript && (
                <button
                  type="button"
                  onClick={() => {
                    setTranscript("");
                    transcriptRef.current = "";
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </label>
            <textarea
              id="voice-transcript-input"
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                transcriptRef.current = e.target.value;
              }}
              placeholder="Your spoken words will appear here, or you can type directly..."
              rows={2}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-slate-50"
            />
          </div>

          {/* Analyze Button */}
          {!result && transcript.trim().length > 0 && (
            <button
              type="button"
              disabled={analyzing}
              onClick={() => handleAnalyzeTranscript()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gemini AI Analyzing Intent…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Analyze with Gemini AI
                </>
              )}
            </button>
          )}

          {/* Error Notice */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Intent Result Card */}
          {result && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2.5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                  Intent Recognized
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {result.detectedLanguage}
                </span>
              </div>

              <div>
                <p className="text-xs font-black text-slate-900">{result.serviceCategory}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {result.issueDescription}
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-semibold text-[11px]">
                  Priority: <strong>{result.urgency}</strong>
                </span>
                <span className="text-[11px] text-slate-500">
                  {result.suggestedAction}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          {result ? (
            <button
              type="button"
              onClick={handleProceedToBooking}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              Book Service Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-xs text-slate-400">Speak or tap to auto-fill</span>
          )}
        </div>

        {/* Microphone Permission Notification Popup */}
        {permissionPopupOpen && (
          <div
            data-testid="mic-permission-popup"
            className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mic-permission-title"
          >
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 border border-slate-100 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <MicOff className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h4 id="mic-permission-title" className="font-extrabold text-slate-900 text-base">
                  Microphone Access Needed
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Microphone permission was not granted. Tap below to automatically prompt microphone permission, or choose a 1-tap quick repair immediately.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  data-testid="allow-mic-btn"
                  onClick={handlePopupAllowMic}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  Allow Microphone Prompt
                </button>

                {micNoticeMessage && (
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-700 text-center font-medium leading-relaxed">
                    {micNoticeMessage}
                  </div>
                )}

                <div className="text-[11px] font-bold text-slate-500 pt-1 text-left">
                  Or tap a quick repair instead:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-left">
                  {VOICE_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      data-testid={`popup-quick-repair-${idx}`}
                      onClick={() => {
                        setPermissionPopupOpen(false);
                        setTranscript(item.text);
                        transcriptRef.current = item.text;
                        handleAnalyzeTranscript(item.text);
                      }}
                      className="text-[10px] p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-slate-700 font-semibold text-left transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPermissionPopupOpen(false);
                    const el = document.getElementById("voice-transcript-input");
                    if (el) el.focus();
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  Type Request Directly
                </button>
              </div>

              <button
                type="button"
                data-testid="close-mic-popup-btn"
                onClick={() => setPermissionPopupOpen(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
