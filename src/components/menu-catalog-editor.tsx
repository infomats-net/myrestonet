
'use client';

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  Utensils, 
  Sparkles, 
  Loader2, 
  Image as ImageIcon, 
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle2,
  DollarSign,
  Tag,
  Upload,
  RefreshCw,
  Edit3,
  Star,
  Zap,
  Leaf,
  Flame,
  WheatOff,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useFirebase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { generateItemDescription } from '@/ai/flows/generate-item-description';
import { selectPlaceholder } from '@/ai/flows/select-placeholder';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ImageUploader } from '@/components/image-uploader';
import { MenuScanner } from '@/components/menu-scanner';
import { cn } from '@/lib/utils';

const DIETARY_OPTIONS = [
  { id: 'veg', label: 'Veg', icon: Leaf },
  { id: 'vegan', label: 'Vegan', icon: Leaf },
  { id: 'gf', label: 'GF', icon: WheatOff },
  { id: 'halal', label: 'Halal', icon: ShieldCheck },
  { id: 'spicy', label: 'Spicy', icon: Flame },
];

export function MenuCatalogEditor({ restaurantId }: { restaurantId: string }) {
  const { storage, firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ 
    name: '', 
    description: '', 
    price: '', 
    category: 'Main', 
    imageUrl: '',
    isPopular: false,
    isCombo: false,
    isOutOfStock: false,
    specialPrice: '',
    dietary: [] as string[]
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [activeReplaceItem, setActiveReplaceItem] = useState<any>(null);

  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId || !selectedMenuId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items');
  }, [firestore, restaurantId, selectedMenuId]);
  const { data: items, isLoading: loadingItems } = useCollection(itemsQuery);

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
          if (!ctx) { reject(new Error('Canvas Error')); return; }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Blob Error')), 'image/webp', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleQuickReplaceImage = async (file: File) => {
    if (!storage || !firestore || !restaurantId || !selectedMenuId || !activeReplaceItem) return;
    setReplacingItemId(activeReplaceItem.id);
    try {
      const webpBlob = await convertToWebP(file);
      const storageRef = ref(storage, `restaurants/${restaurantId}/items/${activeReplaceItem.id}.webp`);
      await uploadBytes(storageRef, webpBlob, { contentType: 'image/webp' });
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(firestore, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items', activeReplaceItem.id), {
        imageUrl: downloadURL,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Visual Updated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Replace Failed" });
    } finally {
      setReplacingItemId(null);
      setActiveReplaceItem(null);
    }
  };

  const handleSaveItem = async () => {
    if (!firestore || !restaurantId || !selectedMenuId || !itemForm.name) return;
    setLoading(true);
    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price) || 0,
        specialPrice: itemForm.specialPrice ? parseFloat(itemForm.specialPrice) : null,
        updatedAt: serverTimestamp()
      };

      if (editingItemId) {
        await updateDoc(doc(firestore, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items', editingItemId), data);
      } else {
        await addDoc(collection(firestore, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsItemDialogOpen(false);
      resetItemForm();
      toast({ title: "Catalog Updated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const resetItemForm = () => {
    setItemForm({ 
      name: '', description: '', price: '', category: 'Main', imageUrl: '', 
      isPopular: false, isCombo: false, isOutOfStock: false, specialPrice: '', dietary: [] 
    });
    setEditingItemId(null);
  };

  const toggleDietary = (id: string) => {
    setItemForm(prev => ({
      ...prev,
      dietary: prev.dietary.includes(id) ? prev.dietary.filter(d => d !== id) : [...prev.dietary, id]
    }));
  };

  if (loadingMenus) return <div className="p-20 text-center"><Loader2 className="animate-spin h-8" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!selectedMenuId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-12 text-center hover:bg-slate-50 cursor-pointer group" onClick={() => setIsMenuDialogOpen(true)}>
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-4"><Plus className="h-8 w-8" /></div>
            <h3 className="text-xl font-black">Create New Menu</h3>
          </Card>
          {menus?.map(menu => (
            <Card key={menu.id} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
              <CardHeader className="bg-slate-50/50 p-8 flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center text-primary"><Utensils className="h-6 w-6" /></div>
                  <div><CardTitle className="text-xl font-black">{menu.name}</CardTitle></div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive rounded-full" onClick={() => deleteDoc(doc(firestore!, 'restaurants', restaurantId, 'menus', menu.id))}><Trash2 className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="p-8"><Button className="w-full h-12 rounded-2xl font-black" onClick={() => setSelectedMenuId(menu.id)}>Manage Items <ChevronRight className="ml-2 h-4 w-4" /></Button></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => setSelectedMenuId(null)} className="rounded-xl font-bold"><ChevronLeft className="mr-2" /> Back</Button>
            <Button onClick={() => { resetItemForm(); setIsItemDialogOpen(true); }} className="rounded-2xl h-12 px-6 shadow-xl font-black"><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <CardHeader className="p-10 border-b bg-slate-50/50 flex justify-between items-center">
              <div><CardTitle className="text-3xl font-black">{menus?.find(m => m.id === selectedMenuId)?.name}</CardTitle></div>
              <Badge className="bg-emerald-50 text-emerald-600 font-black">{items?.length || 0} Items</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Details</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Features</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Price</th>
                    <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items?.map(item => (
                    <tr key={item.id} className={cn("hover:bg-slate-50 group", item.isOutOfStock && "opacity-50")}>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border group/thumb">
                            {replacingItemId === item.id ? <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5" /></div> : 
                            <button className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white" onClick={() => { setActiveReplaceItem(item); fileInputRef.current?.click(); }}><RefreshCw className="h-5 w-5" /></button>}
                            <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{item.name}</p>
                            <div className="flex gap-1 mt-1">
                              {item.dietary?.map((d: string) => <Badge key={d} variant="outline" className="text-[8px] uppercase px-1">{d}</Badge>)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-2">
                          {item.isPopular && <Star className="h-4 w-4 text-amber-400 fill-current" />}
                          {item.isCombo && <Zap className="h-4 w-4 text-blue-500 fill-current" />}
                          {item.isOutOfStock && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                        </div>
                      </td>
                      <td className="p-6">
                        {item.specialPrice ? <div className="flex flex-col"><span className="text-rose-600 font-black">${item.specialPrice}</span><span className="text-[10px] line-through text-slate-400">${item.price}</span></div> : <span className="font-black">${item.price}</span>}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingItemId(item.id); setItemForm({ ...item, price: item.price.toString(), specialPrice: item.specialPrice?.toString() || '', dietary: item.dietary || [] }); setIsItemDialogOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive" onClick={() => deleteDoc(doc(firestore!, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items', item.id))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleQuickReplaceImage(file); }} />

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-4xl">
          <DialogHeader><DialogTitle className="text-2xl font-black">{editingItemId ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="space-y-6">
              <div className="space-y-2"><Label>Item Name</Label><Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Base Price</Label><Input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Special Price (Optional)</Label><Input type="number" value={itemForm.specialPrice} onChange={e => setItemForm({...itemForm, specialPrice: e.target.value})} className="rounded-xl" /></div>
              </div>
              <div className="space-y-4">
                <Label>Dietary Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map(opt => (
                    <Button key={opt.id} variant="outline" size="sm" onClick={() => toggleDietary(opt.id)} className={cn("rounded-full gap-2", itemForm.dietary.includes(opt.id) && "bg-primary/10 border-primary text-primary")}>
                      <opt.icon className="h-3 w-3" /> {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="rounded-xl" /></div>
            </div>
            <div className="space-y-6">
              <ImageUploader path={`restaurants/${restaurantId}/items/${editingItemId || 'temp'}`} currentUrl={itemForm.imageUrl} onUploadSuccess={(url) => setItemForm({...itemForm, imageUrl: url})} onDelete={() => setItemForm({...itemForm, imageUrl: ''})} />
              <div className="space-y-4 bg-slate-50 p-6 rounded-3xl">
                <div className="flex items-center justify-between"><Label className="flex items-center gap-2"><Star className="h-4 w-4" /> Featured / Popular</Label><Switch checked={itemForm.isPopular} onCheckedChange={v => setItemForm({...itemForm, isPopular: v})} /></div>
                <div className="flex items-center justify-between"><Label className="flex items-center gap-2"><Zap className="h-4 w-4" /> Combo / Meal Deal</Label><Switch checked={itemForm.isCombo} onCheckedChange={v => setItemForm({...itemForm, isCombo: v})} /></div>
                <div className="flex items-center justify-between"><Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Out of Stock</Label><Switch checked={itemForm.isOutOfStock} onCheckedChange={v => setItemForm({...itemForm, isOutOfStock: v})} /></div>
              </div>
            </div>
          </div>
          <DialogFooter><Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={handleSaveItem} disabled={loading || !itemForm.name}>{loading ? <Loader2 className="animate-spin" /> : "Save Changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
