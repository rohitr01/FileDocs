import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Layout, Image as ImageIcon, PenTool, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function IdentityMerger() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [sign, setSign] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layout, setLayout] = useState<'VERTICAL' | 'HORIZONTAL'>('VERTICAL');

  const photoImgRef = useRef<HTMLImageElement>(null);
  const signImgRef = useRef<HTMLImageElement>(null);

  const onDropPhoto = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (photo) URL.revokeObjectURL(photo);
      setPhoto(URL.createObjectURL(acceptedFiles[0]));
      
      // If user dropped two files, use second for sign
      if (acceptedFiles.length > 1 && !sign) {
        setSign(URL.createObjectURL(acceptedFiles[1]));
      }
      setResultUrl(null);
    }
  }, [photo, sign]);

  const onDropSign = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (sign) URL.revokeObjectURL(sign);
      setSign(URL.createObjectURL(acceptedFiles[0]));
      
      // If user dropped two files and photo is empty, use second for photo
      if (acceptedFiles.length > 1 && !photo) {
        setPhoto(URL.createObjectURL(acceptedFiles[1]));
      }
      setResultUrl(null);
    }
  }, [sign, photo]);

  const { getRootProps: getPhotoRoot, getInputProps: getPhotoInput, open: openPhoto } = useDropzone({
    onDrop: onDropPhoto,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true,
    noClick: true
  });

  const { getRootProps: getSignRoot, getInputProps: getSignInput, open: openSign } = useDropzone({
    onDrop: onDropSign,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true,
    noClick: true
  });

  const handleMerge = async () => {
    if (!photo || !sign || !photoImgRef.current || !signImgRef.current) return;
    setIsProcessing(true);
    
    try {
      const pImg = photoImgRef.current;
      const sImg = signImgRef.current;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (layout === 'VERTICAL') {
        const width = 600;
        const photoHeight = Math.round(width * (pImg.naturalHeight / pImg.naturalWidth));
        const signHeight = Math.round(width * (sImg.naturalHeight / sImg.naturalWidth));
        
        canvas.width = width;
        canvas.height = photoHeight + signHeight;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(pImg, 0, 0, width, photoHeight);
        ctx.drawImage(sImg, 0, photoHeight, width, signHeight);
      } else {
        const height = 400;
        const photoWidth = Math.round(height * (pImg.naturalWidth / pImg.naturalHeight));
        const signWidth = Math.round(height * (sImg.naturalWidth / sImg.naturalHeight));
        
        canvas.width = photoWidth + signWidth;
        canvas.height = height;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(pImg, 0, 0, photoWidth, height);
        ctx.drawImage(sImg, photoWidth, 0, signWidth, height);
      }

      setResultUrl(canvas.toDataURL('image/jpeg', 0.9));
    } catch(e) {
      console.error(e);
      alert("Merge failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (photo) URL.revokeObjectURL(photo);
    if (sign) URL.revokeObjectURL(sign);
    setPhoto(null);
    setSign(null);
    setResultUrl(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Photo and Sign Merger</h1>
        <p className="text-slate-400">Combine your Portrait Photo and Signature into a single file for form uploads.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-400"/> Step 1: Upload Photo
          </label>
          <div 
            {...getPhotoRoot()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[300px] transition-all relative overflow-hidden group",
              photo ? "border-green-500/30 bg-green-500/5" : "border-slate-700 bg-slate-800/10 hover:border-indigo-500 hover:bg-slate-800/20"
            )}
            onClick={openPhoto}
          >
            <input {...getPhotoInput()} />
            {photo ? (
              <div className="relative">
                <img ref={photoImgRef} src={photo} alt="Upload" className="max-h-64 rounded-lg shadow-xl" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                  <p className="text-white text-xs font-bold">Change Photo</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-200">Drop photo here</p>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openPhoto(); }}
                    className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-xs font-bold transition-colors"
                  >
                    Select Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
            <PenTool className="w-4 h-4 text-indigo-400"/> Step 2: Upload Signature
          </label>
          <div 
            {...getSignRoot()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[300px] transition-all relative overflow-hidden group",
              sign ? "border-green-500/30 bg-green-500/5" : "border-slate-700 bg-slate-800/10 hover:border-indigo-500 hover:bg-slate-800/20"
            )}
            onClick={openSign}
          >
            <input {...getSignInput()} />
            {sign ? (
              <div className="relative">
                <img ref={signImgRef} src={sign} alt="Signature" className="max-h-64 rounded-lg shadow-xl" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                  <p className="text-white text-xs font-bold">Change Signature</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-200">Drop signature here</p>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openSign(); }}
                    className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-xs font-bold transition-colors"
                  >
                    Select Signature
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <p className="text-xs text-slate-500 bg-slate-800/50 px-4 py-2 rounded-full border border-white/5">
          Tip: You can also drop both files anywhere on the page to auto-fill.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="bg-slate-800/40 p-1.5 rounded-2xl border border-white/10 flex gap-2">
          <button 
            onClick={() => setLayout('VERTICAL')} 
            className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2", 
              layout === 'VERTICAL' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
          >
            <div className="flex flex-col gap-0.5"><div className="w-3 h-2 bg-current rounded-sm opacity-50"/><div className="w-3 h-1 bg-current rounded-sm"/></div>
            Vertical Stack
          </button>
          <button 
            onClick={() => setLayout('HORIZONTAL')} 
            className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2", 
              layout === 'HORIZONTAL' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}
          >
            <div className="flex gap-0.5"><div className="w-2 h-3 bg-current rounded-sm opacity-50"/><div className="w-1 h-3 bg-current rounded-sm"/></div>
            Side by Side
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleReset}
            className="p-4 text-slate-500 hover:text-red-400 transition-colors"
            title="Reset All"
          >
            <RefreshCcw className="w-6 h-6" />
          </button>
          <button 
            onClick={handleMerge}
            disabled={!photo || !sign || isProcessing}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-3"
          >
            {isProcessing ? "Processing..." : <><Layout className="w-5 h-5"/> Generate Merged File</>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {resultUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="pt-12 border-t border-white/10 flex flex-col items-center gap-8"
          >
             <div className="relative group">
                <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-white p-4 rounded-2xl shadow-2xl border border-white/10 relative">
                  <img src={resultUrl} alt="Merged" className="max-h-[500px] rounded-lg shadow-lg" />
                </div>
             </div>
             
             <div className="flex gap-4">
                <button 
                  onClick={() => setResultUrl(null)} 
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-white/10"
                >
                  Start Over
                </button>
                <a 
                  href={resultUrl} 
                  download="merged_photo_sign.jpg" 
                  className="px-12 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-green-500/20 transition-all active:scale-95"
                >
                  <Download className="w-5 h-5"/> Download JPG
                </a>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
