import { useState, useRef } from 'react';
import { ShieldCheck, Download, Trash2, Image as ImageIcon, AlertCircle, FileWarning } from 'lucide-react';

export default function MetadataStripper() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCleaned, setIsCleaned] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setIsCleaned(false);
    }
  };

  const stripMetadata = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      // Re-drawing on canvas is a reliable way to strip EXIF data 
      // as canvas.toBlob/toDataURL creates a fresh stream without metadata
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(img, 0, 0);
      
      // Convert to blob (removes all metadata)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), file.type);
      });

      if (blob) {
        setPreview(URL.createObjectURL(blob));
        setIsCleaned(true);
      }
    } catch (error) {
      console.error('Strip Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCleaned = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = `cleaned_${file?.name || 'image.jpg'}`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white">Advanced Metadata Stripper</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Protect your privacy by removing GPS coordinates, camera models, and timestamps from your photos before sharing them online.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-square border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center transition-all cursor-pointer relative overflow-hidden group
              ${preview ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/30 bg-white/5 hover:bg-white/10'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
            {preview ? (
              <img src={preview} alt="Upload preview" className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">
                  <ImageIcon className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-white">Drop Photo Here</p>
                  <p className="text-slate-400">JPG, PNG, WebP supported</p>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={stripMetadata}
            disabled={!file || isProcessing || isCleaned}
            className={`w-full py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 transition-all
              ${!file || isProcessing || isCleaned
                ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20'}`}
          >
            {isProcessing ? 'Scrubbing Data...' : isCleaned ? 'Metadata Removed!' : 'Scrub Metadata'}
          </button>
        </div>

        <div className="flex flex-col justify-center space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-500" />
              What we remove:
            </h3>
            <ul className="space-y-3">
              {[
                "GPS Coordinates (Latitude/Longitude)",
                "Device Name & Manufacturer (iPhone, Canon, etc.)",
                "Software & Serial Numbers",
                "Exact Time & Date of Capture",
                "Thumbnail & Orientation data"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-400 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {isCleaned && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={downloadCleaned}
                className="w-full py-5 bg-white text-black rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors shadow-2xl"
              >
                <Download className="w-5 h-5" />
                Download Private Photo
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                This photo is now "clean" and safe to share anywhere.
              </p>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-200/70 leading-relaxed">
              FileDocs processes everything in your browser's memory. Your uncleaned photos never touch our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
