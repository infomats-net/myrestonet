'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  path: string;
  onUploadSuccess: (url: string) => void;
  onDelete?: () => void;
  className?: string;
  label?: string;
  currentUrl?: string;
}

export function ImageUploader({ path, onUploadSuccess, onDelete, className, label, currentUrl }: ImageUploaderProps) {
  const { storage } = useFirebase();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Converts a file to WebP format using HTML5 Canvas.
   * This keeps the app fast and storage efficient.
   */
  const convertToWebP = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not initialize image processing context.'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Image conversion failed.'));
            },
            'image/webp',
            0.8
          );
        };
        img.onerror = () => reject(new Error('Failed to load image for processing.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read selected file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (file: File) => {
    if (!storage || !file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file.' });
      return;
    }

    setUploading(true);
    setProgress(0);
    
    try {
      const webpBlob = await convertToWebP(file);
      
      const cleanPath = path.replace(/\.[^/.]+$/, "");
      const finalPath = `${cleanPath}.webp`;
      
      const storageRef = ref(storage, finalPath);
      const uploadTask = uploadBytesResumable(storageRef, webpBlob, {
        contentType: 'image/webp'
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          setUploading(false);
          toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploading(false);
          setProgress(0);
          onUploadSuccess(downloadURL);
          toast({ title: 'Visual Updated', description: 'Image optimized and uploaded successfully.' });
        }
      );
    } catch (err: any) {
      setUploading(false);
      toast({ variant: 'destructive', title: 'Optimization failed', description: err.message || 'Could not optimize image.' });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUrl) return;

    if (!window.confirm("Are you sure you want to permanently delete this image from storage?")) return;

    setUploading(true);
    try {
      // If storage is available, attempt to delete the physical file
      if (storage) {
        const cleanPath = path.replace(/\.[^/.]+$/, "");
        const finalPath = `${cleanPath}.webp`;
        const storageRef = ref(storage, finalPath);
        
        await deleteObject(storageRef).catch(err => {
          // If the file isn't in our storage (e.g. AI suggested external URL), we just proceed
          console.warn("Storage cleanup skipped:", err.code);
        });
      }
      
      if (onDelete) onDelete();
      toast({ title: 'Visual Removed', description: 'The image has been cleared from your profile.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not complete the removal process.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {label && <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>}
      
      <div 
        className={cn(
          "relative group border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all min-h-[160px] overflow-hidden",
          uploading ? "bg-slate-50 border-primary/20" : "bg-white hover:bg-slate-50 border-slate-200 hover:border-primary/40",
          currentUrl && !uploading && "border-none shadow-inner"
        )}
      >
        {currentUrl && !uploading ? (
          <>
            <img src={currentUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button 
                type="button"
                variant="secondary" 
                size="sm" 
                className="rounded-xl font-bold h-9 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw className="h-4 w-4" /> Replace
              </Button>
              {onDelete && (
                <Button 
                  type="button"
                  variant="destructive" 
                  size="sm" 
                  className="rounded-xl font-bold h-9 gap-2"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center p-6 text-center space-y-3">
            {uploading ? (
              <div className="w-full space-y-4 px-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <div className="space-y-2">
                  <p className="text-xs font-black text-primary uppercase tracking-widest">Processing {Math.round(progress)}%</p>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Click to upload image</p>
                  <p className="text-[10px] text-slate-400 font-medium">Auto-converted to lightweight WebP</p>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl font-bold h-9"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select File
                </Button>
              </>
            )}
          </div>
        )}
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }} 
        />
      </div>
    </div>
  );
}
