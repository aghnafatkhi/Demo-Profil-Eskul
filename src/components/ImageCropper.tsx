import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Scale down if too large to prevent 1MB Firestore limit issues
  const MAX_WIDTH = 1600;
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > MAX_WIDTH) {
    const scale = MAX_WIDTH / targetWidth;
    targetWidth = MAX_WIDTH;
    targetHeight = targetHeight * scale;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Compress to JPEG for smaller size to prevent 1MB Firestore limit issues
  return canvas.toDataURL('image/jpeg', 0.7);
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel, aspectRatio = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4">
      <div className="bg-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h3 className="text-white font-bold">Sesuaikan Foto</h3>
          <button onClick={onCancel} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative flex-grow bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-6 border-t border-zinc-800 bg-zinc-900 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-xl font-bold bg-accent hover:bg-accent/90 text-white flex items-center gap-2 transition-colors"
            >
              <Check className="w-5 h-5" /> Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
