import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ShieldCheck, Download, Trash2, Image as ImageIcon, AlertCircle, FileWarning, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrubItem {
  id: string;
  original: File;
  cleaned: string | null;
  previewOriginal: string;
  status: 'idle' | 'processing' | 'done' | 'error';
}

export default function MetadataStripper() {
  const [items, setItems] = useState<ScrubItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: ScrubItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      original: file,
      cleaned: null,
      previewOriginal: URL.createObjectURL(file),
      status: 'idle'
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  });

  const scrubItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status === 'processing') return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'processing' } : i));

    try {
      const img = new Image();
      img.src = item.previewOriginal;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");
      
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Blob failed")), item.original.type);
      });

      const url = URL.createObjectURL(blob);
      setItems(prev => prev.map(i => i.id === id ? { ...i, cleaned: url, status: 'done' } : i));
    } catch (e) {
      console.error(e);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const handleBatchScrub = async () => {
    setIsProcessingAll(true);
    const pending = items.filter(i => i.status !== 'done');
    for (const item of pending) {
      await scrubItem(item.id);
    }
    setIsProcessingAll(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewOriginal);
        if (item.cleaned) URL.revokeObjectURL(item.cleaned);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const downloadAll = () => {
    items.forEach(item => {
      if (item.cleaned) {
        const link = document.createElement('a');
        link.href = item.cleaned;
        link.download = `cleaned_${item.original.name}`;
        link.click();
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Batch Metadata Stripper</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Strip GPS, EXIF, and device metadata from multiple photos simultaneously for maximum privacy.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar Info & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-500" />
              Privacy Shield
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                We remove identifying markers like:
              </p>
              <ul className="space-y-2">
                {["GPS Location Data", "Camera/Phone Models", "Timestamps", "Software Info"].map((txt, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    {txt}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-3">
              <button 
                onClick={handleBatchScrub}
                disabled={items.length === 0 || isProcessingAll}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                {isProcessingAll ? "Scrubbing..." : "Scrub All Metadata"}
              </button>
              
              {items.some(i => i.status === 'done') && (
                <button 
                  onClick={downloadAll}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                >
                  <Download className="w-5 h-5"/> Download Cleaned
                </button>
              )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-[10px] text-blue-200/70 leading-relaxed">
                Processing is 100% client-side. Your private data never leaves your device.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content / List */}
        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
              isDragActive ? "border-emerald-400 bg-emerald-400/10 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
          >
            <input {...getInputProps()} />
            <div className="bg-emerald-500/20 p-4 rounded-full text-emerald-400">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-slate-200 font-medium text-lg text-center">Drag photos to scrub metadata</p>
            <p className="text-xs text-slate-500">Supports JPG, PNG, WEBP</p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[400px]">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Photo Queue</h4>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">{items.length} Files</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                    <ImageIcon className="w-16 h-16" />
                    <p>No photos in queue.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4 truncate flex-1">
                        <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative">
                          <img src={item.previewOriginal} alt="Thumb" className="w-full h-full object-cover" />
                          {item.status === 'processing' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="truncate space-y-1">
                          <p className="text-sm font-semibold text-slate-200 truncate" title={item.original.name}>{item.original.name}</p>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">{(item.original.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'done' && item.cleaned && (
                          <a 
                            href={item.cleaned} download={`cleaned_${item.original.name}`}
                            className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                        {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
