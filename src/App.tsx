/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, 
  Upload, 
  AlertCircle, 
  ChevronRight, 
  FileText, 
  History as HistoryIcon, 
  Settings as SettingsIcon,
  Shield,
  Zap,
  Globe,
  Loader2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

// --- Types ---

interface AnalysisResult {
  diagnosis: string;
  reasoning: string;
  severity: 'CRITICAL' | 'MODERATE' | 'STABLE';
  confidence: number;
  guidance: string[];
  triage_priority: string;
}

interface PatientSession {
  id: string;
  timestamp: string;
  image: string;
  result: AnalysisResult;
  status: 'completed' | 'pending';
}

// --- Components ---

const StatusBadge = ({ severity }: { severity: AnalysisResult['severity'] }) => {
  const colors = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
    MODERATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    STABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={cn("px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border", colors[severity])}>
      {severity}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'triage'>('analysis');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<PatientSession[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('medlens_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (session: PatientSession) => {
    const updated = [session, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('medlens_history', JSON.stringify(updated));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setSelectedImage(event.target?.result as string);
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const runAnalysis = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('prompt', 'Perform an emergency clinical analysis of this medical image.');
      formData.append('patientData', 'Remote field clinic, limited bandwidth environment.');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setResult(data);

      saveToHistory({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        image: selectedImage!,
        result: data,
        status: 'completed',
      });
    } catch (error) {
      console.error(error);
      alert('Analysis failed. Please check connectivity or try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative flex h-screen">
        {/* Sidebar */}
        <div className="w-16 md:w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col pt-6">
          <div className="px-4 mb-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="hidden md:block font-bold text-lg tracking-tight">MedLens <span className="text-blue-500">Edge</span></span>
          </div>

          <nav className="flex-1 px-3 space-y-2">
            {[
              { id: 'analysis', icon: Activity, label: 'Analysis' },
              { id: 'history', icon: HistoryIcon, label: 'Session History' },
              { id: 'triage', icon: AlertCircle, label: 'Triage Engine' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-white/10 text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-blue-400" : "group-hover:text-zinc-400")} />
                <span className="hidden md:block text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-white/5">
            <div className="flex items-center gap-2 px-2 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden md:block text-[11px] font-mono uppercase tracking-widest text-emerald-500/70">Edge Mode Active</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'analysis' && (
              <motion.div 
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 md:p-8 max-w-5xl mx-auto space-y-8"
              >
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Multimodal Diagnostic Assistant</h1>
                    <p className="text-zinc-400 max-w-xl text-sm leading-relaxed">
                      AI-powered imaging analysis optimized for low-resource environments. Upload or capture an X-ray or ultrasound for immediate decision support.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pb-1">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Cloud Sync</span>
                      <span className="text-xs font-mono text-zinc-300 italic">Paused (Field Link)</span>
                    </div>
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Uploader Section */}
                  <div className="lg:col-span-7 space-y-6">
                    <div 
                      onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                      className={cn(
                        "relative aspect-video rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer overflow-hidden",
                        selectedImage && "border-solid border-white/10",
                        !selectedImage && "hover:border-blue-500/50 hover:bg-blue-500/5"
                      )}
                    >
                      {selectedImage ? (
                        <img 
                          src={selectedImage} 
                          className="w-full h-full object-contain" 
                          alt="Diagnostic source" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-4 py-12">
                          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                            <Upload className="w-8 h-8 text-zinc-500 group-hover:text-blue-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-zinc-300">Drop medical imaging files here</p>
                            <p className="text-xs text-zinc-500 mt-1">DICOM, PNG, or Captured JPEG</p>
                          </div>
                        </div>
                      )}
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzing}
                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium py-3 rounded-xl transition-all border border-white/5 disabled:opacity-50"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Select File
                      </button>
                      <button 
                        onClick={runAnalysis}
                        disabled={!selectedImage || isAnalyzing}
                        className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:bg-zinc-800 disabled:shadow-none"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Running Local Inference...
                          </>
                        ) : (
                          <>
                             <Zap className="w-4 h-4 fill-current" />
                             Analyze Edge Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Results Sidebar */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 min-h-[400px]">
                      {!result && !isAnalyzing && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                          <FileText className="w-12 h-12 mb-4" />
                          <p className="text-sm">Upload imaging to generate clinical decision support.</p>
                        </div>
                      )}

                      {isAnalyzing && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                             <div className="h-4 w-1/3 bg-zinc-800 rounded animate-pulse" />
                             <div className="h-20 w-full bg-zinc-800/50 rounded animate-pulse" />
                          </div>
                          <div className="space-y-2">
                             <div className="h-4 w-1/4 bg-zinc-800 rounded animate-pulse" />
                             <div className="grid grid-cols-2 gap-2">
                                <div className="h-10 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-10 bg-zinc-800 rounded animate-pulse" />
                             </div>
                          </div>
                        </div>
                      )}

                      {result && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Diagnostic Report</span>
                             <StatusBadge severity={result.severity} />
                          </div>

                          <section>
                            <h3 className="text-xl font-bold text-white mb-2">{result.diagnosis}</h3>
                            <div className="text-sm text-zinc-400 leading-relaxed prose prose-invert prose-sm">
                              <ReactMarkdown>
                                {result.reasoning}
                              </ReactMarkdown>
                            </div>
                          </section>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">AI Confidence</span>
                              <div className="flex items-end gap-1">
                                <span className="text-xl font-mono text-white">{(result.confidence * 100).toFixed(0)}%</span>
                                <span className="text-[10px] text-zinc-500 pb-1">ACCURACY</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Triage Priority</span>
                              <span className="text-sm font-semibold text-blue-400">{result.triage_priority}</span>
                            </div>
                          </div>

                          <section>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest mb-4">
                              <ChevronRight className="w-4 h-4 text-blue-500" />
                              Clinical Guidance
                            </h4>
                            <ul className="space-y-3">
                              {result.guidance.map((step, idx) => (
                                <li key={idx} className="flex gap-3 text-sm text-zinc-400">
                                  <span className="text-blue-500 font-mono text-xs w-4">{idx + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        </motion.div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 flex items-start gap-4">
                      <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-blue-400">Privacy Preservation</h4>
                        <p className="text-[11px] text-zinc-500 mt-1">Data is processed entirely on the local Edge node. No patient-identifiable pixels leave this device under field configuration.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 max-w-5xl mx-auto"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <HistoryIcon className="text-blue-500" />
                    Session Archive
                  </h2>
                  <button 
                    onClick={() => {
                      if(confirm('Clear all local session data?')) {
                        setHistory([]);
                        localStorage.removeItem('medlens_history');
                      }
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Purge History
                  </button>
                </div>

                {history.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-white/5 rounded-3xl">
                    <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>No local sessions detected.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.map((session) => (
                      <div key={session.id} className="p-4 rounded-2xl border border-white/5 bg-zinc-900/40 hover:border-white/10 transition-colors flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-lg bg-black overflow-hidden flex-shrink-0">
                          <img src={session.image} className="w-full h-full object-cover opacity-60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-zinc-500">{new Date(session.timestamp).toLocaleString()}</span>
                            <StatusBadge severity={session.result.severity} />
                          </div>
                          <h4 className="text-sm font-semibold truncate text-white">{session.result.diagnosis}</h4>
                          <p className="text-xs text-zinc-500 mt-1">Confidence Score: {(session.result.confidence * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'triage' && (
              <motion.div 
                key="triage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 max-w-5xl mx-auto space-y-8"
              >
                 <div className="p-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Confidence-Aware Triage Engine</h2>
                    <p className="text-zinc-400 max-w-lg mx-auto text-sm">
                      Actively monitoring connected diagnostic nodes. This dashboard aggregates edge analysis to prioritize patient evacuation and acute care.
                    </p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/40 text-center">
                       <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-2">Critical Alpha</span>
                       <span className="text-4xl font-mono font-black">{history.filter(h => h.result.severity === 'CRITICAL').length}</span>
                    </div>
                    <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/40 text-center">
                       <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-2">Moderate Beta</span>
                       <span className="text-4xl font-mono font-black">{history.filter(h => h.result.severity === 'MODERATE').length}</span>
                    </div>
                    <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/40 text-center">
                       <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">Stable Delta</span>
                       <span className="text-4xl font-mono font-black">{history.filter(h => h.result.severity === 'STABLE').length}</span>
                    </div>
                 </div>

                 <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-white/5 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                          <tr>
                             <th className="px-6 py-4">Session ID</th>
                             <th className="px-6 py-4">Triage Rank</th>
                             <th className="px-6 py-4">Analysis Depth</th>
                             <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {history.map(h => (
                            <tr key={h.id} className="hover:bg-white/5 transition-colors">
                               <td className="px-6 py-4 font-mono text-zinc-400">#IDX-{h.id}</td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                     <div className={cn("w-2 h-2 rounded-full", h.result.severity === 'CRITICAL' ? 'bg-red-500' : h.result.severity === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500')} />
                                     {h.result.triage_priority}
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-zinc-500">{(h.result.confidence * 100).toFixed(1)}% Multi-layer</td>
                               <td className="px-6 py-4 text-right">
                                  <button className="text-blue-500 hover:underline">Escalate</button>
                               </td>
                            </tr>
                          ))}
                          {history.length === 0 && (
                            <tr>
                               <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 italic">No triage data currently synced.</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Network Indicator */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <Globe className="w-4 h-4 text-zinc-400" />
          <span className="text-[10px] font-bold text-zinc-400">OFFLINE NODES: 4</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Local-Mesh Stable</span>
        </div>
      </div>
    </div>
  );
}

