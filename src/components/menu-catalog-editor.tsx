
'use client';

import { useState } from 'react';
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
  Tag
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
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { generateItemDescription } from '@/ai/flows/generate-item-description';
import { selectPlaceholder } from '@/ai/flows/select-placeholder';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

export function MenuCatalogEditor({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', category: 'Main', imageUrl: '' });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // 1. Fetch Menus
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  // 2. Fetch Items for selected menu
  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId || !selectedMenuId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items');
  }, [firestore, restaurantId, selectedMenuId]);
  const { data: items, isLoading: loadingItems } = useCollection(itemsQuery);

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

  const handleAiMenuDescription = async () => {
    if (!menuForm.name) return;
    setLoading(true);
    try {
      const { description } = await generateItemDescription({ itemName: menuForm.name });
      setMenuForm(prev => ({ ...prev, description }));
      toast({ title: "AI Description Generated" });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!firestore || !restaurantId) return;
    try {
      await deleteDoc(doc(firestore, 'restaurants', restaurantId, 'menus', id));
      if (selectedMenuId === id) setSelectedMenuId(null);
      toast({ title: "Menu Deleted" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
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
      toast({ title: editingItemId ? "Menu Item Updated" : "Menu Item Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore || !restaurantId || !selectedMenuId) return;
    try {
      await deleteDoc(doc(firestore, 'restaurants', restaurantId, 'menus', selectedMenuId, 'items', id));
      toast({ title: "Menu Item Removed" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleAiDescription = async () => {
    if (!itemForm.name) return;
    setLoading(true);
    try {
      const { description } = await generateItemDescription({ itemName: itemForm.name });
      setItemForm(prev => ({ ...prev, description }));
      toast({ title: "AI Description Generated" });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAiImage = async () => {
    if (!itemForm.name) return;
    setLoading(true);
    try {
      // Find the ID of the currently selected image to exclude it and get a variety
      const currentPlaceholderId = PlaceHolderImages.find(p => p.imageUrl === itemForm.imageUrl)?.id;
      
      const { placeholderId } = await selectPlaceholder({ 
        itemName: itemForm.name,
        excludeIds: currentPlaceholderId ? [currentPlaceholderId] : []
      });
      
      const img = PlaceHolderImages.find(p => p.id === placeholderId)?.imageUrl || '';
      setItemForm(prev => ({ ...prev, imageUrl: img }));
      toast({ title: "New Image Option Found" });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setLoading(false);
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
            <p className="text-sm text-slate-400 mt-2">e.g. Lunch Specials, Wine List</p>
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
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-300 hover:text-destructive rounded-full"
                  onClick={(e) => { e.stopPropagation(); handleDeleteMenu(menu.id); }}
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
              <Button onClick={() => setIsItemDialogOpen(true)} className="flex-1 md:flex-none rounded-2xl h-12 px-6 shadow-xl font-black">
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
                  Manage availability and presentation for this menu.
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
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border">
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
                              <Sparkles className="h-4 w-4 text-primary" />
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
                    {(!items || items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-20 text-center">
                          <div className="space-y-4">
                            <Search className="h-12 w-12 mx-auto opacity-10" />
                            <p className="text-slate-400 font-bold italic">No menu items in this menu yet.</p>
                            <Button variant="link" onClick={() => setIsItemDialogOpen(true)}>Add your first item</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Menu Dialog */}
      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">New Menu Catalog</DialogTitle>
            <DialogDescription>Create a container for a category of items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Menu Name</Label>
              <Input 
                value={menuForm.name} 
                onChange={e => setMenuForm({...menuForm, name: e.target.value})} 
                placeholder="e.g. Signature Mains" 
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Description (Optional)</Label>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1"
                  onClick={handleAiMenuDescription}
                  disabled={loading || !menuForm.name}
                >
                  <Sparkles className="h-3 w-3" /> Magic Write
                </Button>
              </div>
              <Textarea 
                value={menuForm.description} 
                onChange={e => setMenuForm({...menuForm, description: e.target.value})} 
                placeholder="Briefly describe what's in this menu..." 
                className="rounded-xl min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black shadow-xl" onClick={handleAddMenu} disabled={loading || !menuForm.name}>
              {loading ? <Loader2 className="animate-spin" /> : "Initialize Menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Input 
                  value={itemForm.name} 
                  onChange={e => setItemForm({...itemForm, name: e.target.value})} 
                  placeholder="e.g. Truffle Pizza" 
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><DollarSign className="h-3 w-3" /> Price</Label>
                  <Input 
                    type="number" 
                    value={itemForm.price} 
                    onChange={e => setItemForm({...itemForm, price: e.target.value})} 
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Tag className="h-3 w-3" /> Category</Label>
                  <Input 
                    value={itemForm.category} 
                    onChange={e => setItemForm({...itemForm, category: e.target.value})} 
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Appetizing Description</Label>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1"
                    onClick={handleAiDescription}
                    disabled={loading || !itemForm.name}
                  >
                    <Sparkles className="h-3 w-3" /> Magic Write
                  </Button>
                </div>
                <Textarea 
                  value={itemForm.description} 
                  onChange={e => setItemForm({...itemForm, description: e.target.value})} 
                  placeholder="Describe ingredients and preparation..." 
                  className="rounded-xl min-h-[120px] text-sm"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Visual Representation</Label>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1"
                    onClick={handleAiImage}
                    disabled={loading || !itemForm.name}
                  >
                    <ImageIcon className="h-3 w-3" /> Auto-Image
                  </Button>
                </div>
                <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                  {itemForm.imageUrl ? (
                    <img src={itemForm.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <ImageIcon className="h-8 w-8 mx-auto text-slate-300" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Image Preview</p>
                    </div>
                  )}
                </div>
                <Input 
                  value={itemForm.imageUrl} 
                  onChange={e => setItemForm({...itemForm, imageUrl: e.target.value})} 
                  placeholder="Paste image URL here..." 
                  className="h-10 text-xs rounded-xl mt-4"
                />
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" /> Live Store Update
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Saving this item will immediately update your public storefront for all active customers.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} className="rounded-2xl h-12">Cancel</Button>
            <Button className="h-12 rounded-2xl px-10 font-black shadow-xl" onClick={handleSaveItem} disabled={loading || !itemForm.name}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
              {editingItemId ? 'Update Menu Item' : 'Add Menu Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
