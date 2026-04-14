import { useState } from 'react';
import { X } from 'lucide-react';

export default function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
        <X className="w-8 h-8" />
      </button>
      <img src={src} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
    </div>
  );
}
