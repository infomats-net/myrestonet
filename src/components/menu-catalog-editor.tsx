
'use client';

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Edit3
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

export function MenuCatalogEditor({ restaurantId }: { restaurantId: string }) {
  const { storage, firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', category: 'Main', imageUrl: '' });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Quick Replace State
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
          if (!ctx) {
            reject(new Error('Canvas Error'));
            return;
          }
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
      
      toast({ title: "Visual Updated", description: `${activeReplaceItem.name} image replaced.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Replace Failed", description: e.message });
    } finally {
      setReplacingItemId(null);
      setActiveReplaceItem(null);
    }
  };

  const handleAddMenu = async () => {
    if (!firestore || !restaurantId || !menuForm.name) return;
    setLoading(true);
    try {
      await addDoc(collection(firestore, 'restaurants', restaurantId, 'menus'), {
        ...menuForm,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setIsMenuDialogOpen(false);
      setMenuForm({ name: '', description: '' });
      toast({ title: "Menu Created" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!firestore || !restaurantId || !selectedMenuId || !itemForm.name) return;
    setLoading(true);
    try {
      const data = {
        name: itemForm.name,
        description: itemForm.description,
        price: parseFloat(itemForm.price) || 0,
        category: itemForm.category,
        imageUrl: itemForm.imageUrl,
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
      setItemForm({ name: '', description: '', price: '', category: 'Main', imageUrl: '' });
      setEditingItemId(null);
      toast({ title: editingItemId ? "Item Updated" : "Item Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore || !restaurantId || !selectedMenuId || !window.confirm("Delete this menu item?")) return;
    try {
      await deleteDoc(doc(firestore, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items', id));
      toast({ title: "Item Removed" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  if (loadingMenus) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!selectedMenuId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-12 text-center hover:bg-slate-50 cursor-pointer group transition-colors"
            onClick={() => setIsMenuDialogOpen(true)}
          >
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-4">
              <Plus className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black">Create New Menu</h3>
            <p className="text-sm text-slate-400 mt-2">Group items into manageable catalogs.</p>
          </Card>

          {menus?.map(menu => (
            <Card key={menu.id} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
              <CardHeader className="bg-slate-50/50 p-8 flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-primary">
                    <Utensils className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black">{menu.name}</CardTitle>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Catalog Entry</p>
                  </div>
                </div>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-300 hover:text-destructive rounded-full"
                  onClick={(e) => { e.stopPropagation(); deleteDoc(doc(firestore!, 'restaurants', restaurantId, 'menus', menu.id)); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px] italic">
                  {menu.description || "No description provided."}
                </p>
                <Button 
                  className="w-full h-12 rounded-2xl font-black gap-2 shadow-lg"
                  onClick={() => setSelectedMenuId(menu.id)}
                >
                  Manage Items <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedMenuId(null)} className="rounded-xl font-bold">
              <ChevronLeft className="mr-2" /> Back to Menus
            </Button>
            <div className="flex gap-2 w-full md:w-auto">
              <MenuScanner 
                restaurantId={restaurantId} 
                menuId={selectedMenuId} 
                onSuccess={() => {}} 
              />
              <Button onClick={() => { setEditingItemId(null); setItemForm({ name: '', description: '', price: '', category: 'Main', imageUrl: '' }); setIsItemDialogOpen(true); }} className="flex-1 md:flex-none rounded-2xl h-12 px-6 shadow-xl font-black">
                <Plus className="mr-2 h-4 w-4" /> Add Menu Item
              </Button>
            </div>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <CardHeader className="p-10 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-black">
                  {menus?.find(m => m.id === selectedMenuId)?.name}
                </CardTitle>
                <CardDescription className="text-sm font-medium mt-1">
                  Click the refresh icon on any photo to quickly update item visuals.
                </CardDescription>
              </div>
              <Badge className="h-8 rounded-full px-4 bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest">
                {items?.length || 0} Items
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Menu Item Details</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Price</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items?.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border group/thumb">
                              {replacingItemId === item.id ? (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                  <Loader2 className="animate-spin h-5 w-5 text-primary" />
                                </div>
                              ) : (
                                <button 
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white z-10"
                                  onClick={() => { setActiveReplaceItem(item); fileInputRef.current?.click(); }}
                                >
                                  <RefreshCw className="h-5 w-5" />
                                </button>
                              )}
                              <img 
                                src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">{item.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold uppercase text-[9px] tracking-widest">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-6 font-black text-slate-900">${item.price}</td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-full"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setItemForm({
                                  name: item.name,
                                  description: item.description,
                                  price: item.price.toString(),
                                  category: item.category,
                                  imageUrl: item.imageUrl || ''
                                });
                                setIsItemDialogOpen(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4 text-primary" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-slate-300 hover:text-destructive rounded-full"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hidden Global File Input for Quick Replace */}
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleQuickReplaceImage(file);
        }}
      />

      {/* Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingItemId ? 'Update Menu Item' : 'Add New Menu Item'}</DialogTitle>
            <DialogDescription>Define the details and visuals for this item.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Utensils className="h-3 w-3" /> Item Name</Label>
                <Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label><DollarSign className="h-3 w-3 inline mr-1" />Price</Label>
                  <Input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label><Tag className="h-3 w-3 inline mr-1" />Category</Label>
                  <Input value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className="h-12 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="rounded-xl min-h-[120px]" />
              </div>
            </div>

            <div className="space-y-6">
              <ImageUploader 
                label="Item Image"
                path={`restaurants/${restaurantId}/items/${editingItemId || 'temp'}`}
                currentUrl={itemForm.imageUrl}
                onUploadSuccess={(url) => setItemForm({...itemForm, imageUrl: url})}
                onDelete={() => setItemForm({...itemForm, imageUrl: ''})}
              />
            </div>
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} className="rounded-2xl h-12">Cancel</Button>
            <Button className="h-12 rounded-2xl px-10 font-black shadow-xl" onClick={handleSaveItem} disabled={loading || !itemForm.name}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : editingItemId ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
