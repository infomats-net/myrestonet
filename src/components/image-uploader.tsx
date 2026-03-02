'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  path: string;
  onUploadSuccess: (url: string) => void;
  className?: string;
  label?: string;
  currentUrl?: string;
}

export function ImageUploader({ path, onUploadSuccess, className, label, currentUrl }: ImageUploaderProps) {
  const { storage } = useFirebase();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!storage || !file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file.' });
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Images must be smaller than 5MB.' });
      return;
    }

    setUploading(true);
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

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
        toast({ title: 'Success', description: 'Image uploaded successfully.' });
      }
    );
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
                variant="secondary" 
                size="sm" 
                className="rounded-xl font-bold h-9 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Replace
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center p-6 text-center space-y-3">
            {uploading ? (
              <div className="w-full space-y-4 px-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <div className="space-y-2">
                  <p className="text-xs font-black text-primary uppercase tracking-widest">Uploading {Math.round(progress)}%</p>
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
                  <p className="text-[10px] text-slate-400 font-medium">PNG, JPG or WebP (max 5MB)</p>
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
