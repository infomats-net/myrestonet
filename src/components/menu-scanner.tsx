'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Loader2, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { importMenu, type ImportMenuOutput } from '@/ai/flows/import-menu-flow';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface MenuScannerProps {
  restaurantId: string;
  menuId: string;
  onSuccess: () => void;
}

export function MenuScanner({ restaurantId, menuId, onSuccess }: MenuScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'selection' | 'camera' | 'upload'>('selection');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedResult, setScannedResult] = useState<ImportMenuOutput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      setMode('camera');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
        setMode('selection');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setMode('selection');
      };
      reader.readAsDataURL(file);
    }
  };

  const processWithAi = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      const result = await importMenu({ photoDataUri: capturedImage });
      setScannedResult(result);
      toast({ title: "Menu Scanned", description: `Found ${result.items.length} items.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Scan Failed", description: "AI could not read the menu. Please try a clearer photo." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportAll = async () => {
    if (!scannedResult || !firestore || !restaurantId || !menuId) return;
    setIsSaving(true);
    try {
      const itemsRef = collection(firestore, 'restaurants', restaurantId, 'menus', menuId, 'items');
      for (const item of scannedResult.items) {
        await addDoc(itemsRef, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      toast({ title: "Import Successful", description: "All items added to catalog." });
      setIsOpen(false);
      resetScanner();
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "Import Error" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetScanner = () => {
    stopCamera();
    setMode('selection');
    setCapturedImage(null);
    setScannedResult(null);
    setHasCameraPermission(null);
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline" 
        className="rounded-2xl h-12 px-6 gap-2 border-primary/20 text-primary hover:bg-primary/5 font-black"
      >
        <Sparkles className="h-4 w-4" /> AI Menu Scanner
      </Button>

      <Dialog open={isOpen} onOpenChange={(v) => { if(!v) resetScanner(); setIsOpen(v); }}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="p-8 border-b bg-slate-50/50">
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Menu Digitizer
            </DialogTitle>
            <DialogDescription>
              Scan a printed menu using your camera or upload a photo to extract items instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="p-0">
            {!scannedResult ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white">
                {mode === 'selection' && !capturedImage && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-md">
                    <Button 
                      onClick={startCamera} 
                      className="h-40 rounded-3xl flex flex-col gap-4 bg-primary hover:bg-primary/90 text-white shadow-xl"
                    >
                      <Camera className="h-10 w-10" />
                      <span className="font-black text-lg">Use Camera</span>
                    </Button>
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline"
                      className="h-40 rounded-3xl flex flex-col gap-4 border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <Upload className="h-10 w-10 text-slate-400" />
                      <span className="font-black text-lg text-slate-600">Upload Photo</span>
                    </Button>
                    <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                  </div>
                )}

                {mode === 'camera' && (
                  <div className="relative w-full aspect-[3/4] max-w-sm rounded-[2rem] overflow-hidden bg-black shadow-2xl border-4 border-white">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <Button variant="outline" onClick={resetScanner} className="rounded-full h-12 w-12 bg-white/20 backdrop-blur-md border-white/20 text-white">
                        <X />
                      </Button>
                      <Button onClick={capturePhoto} className="rounded-full h-16 w-16 bg-white hover:bg-slate-100 text-primary shadow-2xl">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
                      </Button>
                    </div>
                    {hasCameraPermission === false && (
                      <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-slate-900/90 text-white">
                        <Alert variant="destructive" className="bg-transparent border-none text-white">
                          <AlertTitle>Access Denied</AlertTitle>
                          <AlertDescription>Please allow camera access in settings.</AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                )}

                {capturedImage && mode === 'selection' && (
                  <div className="space-y-8 w-full max-w-md animate-in zoom-in-95 duration-300">
                    <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                      <img src={capturedImage} className="w-full h-full object-cover" alt="Captured Menu" />
                      <button 
                        onClick={() => setCapturedImage(null)}
                        className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Button 
                      className="w-full h-16 rounded-2xl text-xl font-black gap-2 shadow-xl shadow-primary/20" 
                      onClick={processWithAi}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles className="h-6 w-6" />}
                      {isProcessing ? "Extracting Items..." : "Start AI Scan"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-[500px]">
                <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Scan Complete: Found {scannedResult.items.length} Items</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setScannedResult(null)} className="text-emerald-700 hover:bg-emerald-100 font-bold">
                    Rescan
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {scannedResult.items.map((item, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">{item.name}</span>
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-widest">{item.category}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed italic">{item.description}</p>
                        </div>
                        <span className="font-black text-primary">${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter className="p-8 border-t bg-slate-50/50">
            {scannedResult ? (
              <div className="flex gap-3 w-full">
                <Button variant="outline" onClick={() => resetScanner()} className="flex-1 h-14 rounded-2xl font-bold">Cancel</Button>
                <Button 
                  className="flex-[2] h-14 rounded-2xl font-black text-lg shadow-xl" 
                  onClick={handleImportAll}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                  Import {scannedResult.items.length} Items
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="w-full h-12 rounded-xl text-slate-400 font-bold">
                Close Scanner
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
