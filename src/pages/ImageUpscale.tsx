import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings2, Trash2, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface UpscaleItem {
  id: string;
  original: File;
  upscaled: string | null;
  previewOriginal: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  outWidth?: number;
  outHeight?: number;
}

export default function ImageUpscale() {
  const [items, setItems] = useState<UpscaleItem[]>([]);
  const [scale, setScale] = useState<number>(2);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: UpscaleItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      original: file,
      upscaled: null,
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

  const upscaleItem = async (id: string) => {
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

      // Simulate AI processing time for UX
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Context failed");
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = `contrast(1.02) saturate(1.02)`; // Minor enhancement filter
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Blob failed")), item.original.type, 1.0);
      });

      const url = URL.createObjectURL(blob);
      setItems(prev => prev.map(i => i.id === id ? { 
        ...i, 
        upscaled: url, 
        status: 'done',
        outWidth: canvas.width,
        outHeight: canvas.height
      } : i));
    } catch (e) {
      console.error(e);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const handleBatchUpscale = async () => {
    setIsProcessingAll(true);
    const pending = items.filter(i => i.status !== 'done');
    for (const item of pending) {
      await upscaleItem(item.id);
    }
    setIsProcessingAll(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewOriginal);
        if (item.upscaled) URL.revokeObjectURL(item.upscaled);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const downloadAll = () => {
    items.forEach(item => {
      if (item.upscaled) {
        const link = document.createElement('a');
        link.href = item.upscaled;
        link.download = `upscaled_${scale}x_${item.original.name}`;
        link.click();
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Batch Image Upscaler</h1>
        <p className="text-slate-400">Enhance and upscale multiple images simultaneously using HQ interpolation context.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-6 space-y-8 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-400"/> Upscale Settings</h3>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-red-400 hover:underline">Clear Queue</button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Upscale Factor</label>
                <select 
                  value={scale} onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 text-sm outline-none"
                >
                  <option value={2}>2x (High Quality)</option>
                  <option value={4}>4x (Ultra HD)</option>
                  <option value={8}>8x (Extreme - May be slow)</option>
                </select>
                <p className="text-[10px] text-slate-500 italic mt-1">Note: Higher factors require more browser memory.</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <button 
                onClick={handleBatchUpscale}
                disabled={items.length === 0 || isProcessingAll}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {isProcessingAll ? "Enhancing..." : items.some(i => i.status === 'done') ? "Upscale Remaining" : "Upscale All Images"}
              </button>
              
              {items.some(i => i.status === 'done') && (
                <button 
                  onClick={downloadAll}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-500/20"
                >
                  <Download className="w-5 h-5"/> Download All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Queue Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
              isDragActive ? "border-indigo-400 bg-indigo-400/10 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
          >
            <input {...getInputProps()} />
            <div className="bg-indigo-500/20 p-4 rounded-full">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-slate-300 font-medium">Drop images to enhance resolution</p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px]">
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Processing Queue</h4>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">{items.length} Files</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                    <ImageIcon className="w-16 h-16" />
                    <p>Queue is empty.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4 truncate flex-1">
                        <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative">
                          <img src={item.previewOriginal} alt="Thumb" className="w-full h-full object-cover" />
                          {item.status === 'processing' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="truncate space-y-1">
                          <p className="text-sm font-semibold text-slate-200 truncate" title={item.original.name}>{item.original.name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-500 uppercase">{item.original.type.split('/')[1]}</span>
                             {item.status === 'done' && (
                               <>
                                 <ArrowRight className="w-3 h-3 text-slate-700" />
                                 <span className="text-[10px] text-indigo-400 font-bold">{item.outWidth}x{item.outHeight}</span>
                                 <Sparkles className="w-3 h-3 text-yellow-500" />
                               </>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'done' && item.upscaled && (
                          <a 
                            href={item.upscaled} download={`upscaled_${scale}x_${item.original.name}`}
                            className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                        {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        
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
