
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  ImageIcon, 
  Loader2, 
  Sparkles,
  Search,
  CheckCircle2,
  Camera
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { selectPlaceholder } from '@/ai/flows/select-placeholder';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function GalleryManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ url: '', caption: '' });

  // 1. Fetch Gallery Images
  const galleryQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'gallery');
  }, [firestore, restaurantId]);
  const { data: images, isLoading } = useCollection(galleryQuery);

  const handleAddImage = async () => {
    if (!firestore || !restaurantId || !form.url) return;
    setLoading(true);
    try {
      await addDoc(collection(firestore, 'restaurants', restaurantId, 'gallery'), {
        ...form,
        createdAt: serverTimestamp()
      });
      setIsNewDialogOpen(false);
      setForm({ url: '', caption: '' });
      toast({ title: "Photo Added", description: "The image is now live in your gallery." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!firestore || !restaurantId) return;
    try {
      await deleteDoc(doc(firestore, 'restaurants', restaurantId, 'gallery', id));
      toast({ title: "Photo Removed" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleAiSuggestion = async () => {
    setLoading(true);
    try {
      // Find current images to exclude
      const currentUrls = images?.map(img => img.url) || [];
      const currentPlaceholderIds = PlaceHolderImages.filter(p => currentUrls.includes(p.imageUrl)).map(p => p.id);

      const { placeholderId } = await selectPlaceholder({ 
        itemName: "Atmospheric restaurant interior",
        excludeIds: currentPlaceholderIds
      });
      
      const placeholder = PlaceHolderImages.find(p => p.id === placeholderId);
      if (placeholder) {
        setForm({ url: placeholder.imageUrl, caption: placeholder.description });
        toast({ title: "AI Suggestion", description: "Found a relevant atmospheric image." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary border border-primary/5">
            <Camera className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Photo Gallery</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your restaurant's visual story.</p>
          </div>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)} className="rounded-2xl h-12 px-6 shadow-xl font-black">
          <Plus className="mr-2 h-4 w-4" /> Add Photo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {images?.map(image => (
          <Card key={image.id} className="rounded-[2rem] border-none shadow-lg overflow-hidden group relative aspect-square">
            <img 
              src={image.url} 
              alt={image.caption} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
              <p className="text-white text-xs font-bold mb-4 line-clamp-2">{image.caption}</p>
              <Button 
                variant="destructive" 
                size="icon" 
                className="rounded-full self-end"
                onClick={() => handleDeleteImage(image.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}

        {(!images || images.length === 0) && (
          <Card 
            className="rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-12 text-center hover:bg-slate-50 cursor-pointer group transition-colors aspect-square"
            onClick={() => setIsNewDialogOpen(true)}
          >
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform mb-4">
              <ImageIcon className="h-8 w-8" />
            </div>
            <h3 className="text-sm font-black text-slate-400">Empty Gallery</h3>
            <p className="text-xs text-slate-300 mt-2">Click to add your first photo</p>
          </Card>
        )}
      </div>

      {/* Add Photo Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Add Photo</DialogTitle>
            <DialogDescription>Upload or link a new photo to your public gallery.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Image URL</Label>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1"
                  onClick={handleAiSuggestion}
                  disabled={loading}
                >
                  <Sparkles className="h-3 w-3" /> AI Suggest
                </Button>
              </div>
              <Input 
                value={form.url} 
                onChange={e => setForm({...form, url: e.target.value})} 
                placeholder="https://..." 
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Caption (Optional)</Label>
              <Input 
                value={form.caption} 
                onChange={e => setForm({...form, caption: e.target.value})} 
                placeholder="e.g. Our cozy terrace at sunset" 
                className="h-12 rounded-xl"
              />
            </div>

            {form.url && (
              <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border">
                <img src={form.url} className="w-full h-full object-cover" alt="Preview" />
              </div>
            )}
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)} className="rounded-2xl h-12">Cancel</Button>
            <Button className="h-12 rounded-2xl px-10 font-black shadow-xl" onClick={handleAddImage} disabled={loading || !form.url}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
              Publish to Gallery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
