import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Wrench, Zap, Droplets, AlertTriangle, Send, CheckCircle2,
  BookOpen, PlusCircle, ShieldAlert, Check, RefreshCw, Layers, Bot, User, MessageSquare
} from "lucide-react";
import {
  queryAiKnowledge,
  queryRagMicroservice,
  submitFieldResolution,
  getCachedLearnedSolutions,
  syncLearnedSolutionsFromFirestore,
  LearnedResolution,
  AiQueryResult
} from "@/lib/aiKnowledgeEngine";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessage {
  id: string;
  sender: "technician" | "techai";
  text: string;
  result?: AiQueryResult;
  timestamp: string;
}

export const TechnicianAiCopilot: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      sender: "techai",
      text: `👋 Hey ${user?.name ? user.name.split(' ')[0] : 'Partner'}! I am TechAI, your on-the-job technical field assistant.\n\nI can help you diagnose tricky field faults, check capacitor ratings, standard wiring diagrams, geyser heating elements, and Sagara spare parts costs.\n\nType your question below or tap any quick diagnostic shortcut!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [learnedCases, setLearnedCases] = useState<LearnedResolution[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLearnings, setShowLearnings] = useState(false);

  // Field resolution share form state
  const [shareCategory, setShareCategory] = useState("electrical");
  const [shareSymptom, setShareSymptom] = useState("");
  const [shareResolution, setShareResolution] = useState("");
  const [shareParts, setShareParts] = useState("");
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    syncLearnedSolutionsFromFirestore().then(setLearnedCases);
    const handler = () => {
      setLearnedCases(getCachedLearnedSolutions());
    };
    window.addEventListener("mud_ai_learning_updated", handler);
    return () => window.removeEventListener("mud_ai_learning_updated", handler);
  }, []);

  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "technician",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await queryRagMicroservice(
        text,
        {
          userId: user?.id,
          userName: user?.name,
          email: user?.email,
          phone: user?.phone,
          role: 'technician',
          tradeCategory: user?.trade_category
        },
        'technician'
      );
      const botMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: "techai",
        text: res.answer,
        result: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallback = queryAiKnowledge(text, "technician", {
        userId: user?.id,
        userName: user?.name,
        email: user?.email,
        phone: user?.phone,
        role: 'technician',
        tradeCategory: user?.trade_category
      });
      const botMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: "techai",
        text: fallback.answer,
        result: fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleShareResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareSymptom.trim() || !shareResolution.trim()) return;
    setShareLoading(true);

    try {
      await submitFieldResolution({
        category: shareCategory,
        query: shareSymptom,
        symptom: shareSymptom,
        resolution: shareResolution,
        partsUsed: shareParts,
        technicianName: user?.name || "Verified Technician",
        locality: "Sagara"
      });
      setShareSuccess(true);
      setLearnedCases(getCachedLearnedSolutions());
      setTimeout(() => {
        setShareSuccess(false);
        setShowShareModal(false);
        setShareSymptom("");
        setShareResolution("");
        setShareParts("");
      }, 1500);
    } catch (err) {
      alert("Failed to save resolution");
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-2xl border border-purple-500/30 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/40 rounded-2xl flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-purple-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                TechAI <span className="text-purple-400 font-medium">Assistant</span>
              </h2>
              <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full">
                FIELD CHATBOT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live SOPs, Diagnostics, Spare Cost Estimates & Safety Directives
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowLearnings(!showLearnings)}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3 py-2 rounded-xl transition border border-slate-700"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            {showLearnings ? "Hide SOPs" : `Learned SOPs (${learnedCases.length})`}
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl transition shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> Share Fix
          </button>
        </div>
      </div>

      {/* Optional Accordion: Verified On-Job Learnings */}
      {showLearnings && (
        <div className="mb-4 bg-slate-800/80 border border-purple-500/30 rounded-2xl p-4 space-y-3 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span>Verified On-Job Case Studies (Sagara Technicians)</span>
            <span className="text-slate-400 text-[10px]">{learnedCases.length} records</span>
          </div>
          {learnedCases.map((cs) => (
            <div key={cs.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-xs">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span className="font-bold text-purple-300">{cs.technicianName} ({cs.category})</span>
                <span>{cs.locality}</span>
              </div>
              <p className="font-semibold text-slate-200">Symptom: {cs.symptom}</p>
              <p className="text-emerald-400 mt-1 font-medium">Fix: {cs.resolution}</p>
              {cs.partsUsed && (
                <p className="text-slate-400 text-[10px] mt-1">Parts: {cs.partsUsed}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Troubleshooting Shortcut Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin">
        {[
          { label: "⚡ MCB Tripping SOP", q: "MCB keeps tripping continuously when load is connected" },
          { label: "🌀 Fan Capacitor Test", q: "Ceiling fan humming noise and rotating slowly" },
          { label: "💧 Airlock & Pressure", q: "Low water pressure in tap and shower pipeline airlock" },
          { label: "❄️ AC Gas & Compressor", q: "Air conditioner outdoor compressor warm air refrigerant check" },
          { label: "🔌 2-Way Switch Wiring", q: "Two way switch wiring diagram for staircase light" },
          { label: "🚿 Geyser Thermostat", q: "Water heater geyser not heating water thermostat test" }
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(btn.q)}
            className="shrink-0 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 px-3 py-1.5 rounded-xl text-xs transition text-left group"
          >
            <span className="text-[11px] font-bold text-purple-300 group-hover:text-purple-200">
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex-1 min-h-[380px] max-h-[460px] overflow-y-auto space-y-4 mb-4">
        {messages.map((m) => {
          const isAi = m.sender === "techai";

          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isAi ? "justify-start" : "justify-end"}`}
            >
              {isAi && (
                <div className="w-8 h-8 rounded-xl bg-purple-900/80 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-200">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="max-w-[85%] sm:max-w-[78%] space-y-2">
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isAi
                      ? "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-sm shadow-md"
                      : "bg-purple-600 text-white rounded-tr-sm shadow-md"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Safety callout if provided */}
                  {m.result?.safetyWarning && (
                    <div className="mt-3 bg-amber-950/70 border border-amber-500/50 rounded-xl p-2.5 flex items-start gap-2 text-amber-200 text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Safety Directive: </span>
                        {m.result.safetyWarning}
                      </div>
                    </div>
                  )}

                  {/* High Confidence Badge */}
                  {m.result?.confidence && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="text-purple-300 font-semibold">TechAI Verified SOP</span>
                      <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        Match {(m.result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {isAi && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>AI field advisory • Always verify component ratings & disconnect power mains</span>
                    </div>
                  )}
                </div>

                <div
                  className={`text-[10px] text-slate-500 px-1 ${
                    isAi ? "text-left" : "text-right"
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {!isAi && (
                <div className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center shrink-0 text-white">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 items-center text-xs text-purple-300 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-purple-900/80 border border-purple-500/40 flex items-center justify-center text-purple-200">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <span>TechAI is querying diagnostic protocols & field database...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="relative"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask TechAI anything (e.g. 'how to check geyser coil', 'split AC error E1', 'fan regulator wiring')..."
          className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl py-3.5 pl-4 pr-24 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Ask
        </button>
      </form>

      {/* TechAI Field Safety Notice */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-2.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-center">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong className="text-slate-300">TechAI Safety Notice:</strong> AI-provided technical advice and diagnostic specs may be inaccurate. Technicians must verify all ratings, follow standard SOPs, and isolate power mains before performing repairs.
        </span>
      </div>

      {/* Share Field Resolution Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" /> Share Field Fix with TechAI
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your real-world fix is stored in the RAG model and helps all technicians in Sagara.
            </p>

            {shareSuccess ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <p className="font-black text-sm text-emerald-300">Resolution Added to RAG Memory!</p>
                <p className="text-xs text-slate-400">All technicians and AI copilots will now cite this fix.</p>
              </div>
            ) : (
              <form onSubmit={handleShareResolution} className="space-y-3.5 mt-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Service Category</label>
                  <select
                    value={shareCategory}
                    onChange={(e) => setShareCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                  >
                    <option value="electrical">Electrical & Fan</option>
                    <option value="plumbing">Plumbing & Water</option>
                    <option value="ac_appliance">AC & Appliances</option>
                    <option value="cleaning">Cleaning & Descaling</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Customer Problem / Symptom</label>
                  <input
                    type="text"
                    required
                    value={shareSymptom}
                    onChange={(e) => setShareSymptom(e.target.value)}
                    placeholder="E.g. Inverter AC tripping 16A MCB after 5 minutes"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">How Did You Resolve It? (Root Cause & Solution)</label>
                  <textarea
                    required
                    rows={3}
                    value={shareResolution}
                    onChange={(e) => setShareResolution(e.target.value)}
                    placeholder="E.g. Found dual run capacitor leaked oil. Discharged and replaced with 45+5 µF Epcos capacitor. MCB trip resolved."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Spare Parts Used & Price (Optional)</label>
                  <input
                    type="text"
                    value={shareParts}
                    onChange={(e) => setShareParts(e.target.value)}
                    placeholder="E.g. Epcos 45+5 µF Capacitor (₹260)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 font-bold py-3 rounded-xl transition text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shareLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl transition shadow-md"
                  >
                    {shareLoading ? "Saving…" : "Submit & Train AI"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
