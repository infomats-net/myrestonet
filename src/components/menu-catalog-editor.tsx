'use client';

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Utensils, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  RefreshCw,
  Edit3,
  Star,
  Zap,
  Leaf,
  Flame,
  WheatOff,
  ShieldCheck,
  AlertTriangle,
  X,
  Tag,
  DollarSign,
  Sparkle,
  TrendingUp,
  Package,
  Calendar,
  Layers,
  ArrowUpCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirebase, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { generateItemDescription } from '@/ai/flows/generate-item-description';
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
    category: '', 
    imageUrl: '',
    isPopular: false,
    isCombo: false,
    isOutOfStock: false,
    isNew: false,
    specialPrice: '',
    dietary: [] as string[],
    addOns: [] as { name: string, price: number }[],
    // Smart Selling Fields
    upsellIds: [] as string[],
    crossSellIds: [] as string[],
    isLTO: false,
    ltoExpiry: '',
    quantityDiscounts: [] as { minQty: number, discountPrice: number }[],
    enableAIRecommendations: true,
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newCustomTag, setNewCustomTag] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [activeReplaceItem, setActiveReplaceItem] = useState<any>(null);

  const [newAddOn, setNewAddOn] = useState({ name: '', price: '' });
  const [newQtyDiscount, setNewQtyDiscount] = useState({ minQty: '', price: '' });

  // --- Category & Tag Persistence ---
  const categoriesRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'config', 'menuCategories');
  }, [firestore, restaurantId]);
  const { data: categoriesDoc } = useDoc(categoriesRef);
  const savedCategories = categoriesDoc?.list || [];

  const dietaryTagsRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'config', 'dietaryTags');
  }, [firestore, restaurantId]);
  const { data: customTagsDoc } = useDoc(dietaryTagsRef);
  const savedCustomTags = customTagsDoc?.list || [];

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

  // All items across all menus for linking (upsells/cross-sells)
  const [allStoreItems, setAllStoreItems] = useState<any[]>([]);
  useMemo(() => {
    if (!menus || !firestore) return;
    const fetchAll = async () => {
      const results: any[] = [];
      for (const m of menus) {
        const snap = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', m.id, 'items'));
        snap.forEach(d => results.push({ id: d.id, name: d.data().name }));
      }
      setAllStoreItems(results);
    };
    fetchAll();
  }, [menus, firestore, restaurantId]);

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

  const handleAiDescription = async () => {
    if (!itemForm.name) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter an item name first." });
      return;
    }
    setLoading(true);
    try {
      const { description } = await generateItemDescription({ itemName: itemForm.name });
      setItemForm(prev => ({ ...prev, description }));
      toast({ title: "AI Description Generated" });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate description." });
    } finally {
      setLoading(false);
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

      if (itemForm.category.trim()) {
        const catRef = doc(firestore, 'restaurants', restaurantId, 'config', 'menuCategories');
        await setDoc(catRef, {
          list: arrayUnion(itemForm.category.trim()),
          updatedAt: serverTimestamp()
        }, { merge: true });
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
      name: '', description: '', price: '', category: '', imageUrl: '', 
      isPopular: false, isCombo: false, isOutOfStock: false, isNew: false, specialPrice: '', dietary: [], addOns: [],
      upsellIds: [], crossSellIds: [], isLTO: false, ltoExpiry: '', quantityDiscounts: [], enableAIRecommendations: true
    });
    setEditingItemId(null);
  };

  const addQtyDiscount = () => {
    if (!newQtyDiscount.minQty || !newQtyDiscount.price) return;
    setItemForm(prev => ({
      ...prev,
      quantityDiscounts: [...(prev.quantityDiscounts || []), { minQty: parseInt(newQtyDiscount.minQty), discountPrice: parseFloat(newQtyDiscount.price) }]
    }));
    setNewQtyDiscount({ minQty: '', price: '' });
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedMenuId(null)} className="rounded-xl font-bold text-white hover:bg-white/10"><ChevronLeft className="mr-2" /> Back to Menus</Button>
              <div className="h-8 w-px bg-white/10 mx-2" />
              <h2 className="text-xl font-black text-white">{menus?.find(m => m.id === selectedMenuId)?.name}</h2>
            </div>
            <div className="flex items-center gap-3">
              <MenuScanner restaurantId={restaurantId} menuId={selectedMenuId} onSuccess={() => {}} />
              <Button onClick={() => { resetItemForm(); setIsItemDialogOpen(true); }} className="rounded-2xl h-12 px-6 shadow-xl font-black bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add Manual Item
              </Button>
            </div>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <CardHeader className="p-10 border-b bg-slate-50/50 flex justify-between items-center">
              <div><CardTitle className="text-3xl font-black">Item Catalog</CardTitle></div>
              <Badge className="bg-emerald-50 text-emerald-600 font-black">{items?.length || 0} Items</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Details</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Smart Features</th>
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
                            <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} className="w-full h-full object-cover" alt={item.name} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{item.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.isLTO && <Badge className="text-[8px] bg-rose-100 text-rose-600 border-none">LTO</Badge>}
                              {item.upsellIds?.length > 0 && <Badge className="text-[8px] bg-emerald-100 text-emerald-600 border-none">Upsells</Badge>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-2">
                          {item.isPopular && <Star className="h-4 w-4 text-amber-400 fill-current" />}
                          {item.isCombo && <Zap className="h-4 w-4 text-blue-500 fill-current" />}
                          {item.quantityDiscounts?.length > 0 && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                        </div>
                      </td>
                      <td className="p-6">
                        {item.specialPrice ? <div className="flex flex-col"><span className="text-rose-600 font-black">${item.specialPrice}</span></div> : <span className="font-black">${item.price}</span>}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingItemId(item.id); setItemForm({ ...item, price: item.price.toString(), specialPrice: item.specialPrice?.toString() || '' }); setIsItemDialogOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
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

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-5xl overflow-hidden p-0">
          <Tabs defaultValue="basic" className="flex flex-col h-[80vh]">
            <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black">Item Configuration</DialogTitle>
                <DialogDescription>Define behavior and smart selling logic for this dish.</DialogDescription>
              </div>
              <TabsList className="bg-white border rounded-xl p-1">
                <TabsTrigger value="basic" className="rounded-lg font-bold">Basic Info</TabsTrigger>
                <TabsTrigger value="smart" className="rounded-lg font-bold gap-2"><ArrowUpCircle className="h-4 w-4 text-primary" /> Smart Selling</TabsTrigger>
                <TabsTrigger value="media" className="rounded-lg font-bold">Media</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              <TabsContent value="basic" className="space-y-6 mt-0">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><Label>Item Name</Label><Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="h-12 rounded-xl" /></div>
                  <div className="space-y-2"><Label>Category</Label><Input value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className="h-12 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><Label>Base Price</Label><Input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="h-12 rounded-xl" /></div>
                  <div className="space-y-2"><Label>Special Price</Label><Input type="number" value={itemForm.specialPrice} onChange={e => setItemForm({...itemForm, specialPrice: e.target.value})} className="h-12 rounded-xl" /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><Label>Description</Label><Button variant="link" size="sm" onClick={handleAiDescription} className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1"><Sparkles className="h-3 w-3" /> AI Write</Button></div>
                  <Textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="rounded-xl min-h-[120px]" />
                </div>
              </TabsContent>

              <TabsContent value="smart" className="space-y-10 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="font-black text-sm uppercase">AI Recommendations</span></div>
                        <Switch checked={itemForm.enableAIRecommendations} onCheckedChange={v => setItemForm({...itemForm, enableAIRecommendations: v})} />
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">When enabled, our AI will automatically suggest pairings for this item based on flavor profiles.</p>
                    </div>

                    <div className="space-y-4">
                      <Label className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Upsell Suggestions</Label>
                      <Select onValueChange={v => setItemForm({...itemForm, upsellIds: [...(itemForm.upsellIds || []), v]})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Add Upsell Item..." /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {allStoreItems.filter(i => i.id !== editingItemId).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        {itemForm.upsellIds?.map(id => (
                          <Badge key={id} variant="secondary" className="pl-3 pr-1 py-1 gap-2 rounded-lg bg-emerald-50 text-emerald-700 border-none">
                            {allStoreItems.find(i => i.id === id)?.name || id}
                            <button onClick={() => setItemForm({...itemForm, upsellIds: itemForm.upsellIds.filter(x => x !== id)})}><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="flex items-center gap-2"><Zap className="h-4 w-4" /> Quantity Discounts</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Min Qty" type="number" value={newQtyDiscount.minQty} onChange={e => setNewQtyDiscount({...newQtyDiscount, minQty: e.target.value})} className="h-10 text-xs" />
                        <Input placeholder="Unit Price" type="number" value={newQtyDiscount.price} onChange={e => setNewQtyDiscount({...newQtyDiscount, price: e.target.value})} className="h-10 text-xs" />
                        <Button variant="outline" size="sm" onClick={addQtyDiscount} className="h-10 font-black text-[10px]">Add Rule</Button>
                      </div>
                      <div className="space-y-2">
                        {itemForm.quantityDiscounts?.map((d, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs font-bold">
                            <span>Buy {d.minQty}+ for ${d.discountPrice}/ea</span>
                            <button onClick={() => setItemForm({...itemForm, quantityDiscounts: itemForm.quantityDiscounts.filter((_, idx) => idx !== i)})}><X className="h-3 w-3 text-slate-300" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-rose-600" /><span className="font-black text-sm uppercase text-rose-900">Limited Time Offer</span></div>
                        <Switch checked={itemForm.isLTO} onCheckedChange={v => setItemForm({...itemForm, isLTO: v})} />
                      </div>
                      {itemForm.isLTO && (
                        <div className="space-y-2 animate-in fade-in duration-300">
                          <Label className="text-[10px] uppercase font-bold text-rose-700">Ends On</Label>
                          <Input type="date" value={itemForm.ltoExpiry} onChange={e => setItemForm({...itemForm, ltoExpiry: e.target.value})} className="h-10 bg-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="flex items-center gap-2"><Layers className="h-4 w-4" /> Cross-Sell Items</Label>
                      <Select onValueChange={v => setItemForm({...itemForm, crossSellIds: [...(itemForm.crossSellIds || []), v]})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Add Cross-Sell..." /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {allStoreItems.filter(i => i.id !== editingItemId).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        {itemForm.crossSellIds?.map(id => (
                          <Badge key={id} variant="secondary" className="pl-3 pr-1 py-1 gap-2 rounded-lg bg-blue-50 text-blue-700 border-none">
                            {allStoreItems.find(i => i.id === id)?.name || id}
                            <button onClick={() => setItemForm({...itemForm, crossSellIds: itemForm.crossSellIds.filter(x => x !== id)})}><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-6 mt-0">
                <ImageUploader path={`restaurants/${restaurantId}/items/${editingItemId || 'temp'}`} currentUrl={itemForm.imageUrl} onUploadSuccess={(url) => setItemForm({...itemForm, imageUrl: url})} onDelete={() => setItemForm({...itemForm, imageUrl: ''})} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"><Label>Popular</Label><Switch checked={itemForm.isPopular} onCheckedChange={v => setItemForm({...itemForm, isPopular: v})} /></div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"><Label>Combo Deal</Label><Switch checked={itemForm.isCombo} onCheckedChange={v => setItemForm({...itemForm, isCombo: v})} /></div>
                </div>
              </TabsContent>
            </div>

            <div className="p-8 border-t bg-slate-50/50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} className="rounded-xl h-12 px-8">Cancel</Button>
              <Button className="rounded-xl h-12 px-12 font-black shadow-lg" onClick={handleSaveItem} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Save Changes"}</Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-black">Create Menu Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Category Name</Label><Input value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} className="rounded-xl h-12" /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} className="rounded-xl h-12" /></div>
          </div>
          <DialogFooter><Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={handleSaveMenu} disabled={loading}>Create Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
