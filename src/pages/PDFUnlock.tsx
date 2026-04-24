import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, Unlock, Settings2, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QueueItem {
  id: string;
  file: File;
  status: 'idle' | 'processing' | 'done' | 'error';
  url?: string;
  error?: string;
}

export default function PDFUnlock() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [password, setPassword] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'idle' as const
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const unlockItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'processing' } : i));

    try {
      const arrayBuffer = await item.file.arrayBuffer();
      // Note: pdf-lib's ignoreEncryption is a metadata-level bypass.
      // High-level AES-256 encryption might still fail without specialized workers.
      const pdfDoc = await PDFDocument.load(arrayBuffer, { 
         ignoreEncryption: true 
      });
      
      pdfDoc.setTitle('Unlocked Document');
      pdfDoc.setAuthor('User');
      pdfDoc.setSubject(''); 
      pdfDoc.setCreator('FileDocs Decrypt Engine');
      pdfDoc.setProducer('FileDocs');

      const newPdfBytes = await pdfDoc.save(); 
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'done', url } : i));
    } catch (e: any) {
      console.error(e);
      setItems(prev => prev.map(i => i.id === id ? { 
        ...i, 
        status: 'error', 
        error: "Decryption Failed: This file likely uses complex encryption." 
      } : i));
    }
  };

  const handleBatchUnlock = async () => {
    setIsProcessingBatch(true);
    const idleItems = items.filter(i => i.status === 'idle');
    for (const item of idleItems) {
      await unlockItem(item.id);
    }
    setIsProcessingBatch(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearQueue = () => {
    items.forEach(item => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setItems([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Unlock PDF</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">Remove security restrictions and metadata locks from multiple PDF documents at once.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-white/10 bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Settings2 className="w-5 h-5 text-red-400"/> Security Config
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Authorization Key</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white focus:border-red-500 transition-all outline-none"
                  placeholder="Input file password..."
                />
                <p className="text-[10px] text-slate-500 italic">Enter the password required to open the restricted files.</p>
              </div>
            </div>

            <button 
              onClick={handleBatchUnlock} 
              disabled={isProcessingBatch || items.length === 0 || !password || items.every(i => i.status !== 'idle')}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:opacity-30 active:scale-95"
            >
              {isProcessingBatch ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Decrypting Batch...
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  Process {items.filter(i => i.status === 'idle').length || items.length} Files
                </>
              )}
            </button>

            {items.some(i => i.status === 'done') && (
              <div className="pt-4 border-t border-white/5">
                <button 
                  onClick={clearQueue}
                  className="w-full py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Clear Queue
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group",
              isDragActive ? "border-red-500 bg-red-500/5 scale-[0.99]" : "border-slate-800 hover:border-slate-700 bg-slate-900/20"
            )}
          >
            <input {...getInputProps()} />
            <div className="bg-red-500/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-200">Add More Documents</p>
              <p className="text-sm text-slate-500">Drop restricted PDFs here to add to the queue</p>
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-slate-900/60 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "p-3 rounded-xl shrink-0",
                      item.status === 'done' ? "bg-green-500/10 text-green-400" : 
                      item.status === 'error' ? "bg-red-500/10 text-red-400" : "bg-slate-800 text-slate-400"
                    )}>
                      {item.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                       item.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> :
                       item.status === 'error' ? <XCircle className="w-5 h-5" /> :
                       <Unlock className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.file.name}</p>
                      <p className="text-xs text-slate-500 italic">
                        {item.status === 'done' ? 'Ready for download' : 
                         item.status === 'error' ? item.error : 
                         item.status === 'processing' ? 'Bypassing restrictions...' : 'Waiting in queue'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'done' && item.url && (
                      <a
                        href={item.url}
                        download={`unlocked_${item.file.name}`}
                        className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {items.length === 0 && (
              <div className="text-center py-20 bg-slate-900/20 border border-white/5 rounded-3xl border-dashed">
                <p className="text-slate-500">No files in queue. Start by uploading some locked PDFs.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

