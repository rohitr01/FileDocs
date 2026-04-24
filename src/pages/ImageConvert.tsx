import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings2, Trash2, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ConvertedItem {
  id: string;
  original: File;
  converted: string | null;
  previewOriginal: string;
  status: 'idle' | 'converting' | 'done' | 'error';
  targetFormat: string;
}

export default function ImageConvert() {
  const [items, setItems] = useState<ConvertedItem[]>([]);
  const [globalTargetFormat, setGlobalTargetFormat] = useState('image/png');
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: ConvertedItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      original: file,
      converted: null,
      previewOriginal: URL.createObjectURL(file),
      status: 'idle',
      targetFormat: globalTargetFormat
    }));
    setItems(prev => [...prev, ...newItems]);
  }, [globalTargetFormat]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  });

  const convertItem = async (id: string, targetFormat: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status === 'converting') return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'converting', targetFormat } : i));

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
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Blob creation failed")), targetFormat, 0.95);
      });

      const url = URL.createObjectURL(blob);
      setItems(prev => prev.map(i => i.id === id ? { ...i, converted: url, status: 'done' } : i));
    } catch (error) {
      console.error(error);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const handleBatchConvert = async () => {
    setIsProcessingAll(true);
    const idleItems = items.filter(i => i.status !== 'done');
    for (const item of idleItems) {
      await convertItem(item.id, globalTargetFormat);
    }
    setIsProcessingAll(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewOriginal);
        if (item.converted) URL.revokeObjectURL(item.converted);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const downloadAll = () => {
    items.forEach(item => {
      if (item.converted) {
        const link = document.createElement('a');
        link.href = item.converted;
        const ext = item.targetFormat.split('/')[1];
        link.download = `converted_${item.original.name.split('.')[0]}.${ext}`;
        link.click();
      }
    });
  };

  const getExtension = (mime: string) => mime.split('/')[1];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Batch Image Converter</h1>
        <p className="text-slate-400">Convert multiple images to PNG, JPG, or WEBP instantly in your browser.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-6 space-y-8 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-blue-400"/> Conversion Settings</h3>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-red-400 hover:underline">Clear All</button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Target Format</label>
                <select 
                  value={globalTargetFormat} 
                  onChange={(e) => setGlobalTargetFormat(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 text-sm outline-none"
                >
                  <option value="image/png">PNG (Lossless)</option>
                  <option value="image/jpeg">JPG / JPEG (Standard)</option>
                  <option value="image/webp">WEBP (Modern)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <button 
                onClick={handleBatchConvert}
                disabled={items.length === 0 || isProcessingAll}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {isProcessingAll ? "Converting..." : items.some(i => i.status === 'done') ? "Convert Remaining" : "Convert All"}
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

        {/* List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
              isDragActive ? "border-blue-400 bg-blue-400/10 scale-105" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            )}
          >
            <input {...getInputProps()} />
            <div className="bg-blue-500/20 p-4 rounded-full">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-slate-300 font-medium">Add more images for batch conversion</p>
            <p className="text-xs text-slate-500">Supports JPG, PNG, WEBP, BMP, etc.</p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Conversion Queue</h4>
              <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">{items.length} Files</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30">
                    <ImageIcon className="w-16 h-16" />
                    <p>No files in queue.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4 truncate flex-1">
                        <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative">
                          <img src={item.previewOriginal} alt="Thumb" className="w-full h-full object-cover" />
                          {item.status === 'converting' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="truncate space-y-1">
                          <p className="text-sm font-semibold text-slate-200 truncate" title={item.original.name}>{item.original.name}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-500 uppercase">{getExtension(item.original.type)}</span>
                             <ArrowRight className="w-3 h-3 text-slate-700" />
                             <span className="text-[10px] text-blue-400 font-bold uppercase">{getExtension(item.targetFormat)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status === 'done' && item.converted && (
                          <a 
                            href={item.converted} download={`converted_${item.original.name.split('.')[0]}.${getExtension(item.targetFormat)}`}
                            className="p-2 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-lg"
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
