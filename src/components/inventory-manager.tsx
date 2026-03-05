
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Search, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Edit3, 
  Trash2, 
  Sparkles,
  DollarSign,
  Tag,
  Utensils,
  X
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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { generateItemDescription } from '@/ai/flows/generate-item-description';
import { ImageUploader } from '@/components/image-uploader';

export function InventoryManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // CRUD State
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main',
    imageUrl: '',
    inventory: '0',
    menuId: '',
    addOns: [] as { name: string, price: number }[]
  });

  const [newAddOn, setNewAddOn] = useState({ name: '', price: '' });

  // Stabilize the upload path to prevent issues during item creation/editing
  const uploadPath = useMemo(() => {
    const id = editingItemId || `new-item-${Date.now()}`;
    return `restaurants/${restaurantId}/inventory/${id}`;
  }, [restaurantId, editingItemId]);

  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const fetchAllItems = async () => {
    if (!firestore || !restaurantId || !menus) return;
    setLoading(true);
    const allItems: any[] = [];
    try {
      for (const menu of menus) {
        const itemsSnap = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', menu.id, 'items'));
        itemsSnap.forEach((itemDoc) => {
          allItems.push({
            ...itemDoc.data(),
            id: itemDoc.id,
            menuId: menu.id,
            menuName: menu.name
          });
        });
      }
      setItems(allItems);
    } catch (e) {
      console.error("Error fetching inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (menus) fetchAllItems();
  }, [menus]);

  const updateStock = async (menuId: string, itemId: string, newCount: number) => {
    if (!firestore || !restaurantId) return;
    setUpdatingId(itemId);
    try {
      const itemRef = doc(firestore, 'restaurants', restaurantId, 'menus', menuId, 'items', itemId);
      await updateDoc(itemRef, {
        inventory: Math.max(0, newCount),
        updatedAt: serverTimestamp()
      });
      
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, inventory: Math.max(0, newCount) } : item
      ));
      
      toast({ title: "Stock Updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    } finally {
      setUpdatingId(null);
    }
  };

  const addAddOn = () => {
    if (!newAddOn.name || !newAddOn.price) return;
    setItemForm(prev => ({
      ...prev,
      addOns: [...(prev.addOns || []), { name: newAddOn.name, price: parseFloat(newAddOn.price) }]
    }));
    setNewAddOn({ name: '', price: '' });
  };

  const removeAddOn = (idx: number) => {
    setItemForm(prev => ({
      ...prev,
      addOns: prev.addOns.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveItem = async () => {
    if (!firestore || !restaurantId || !itemForm.menuId || !itemForm.name) {
      toast({ variant: "destructive", title: "Missing Information", description: "Name and Menu Selection are required." });
      return;
    }
    setIsProcessing(true);
    try {
      const data = {
        name: itemForm.name,
        description: itemForm.description,
        price: parseFloat(itemForm.price) || 0,
        category: itemForm.category,
        imageUrl: itemForm.imageUrl,
        inventory: parseInt(itemForm.inventory) || 0,
        addOns: itemForm.addOns || [],
        updatedAt: serverTimestamp()
      };

      if (editingItemId) {
        await updateDoc(doc(firestore, 'restaurants', restaurantId, 'menus', itemForm.menuId, 'items', editingItemId), data);
        toast({ title: "Item Updated" });
      } else {
        await addDoc(collection(firestore, 'restaurants', restaurantId, 'menus', itemForm.menuId, 'items'), {
          ...data,
          createdAt: serverTimestamp()
        });
        toast({ title: "Item Created" });
      }
      
      setIsItemDialogOpen(false);
      resetForm();
      fetchAllItems();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!firestore || !restaurantId || !window.confirm(`Delete ${item.name}? This action cannot be undone.`)) return;
    try {
      await deleteDoc(doc(firestore, 'restaurants', restaurantId, 'menus', item.menuId, 'items', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "Item Removed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Failed" });
    }
  };

  const handleAiDescription = async () => {
    if (!itemForm.name) return;
    setIsProcessing(true);
    try {
      const { description } = await generateItemDescription({ itemName: itemForm.name });
      setItemForm(prev => ({ ...prev, description }));
      toast({ title: "AI Description Generated" });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setItemForm({
      name: '',
      description: '',
      price: '',
      category: 'Main',
      imageUrl: '',
      inventory: '0',
      menuId: menus?.[0]?.id || '',
      addOns: []
    });
    setEditingItemId(null);
  };

  const openEdit = (item: any) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price?.toString() || '0',
      category: item.category || 'Main',
      imageUrl: item.imageUrl || '',
      inventory: item.inventory?.toString() || '0',
      menuId: item.menuId,
      addOns: item.addOns || []
    });
    setIsItemDialogOpen(true);
  };

  const getStatus = (count: number) => {
    if (count <= 0) return { label: 'Out of Stock', color: 'bg-rose-100 text-rose-700', icon: AlertTriangle };
    if (count <= 5) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const inventory = item.inventory || 0;
    if (filterStatus === 'low') return matchesSearch && inventory > 0 && inventory <= 5;
    if (filterStatus === 'out') return matchesSearch && inventory <= 0;
    return matchesSearch;
  });

  if (loadingMenus || (loading && items.length === 0)) {
    return <div className="p-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 w-14 h-14 rounded-2xl flex items-center justify-center text-primary shadow-xl border border-primary/10">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Inventory Control</h2>
            <p className="text-slate-400 text-sm font-medium">Bulk management of stock levels and items.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search inventory..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/20"
            />
          </div>
          <div className="flex bg-white/10 p-1 rounded-xl gap-1">
            {(['all', 'low', 'out'] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filterStatus === s ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Button onClick={() => { resetForm(); setIsItemDialogOpen(true); }} className="rounded-2xl h-12 px-6 shadow-xl bg-primary hover:bg-primary/90 text-white font-black">
            <Plus className="mr-2 h-4 w-4" /> New Inventory Item
          </Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Details</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map(item => {
                  const inventory = item.inventory || 0;
                  const status = getStatus(inventory);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border">
                            <img 
                              src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} 
                              className="w-full h-full object-cover" 
                              alt={item.name} 
                            />
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">{item.menuName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold uppercase text-[9px] tracking-widest">
                          {item.category || 'Uncategorized'}
                        </Badge>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg border-slate-200"
                            disabled={updatingId === item.id || inventory <= 0}
                            onClick={() => updateStock(item.menuId, item.id, inventory - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-lg font-black w-8 text-center">{inventory}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg border-slate-200"
                            disabled={updatingId === item.id}
                            onClick={() => updateStock(item.menuId, item.id, inventory + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", status.color)}>
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="rounded-full text-slate-400 hover:text-primary">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item)} className="rounded-full text-slate-400 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-24 text-center">
                      <div className="space-y-4">
                        <Package className="h-16 w-16 mx-auto opacity-10 text-slate-400" />
                        <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">No matching inventory records</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Item Create/Edit Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingItemId ? 'Edit Inventory Item' : 'New Inventory Item'}</DialogTitle>
            <DialogDescription>Define the core parameters and stock levels for this menu item.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 max-h-[60vh] overflow-y-auto no-scrollbar">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Menu Assignment</Label>
                <Select 
                  disabled={!!editingItemId} 
                  value={itemForm.menuId} 
                  onValueChange={(v) => setItemForm({...itemForm, menuId: v})}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
                    <SelectValue placeholder="Select target menu..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {menus?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Utensils className="h-3 w-3" /> Item Name</Label>
                <Input 
                  value={itemForm.name} 
                  onChange={e => setItemForm({...itemForm, name: e.target.value})} 
                  placeholder="e.g. Signature Ribeye" 
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label><DollarSign className="h-3 w-3 inline mr-1" />Price</Label>
                  <Input 
                    type="number" 
                    value={itemForm.price} 
                    onChange={e => setItemForm({...itemForm, price: e.target.value})} 
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label><Package className="h-3 w-3 inline mr-1" />Initial Stock</Label>
                  <Input 
                    type="number" 
                    value={itemForm.inventory} 
                    onChange={e => setItemForm({...itemForm, inventory: e.target.value})} 
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Tag className="h-3 w-3" /> Category</Label>
                <Input 
                  value={itemForm.category} 
                  onChange={e => setItemForm({...itemForm, category: e.target.value})} 
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-4 border-t pt-6">
                <Label className="flex items-center gap-2">
                  <Plus className="h-3 w-3" /> Add-ons & Options
                </Label>
                <div className="space-y-2">
                  {itemForm.addOns?.map((addon, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-sm">{addon.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">+${addon.price}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-rose-500" onClick={() => removeAddOn(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    placeholder="Option Name" 
                    value={newAddOn.name} 
                    onChange={e => setNewAddOn({...newAddOn, name: e.target.value})}
                    className="h-9 text-xs"
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                      <Input 
                        placeholder="Price" 
                        type="number"
                        value={newAddOn.price}
                        onChange={e => setNewAddOn({...newAddOn, price: e.target.value})}
                        className="h-9 text-xs pl-6"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={addAddOn} className="h-9 font-black uppercase text-[9px]">Add</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Description</Label>
                  <Button variant="link" size="sm" onClick={handleAiDescription} className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1">
                    <Sparkles className="h-3 w-3" /> AI Write
                  </Button>
                </div>
                <Textarea 
                  value={itemForm.description} 
                  onChange={e => setItemForm({...itemForm, description: e.target.value})} 
                  placeholder="Describe ingredients..." 
                  className="rounded-xl min-h-[100px]"
                />
              </div>
            </div>

            <div className="space-y-6">
              <ImageUploader 
                label="Item Visual"
                path={uploadPath}
                currentUrl={itemForm.imageUrl}
                onUploadSuccess={(url) => setItemForm({...itemForm, imageUrl: url})}
                onDelete={() => setItemForm({...itemForm, imageUrl: ''})}
              />

              <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest">Inventory Integrity</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Changes made here will affect the global catalog and live customer storefront immediately.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} className="rounded-2xl h-12">Cancel</Button>
            <Button className="h-12 rounded-2xl px-10 font-black shadow-xl" onClick={handleSaveItem} disabled={isProcessing || !itemForm.name || !itemForm.menuId}>
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : editingItemId ? <CheckCircle2 className="mr-2" /> : <Plus className="mr-2" />}
              {editingItemId ? 'Update Inventory' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
