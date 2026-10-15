import React, { useState, useRef } from "react";
import {
  Sparkles, Camera, Upload, AlertTriangle, CheckCircle,
  Clock, ShieldCheck, Wrench, X, Loader2, ArrowRight
} from "lucide-react";
import { diagnoseApplianceImage, AIVisualDiagnosticResult } from "@/lib/gemini";
import { formatCurrency } from "@/lib/utils";
import { compressPhotoLowMemory } from "@/utils/lowMemoryPhoto";

interface AIVisualDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName?: string;
  onApplyDiagnostic: (result: AIVisualDiagnosticResult, photoDataUrl: string) => void;
}

export const AIVisualDiagnosticModal: React.FC<AIVisualDiagnosticModalProps> = ({
  isOpen,
  onClose,
  serviceName,
  onApplyDiagnostic
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIVisualDiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalyzing(true);
    try {
      // Low-memory downsampling prevents mobile tab crash on 48MP photos
      const dataUrl = await compressPhotoLowMemory(file, { maxWidth: 800, maxHeight: 1060, quality: 0.75 });
      if (!dataUrl) throw new Error("Could not process photo buffer");
      setPhotoPreview(dataUrl);
      runGeminiDiagnostic(dataUrl, file.type || "image/jpeg");
    } catch (err: any) {
      setAnalyzing(false);
      setError("Photo was too large for device memory. Please try capturing again with good lighting.");
    } finally {
      e.target.value = "";
    }
  };

  const runGeminiDiagnostic = async (dataUrl: string, mimeType: string) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const diagnostic = await diagnoseApplianceImage(dataUrl, mimeType, serviceName);
      setResult(diagnostic);
    } catch (err: any) {
      setError(err?.message || "Diagnostic failed. Please try another photo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (result && photoPreview) {
      onApplyDiagnostic(result, photoPreview);
      onClose();
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-red-200">CRITICAL HAZARD</span>;
      case "HIGH":
        return <span className="bg-orange-100 text-orange-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-orange-200">HIGH PRIORITY</span>;
      case "MEDIUM":
        return <span className="bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-200">MODERATE ISSUE</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200">MINOR WEAR</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base leading-tight">AI Visual Diagnostic</h3>
                <span className="text-[10px] uppercase font-black tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                  Google Gemini 1.5
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Snap or upload a photo of the damaged appliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Photo Upload Area */}
          {!photoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 rounded-3xl p-8 text-center cursor-pointer transition-all hover:bg-blue-50/80 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                <Camera className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                Tap to Take Photo or Upload Image
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Gemini multimodal AI will inspect the photo to identify faults and calculate fixed parts & labor pricing.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
                <Upload className="w-3.5 h-3.5" /> Select from Gallery or Camera
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
              <img
                src={photoPreview}
                alt="Appliance Preview"
                className="w-full h-48 object-cover opacity-90"
              />
              <button
                onClick={() => {
                  setPhotoPreview(null);
                  setResult(null);
                }}
                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md transition-all cursor-pointer"
              >
                <X className="w-3 h-3" /> Retake Photo
              </button>
              <div className="absolute bottom-2 left-2 bg-slate-900/70 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3 h-3 text-amber-300" /> Inspected by Gemini 1.5 Flash
              </div>
            </div>
          )}

          {/* Analyzing Spinner */}
          {analyzing && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div>
                <p className="font-black text-slate-800 text-sm">Gemini AI Multimodal Inspection in Progress...</p>
                <p className="text-xs text-slate-500 mt-1">
                  Analyzing visual texture, joint seals, thermal discoloration, and electrical terminals.
                </p>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnostic Result Card */}
          {result && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identified Equipment</span>
                  {getSeverityBadge(result.severity)}
                </div>
                <h4 className="font-black text-slate-900 text-base">{result.applianceType}</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3">
                  <span className="font-bold text-slate-900">Detected Defect: </span>
                  {result.detectedFault}
                </p>

                {/* Safety Warning */}
                {result.safetyWarning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Safety Precaution: </span>
                      {result.safetyWarning}
                    </div>
                  </div>
                )}
              </div>

              {/* Spare Parts Breakdown */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-blue-600" /> Required Spare Parts & Materials
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Standard Upfront Rates</span>
                </div>

                {result.requiredParts.length > 0 ? (
                  <div className="space-y-2">
                    {result.requiredParts.map((part, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-800 font-medium">{part.partName}</span>
                        </div>
                        <span className="font-bold text-slate-900">{formatCurrency(part.estimatedPriceINR)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">No additional spare parts required for this repair.</p>
                )}

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Labor Service Charge</span>
                    <span className="font-semibold">{formatCurrency(result.recommendedLaborPriceINR)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Spare Parts</span>
                    <span className="font-semibold">
                      {formatCurrency(result.estimatedTotalINR - result.recommendedLaborPriceINR)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-dashed border-slate-200">
                    <span>Total Upfront Estimate</span>
                    <span className="text-emerald-700">{formatCurrency(result.estimatedTotalINR)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Approx. {result.repairTimeMinutes} mins
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> 30-Day Platform Warranty
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          {result ? (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              Apply Diagnosis to Booking <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-xs text-slate-400">Upload a photo to see diagnosis</span>
          )}
        </div>
      </div>
    </div>
  );
};
