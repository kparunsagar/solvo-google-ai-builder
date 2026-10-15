import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, X, Send, Bot, User, ThumbsUp, ArrowRight,
  ShieldAlert, CheckCircle, Wrench, Zap, Droplets, RefreshCw,
  Mic, MicOff, Volume2, VolumeX, AlertCircle, PhoneCall, Square
} from "lucide-react";
import {
  queryAiKnowledge,
  queryRagMicroservice,
  syncLearnedSolutionsFromFirestore,
  voteLearnedSolution,
  AiQueryResult
} from "@/lib/aiKnowledgeEngine";
import {
  parseVoiceBookingIntent,
  parseVoiceAudioIntent,
  detectLanguageAuto,
  generateMultilingualConciergeResponse,
  generateLocalMultilingualAnswer
} from "@/lib/gemini";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { LocationState, locationService } from "@/services/microservices/location.service";

export type IndicLanguageCode = "en-IN" | "kn-IN" | "hi-IN";

interface LanguageOption {
  code: IndicLanguageCode;
  label: string;
  native: string;
}

const SUPPORTED_LANGS: LanguageOption[] = [
  { code: "en-IN", label: "English", native: "English" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" }
];

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  lang?: IndicLanguageCode;
  result?: AiQueryResult;
  matchedServiceId?: string;
  matchedServiceName?: string;
  matchedPrice?: number;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { icon: Droplets, label: "💧 Tap leaking / Pipe repair", query: "Kitchen tap is continuously leaking and pipe needs repair" },
  { icon: Zap, label: "⚡ Fan humming / MCB tripping", query: "Ceiling fan capacitor is weak and main MCB switch is tripping" },
  { icon: Wrench, label: "❄️ AC blowing warm air", query: "Split AC cooling is weak and blowing warm air" },
  { icon: Droplets, label: "🌀 RO purifier beeping", query: "RO drinking water purifier filter is clogged and beeping" },
  { icon: Wrench, label: "🛠️ ಮೋಟಾರ್ ಪಂಪ್ ನೀರು ಎತ್ತುತ್ತಿಲ್ಲ", query: "ಮೋಟಾರ್ ಪಂಪ್ ನೀರು ಎತ್ತುತ್ತಿಲ್ಲ, ರಿಪೇರಿ ಮಾಡಬೇಕು" },
  { icon: Sparkles, label: "🧼 Home deep cleaning", query: "Need complete bathroom descaling and home deep cleaning" }
];

export const CustomerAiModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialVoiceMode?: boolean;
  currentLocation?: LocationState | null;
}> = ({
  isOpen,
  onClose,
  initialVoiceMode = false,
  currentLocation
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamically resolve customer active location & city
  const verifiedLoc = currentLocation || locationService.getVerifiedLocation();
  const rawLocStr = `${verifiedLoc?.city || ''} ${verifiedLoc?.locality || ''}`.toLowerCase();
  const isBengaluru =
    rawLocStr.includes('bengaluru') ||
    rawLocStr.includes('bangalore') ||
    rawLocStr.includes('blr') ||
    rawLocStr.includes('marappa') ||
    rawLocStr.includes('indiranagar') ||
    rawLocStr.includes('koramangala') ||
    rawLocStr.includes('whitefield') ||
    rawLocStr.includes('jayanagar') ||
    rawLocStr.includes('hsr') ||
    rawLocStr.includes('mg road') ||
    (verifiedLoc?.postalCode && verifiedLoc.postalCode.startsWith('560'));

  const activeCity = isBengaluru ? 'Bengaluru' : (verifiedLoc?.city || 'Sagara');
  const activeLocality = verifiedLoc?.locality || (isBengaluru ? 'Marappa Garden, Bengaluru' : 'Gandhi Nagar, Sagara');

  const [input, setInput] = useState("");
  const [selectedLang, setSelectedLang] = useState<IndicLanguageCode>("en-IN");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [voiceSoundEnabled, setVoiceSoundEnabled] = useState(true);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);

  const rawName = user?.name?.trim();
  const firstName = rawName ? rawName.split(" ")[0].replace(/[@_0-9]/g, "") : "";
  const initialWelcomeText = firstName
    ? `Hello **${firstName}**! 👋 Welcome back to **SOLVO**.\n\nI am your **AI Concierge**. You can **speak or type** in English, ಕನ್ನಡ, or हिन्दी. I will diagnose the issue, provide transparent labor rates for **${activeCity}**, and help you book a verified technician immediately. What seems to be the problem?`
    : `Hello! 👋 Welcome to **SOLVO**.\n\nI am your **AI Concierge**. You can **speak or type** in English, ಕನ್ನಡ, or हिन्दी. I will diagnose your home repair issue, provide price estimates for **${activeCity}**, and connect you with a verified technician. What seems to be the problem?`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: initialWelcomeText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [thinking, setThinking] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>("");

  // Clean TTS Text: removes markdown symbols for natural speech synthesis
  // Reads complete diagnostic & pricing guidance without truncation.
  const cleanForSpeech = (text: string): string => {
    return text
      .replace(/[*#_`>~]/g, "")
      .replace(/⚠️|💡|💰|🛠️|👋|✨|₹/g, "")
      .replace(/\n+/g, ". ")
      .trim();
  };

  const speakText = useCallback((textToSpeak: string, lang: IndicLanguageCode = selectedLang, messageId?: string) => {
    if (!voiceSoundEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

    // Toggle stop if customer taps while currently reading this exact message
    if (messageId && speakingMsgId === messageId && isSpeaking) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utteranceText = cleanForSpeech(textToSpeak);
      const utterance = new SpeechSynthesisUtterance(utteranceText);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      if (typeof window !== "undefined" && window.speechSynthesis.getVoices) {
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find((v) => v.lang === lang || v.lang.startsWith(lang.split("-")[0]));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (messageId) setSpeakingMsgId(messageId);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("[AI Concierge] TTS notice:", e);
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    }
  }, [voiceSoundEnabled, selectedLang, isSpeaking, speakingMsgId]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  };

  const cleanupMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        if (typeof recognitionRef.current.stop === "function") {
          recognitionRef.current.stop();
        } else if (typeof recognitionRef.current.abort === "function") {
          recognitionRef.current.abort();
        }
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }

    cleanupMediaStream();
    setIsListening(false);
  }, [cleanupMediaStream]);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
      setSpeechNotice(null);
      setMicBlocked(false);
    } else {
      syncLearnedSolutionsFromFirestore().catch(() => {});
      if (initialVoiceMode) {
        if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: "microphone" as PermissionName }).then((perm) => {
            if (perm.state === "granted") {
              requestMicAndStartListening();
            }
          }).catch(() => {});
        }
      }
    }
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [isOpen, initialVoiceMode, stopListening]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    stopSpeaking();
    stopListening();

    // 1. Auto-detect user's language (Kannada, Hindi, or English)
    const autoLang = detectLanguageAuto(text, selectedLang);
    if (autoLang.code !== selectedLang) {
      setSelectedLang(autoLang.code);
    }

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text,
      lang: autoLang.code,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    transcriptRef.current = "";
    setThinking(true);

    try {
      const userCtx = {
        userId: user?.id,
        userName: user?.name,
        email: user?.email,
        phone: user?.phone,
        role: "customer" as const,
        location: verifiedLoc?.formattedAddress || activeLocality,
        city: activeCity,
        locality: activeLocality
      };

      // 2. Concurrently query Gemini Multilingual Concierge Engine and RAG Intelligence
      const [multilingualRes, ragRes] = await Promise.allSettled([
        generateMultilingualConciergeResponse(text, { city: activeCity, locality: activeLocality }, autoLang.code),
        queryRagMicroservice(text, userCtx, "customer")
      ]);

      let finalAnswer = "";
      let matchedResult: AiQueryResult | undefined;
      let matchedServiceId: string | undefined;
      let matchedServiceName: string | undefined;
      let matchedPrice: number | undefined;

      if (multilingualRes.status === "fulfilled" && multilingualRes.value.answer) {
        const m = multilingualRes.value;
        finalAnswer = m.answer;
        matchedServiceId = m.serviceId;
        matchedServiceName = m.serviceNameLocalized || m.serviceCategory;
        matchedPrice = m.estimatedLaborPriceINR;
        if (m.detectedLanguageCode && m.detectedLanguageCode !== selectedLang) {
          setSelectedLang(m.detectedLanguageCode);
        }
      }

      if (ragRes.status === "fulfilled") {
        matchedResult = ragRes.value;
        if (!finalAnswer) {
          finalAnswer = ragRes.value.answer;
        }
        if (!matchedServiceId && ragRes.value.suggestedAction?.payload?.serviceId) {
          matchedServiceId = ragRes.value.suggestedAction.payload.serviceId;
          matchedServiceName = ragRes.value.suggestedAction.label;
        }
      }

      if (!finalAnswer) {
        const localFallback = generateLocalMultilingualAnswer(text, { city: activeCity, locality: activeLocality }, autoLang.code, autoLang.name);
        finalAnswer = localFallback.answer;
        matchedServiceId = localFallback.serviceId;
        matchedServiceName = localFallback.serviceNameLocalized || localFallback.serviceCategory;
        matchedPrice = localFallback.estimatedLaborPriceINR;
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: finalAnswer,
        lang: autoLang.code,
        result: matchedResult,
        matchedServiceId,
        matchedServiceName,
        matchedPrice,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakText(finalAnswer, autoLang.code, aiMsg.id);
    } catch {
      const localFallback = generateLocalMultilingualAnswer(text, { city: activeCity, locality: activeLocality }, autoLang.code, autoLang.name);
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: localFallback.answer,
        lang: autoLang.code,
        matchedServiceId: localFallback.serviceId,
        matchedServiceName: localFallback.serviceNameLocalized,
        matchedPrice: localFallback.estimatedLaborPriceINR,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakText(localFallback.answer, autoLang.code, aiMsg.id);
    } finally {
      setThinking(false);
    }
  };

  const handleProcessAudioBlob = async (blob: Blob) => {
    setThinking(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const dataUrl = await base64Promise;

      const audioResult = await parseVoiceAudioIntent(dataUrl, selectedLang);
      if (audioResult && audioResult.transcript) {
        setInput(audioResult.transcript);
        transcriptRef.current = audioResult.transcript;
        await handleSend(audioResult.transcript);
        return;
      }
    } catch (err) {
      console.warn("[AI Concierge] Audio processing error, using language default:", err);
    } finally {
      setThinking(false);
    }

    const fallbackText = selectedLang === "kn-IN"
      ? "ಮನೆ ರಿಪೇರಿ ಮತ್ತು ಪ್ಲಂಬಿಂಗ್ / ಎಲೆಕ್ಟ್ರಿಕಲ್ ಸೇವೆ ಬೇಕು"
      : selectedLang === "hi-IN"
      ? "घर की मरम्मत और सर्विसिंग की आवश्यकता है"
      : "Home repair service diagnostic request";
    handleSend(fallbackText);
  };

  const startMediaRecorderFallback = useCallback((stream: MediaStream) => {
    try {
      audioChunksRef.current = [];
      const isTypeSupported = typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function";
      const mimeType = isTypeSupported
        ? MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : ""
        : "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsListening(true);
        setSpeechNotice(null);
        setMicBlocked(false);
      };

      mediaRecorder.onstop = () => {
        setIsListening(false);
        cleanupMediaStream();
        const chunks = audioChunksRef.current;
        if (chunks.length > 0) {
          const recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
          handleProcessAudioBlob(recordedBlob);
        }
      };

      mediaRecorder.start(250);
      setIsListening(true);

      // Auto-stop after 8 seconds of speech if user doesn't manually tap Done
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 8000);
    } catch (err: any) {
      console.warn("[AI Concierge] MediaRecorder failed:", err);
      setIsListening(false);
      cleanupMediaStream();
      setSpeechNotice("Voice recording unavailable. You can type or tap a quick suggestion below.");
    }
  }, [cleanupMediaStream, selectedLang]);

  const requestMicAndStartListening = async () => {
    stopSpeaking();
    setSpeechNotice(null);
    setMicBlocked(false);

    // 1. Hardware Microphone Access via navigator.mediaDevices.getUserMedia
    // This triggers the browser's native permission prompt across Chrome, Edge, Safari, iOS, and Android
    let stream: MediaStream | null = null;
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        mediaStreamRef.current = stream;
        setMicBlocked(false);
      } catch (err: any) {
        console.warn("[AI Concierge] getUserMedia permission denied or error:", err);
        cleanupMediaStream();
        setIsListening(false);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.name === "SecurityError") {
          setMicBlocked(true);
          setSpeechNotice("Microphone permission was denied. Please allow microphone access or type your issue.");
        } else {
          setSpeechNotice("Could not access microphone hardware. You can type or tap a quick suggestion below.");
        }
        return;
      }
    }

    // 2. Try Web Speech API (real-time stream)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }

        const recognition = new SpeechRecognition();
        recognition.lang = selectedLang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechNotice(null);
          setMicBlocked(false);
        };

        recognition.onresult = (event: any) => {
          let fullText = "";
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + " ";
          }
          const cleaned = fullText.trim();
          setInput(cleaned);
          transcriptRef.current = cleaned;
        };

        recognition.onerror = (event: any) => {
          console.warn("[AI Concierge] Speech recognition notice:", event.error);
          setIsListening(false);

          if (event.error === "no-speech") {
            setSpeechNotice("No speech detected. Tap the microphone and speak clearly.");
            cleanupMediaStream();
          } else if (event.error === "not-allowed" || event.error === "permission-denied") {
            // If SpeechRecognition failed despite getUserMedia (e.g. Brave blocks Google Speech API),
            // seamlessly use MediaRecorder with the active audio stream!
            if (stream && stream.active) {
              startMediaRecorderFallback(stream);
            } else {
              setMicBlocked(true);
              setSpeechNotice("Microphone permission was denied. Please allow microphone access or type your issue.");
            }
          } else if (event.error === "language-not-supported") {
            setSelectedLang("en-IN");
            setSpeechNotice("Switched to Indian English speech model. Tap microphone to speak.");
            cleanupMediaStream();
          } else if (event.error === "network") {
            if (stream && stream.active) {
              startMediaRecorderFallback(stream);
            } else {
              setSpeechNotice("Speech service network error. You can type or tap a suggestion below.");
            }
          } else {
            if (stream && stream.active) {
              startMediaRecorderFallback(stream);
            } else {
              setSpeechNotice(`Speech notice: ${event.error}. You can type or tap a suggestion below.`);
            }
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          cleanupMediaStream();
          const spoken = transcriptRef.current.trim();
          if (spoken.length > 2) {
            handleSend(spoken);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (e: any) {
        console.warn("[AI Concierge] SpeechRecognition start failed, switching to MediaRecorder:", e);
      }
    }

    // 3. Fallback to MediaRecorder on the active stream (Safari iOS, Firefox, Brave)
    if (stream && stream.active && typeof MediaRecorder !== "undefined") {
      startMediaRecorderFallback(stream);
    } else {
      setIsListening(false);
      cleanupMediaStream();
      setSpeechNotice("Voice recognition is not supported in this browser. You can type or tap any quick suggestion below.");
    }
  };

  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening();
    } else {
      requestMicAndStartListening();
    }
  };

  const handleVote = (msgId: string, caseId: string) => {
    voteLearnedSolution(caseId, true);
    setFeedbackGiven((prev) => ({ ...prev, [msgId]: true }));
  };

  const handleBookService = (serviceId: string) => {
    onClose();
    navigate(`/book/${serviceId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col h-[670px] max-h-[92vh] overflow-hidden">
        {/* ── Multimodal Header ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-blue-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-tight">AI Concierge</h3>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Voice & Chat
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Instant Diagnosis, Transparent Pricing & Direct Booking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle (Speech Synthesis Speaker) */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setVoiceSoundEnabled(!voiceSoundEnabled);
              }}
              className={`p-2 rounded-xl transition ${
                voiceSoundEnabled
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-black/20 text-white/50 hover:text-white"
              }`}
              title={voiceSoundEnabled ? "Mute Voice Audio (Speaker is ON)" : "Unmute Voice Audio (Speaker is OFF)"}
              aria-label="Toggle AI Voice Sound"
            >
              {voiceSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition"
              aria-label="Close AI Concierge"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Indic Language Switcher Strip ─────────────────────────────────── */}
        <div className="bg-slate-100/90 px-4 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
          <span className="text-slate-600 font-semibold flex items-center gap-1.5 text-[11px]">
            <Mic className="w-3.5 h-3.5 text-blue-600" /> Speech & Chat Language:
          </span>
          <div className="flex gap-1">
            {SUPPORTED_LANGS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setSelectedLang(lang.code);
                  if (isListening) stopListening();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedLang === lang.code
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {lang.native}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active Speaking / Listening Audio Indicator ───────────────────── */}
        {isListening && (
          <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between text-xs animate-pulse font-bold shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <span>Listening in {SUPPORTED_LANGS.find(l => l.code === selectedLang)?.native}… Speak your issue now!</span>
            </div>
            <button
              onClick={stopListening}
              className="bg-white text-red-600 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase hover:bg-red-50"
            >
              Done Speaking
            </button>
          </div>
        )}

        {isSpeaking && !isListening && (
          <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shadow-inner">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-300 animate-bounce" />
              <span>AI Concierge is speaking…</span>
            </div>
            <button
              onClick={stopSpeaking}
              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Square className="w-2.5 h-2.5 fill-current" /> Stop Audio
            </button>
          </div>
        )}

        {speechNotice && (
          <div
            data-testid="mic-permission-notice"
            className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs transition-all"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium leading-relaxed">{speechNotice}</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {micBlocked && (
                <button
                  type="button"
                  data-testid="allow-mic-btn"
                  onClick={requestMicAndStartListening}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Allow Microphone Prompt
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSpeechNotice(null);
                  setMicBlocked(false);
                }}
                className="text-amber-700 hover:text-amber-900 font-bold px-1.5 py-0.5 rounded text-sm hover:bg-amber-200/50 transition cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Quick 1-Tap Problem Suggestions ──────────────────────────────── */}
        <div className="p-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none">
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.query)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-slate-700 hover:text-blue-700 text-[11px] font-semibold px-3 py-1.5 rounded-full transition shadow-xs cursor-pointer"
            >
              <span>{qp.label}</span>
            </button>
          ))}
        </div>

        {/* ── Interactive Chat Message Stream ──────────────────────────────── */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                  msg.sender === "user" ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
                }`}
              >
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-tr-xs"
                    : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                }`}
              >
                <div className="whitespace-pre-line font-medium">{msg.text}</div>

                {/* 1-Click Direct Booking Action Card */}
                {msg.matchedServiceId && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {(() => {
                      const directRaw = (msg.matchedServiceName || "Recommended Service").trim();
                      const isIndic = /[\u0C80-\u0CFF\u0900-\u097F]/.test(directRaw);
                      const directClean = isIndic
                        ? directRaw
                        : directRaw.toLowerCase().startsWith("book ")
                          ? directRaw
                          : `Book ${directRaw}`;
                      return (
                        <button
                          onClick={() => handleBookService(msg.matchedServiceId!)}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-2.5 px-3 rounded-xl transition flex items-center justify-between gap-1.5 shadow-sm text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-emerald-200" />
                            <span>{directClean}</span>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Suggested Action from Knowledge Engine */}
                {!msg.matchedServiceId && msg.result?.suggestedAction && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {(() => {
                      const sugRaw = (msg.result.suggestedAction.label || "Service").trim();
                      const isIndic = /[\u0C80-\u0CFF\u0900-\u097F]/.test(sugRaw);
                      const sugClean = isIndic
                        ? sugRaw
                        : sugRaw.toLowerCase().startsWith("book ")
                          ? sugRaw
                          : `Book ${sugRaw} Now`;
                      return (
                        <button
                          onClick={() => {
                            onClose();
                            if (msg.result?.suggestedAction?.payload?.serviceId) {
                              navigate(`/book/${msg.result.suggestedAction.payload.serviceId}`);
                            } else {
                              navigate("/services");
                            }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-xs cursor-pointer"
                        >
                          <span>{sugClean}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* On-Job Learning Citation & Feedback */}
                {msg.result?.learnedCaseStudies && msg.result.learnedCaseStudies.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-purple-700 font-bold">
                      <Sparkles className="w-3 h-3 text-purple-600" /> Grounded in verified {activeCity} field repairs
                    </span>
                    {!feedbackGiven[msg.id] ? (
                      <button
                        onClick={() => handleVote(msg.id, msg.result!.learnedCaseStudies[0].id)}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        <ThumbsUp className="w-3 h-3" /> Helpful
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Thanks!
                      </span>
                    )}
                  </div>
                )}

                {/* Timestamp & Re-read Audio Button */}
                <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400">
                  {msg.sender === "ai" && (
                    <button
                      onClick={() => {
                        if (isSpeaking && speakingMsgId === msg.id) {
                          stopSpeaking();
                        } else {
                          speakText(msg.text, msg.lang || selectedLang, msg.id);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 transition cursor-pointer font-medium ${
                        isSpeaking && speakingMsgId === msg.id
                          ? "text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                          : "text-slate-400 hover:text-blue-600"
                      }`}
                      title={isSpeaking && speakingMsgId === msg.id ? "Stop reading aloud" : "Read this response aloud"}
                    >
                      {isSpeaking && speakingMsgId === msg.id ? (
                        <>
                          <Square className="w-3 h-3 fill-rose-600 text-rose-600" />
                          <span>Stop reading</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>Read aloud</span>
                        </>
                      )}
                    </button>
                  )}
                  <span className="ml-auto opacity-70">{msg.timestamp}</span>
                </div>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-slate-500 text-xs pl-2">
              <Bot className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="italic">AI Concierge is analyzing your request and checking {activeCity} repair catalog…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Unified Input Bar (Mic + Text) ─────────────────────────────────── */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleMicrophoneClick}
              className={`p-3 rounded-2xl transition shadow-md flex items-center justify-center shrink-0 cursor-pointer ${
                isListening
                  ? "bg-red-500 text-white animate-pulse ring-4 ring-red-200"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              }`}
              title={isListening ? "Listening... Tap to stop" : "Tap to speak in English, Kannada, or Hindi"}
              aria-label="Microphone Speech Input"
            >
              {isListening ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? "Listening to your voice..."
                  : "Type or speak in English, ಕನ್ನಡ, हिन्दी..."
              }
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-2xl transition shadow-md shrink-0 cursor-pointer"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 mt-2 text-center">
            <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
            <span>AI diagnostic advice & price estimates may vary upon physical technician inspection.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
