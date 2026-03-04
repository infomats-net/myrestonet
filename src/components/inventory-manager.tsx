'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpDown,
  Plus,
  Minus,
  Save,
  Filter
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function InventoryManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch all menus first to get their IDs
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  // Load all items from all menus
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 w-14 h-14 rounded-2xl flex items-center justify-center text-primary shadow-xl border border-primary/10">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Stock Control</h2>
            <p className="text-slate-400 text-sm font-medium">Monitor and manage real-time item availability.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/20"
            />
          </div>
          <div className="flex bg-white/10 p-1 rounded-xl gap-1">
            {(['all', 'low', 'out'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filterStatus === s ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                {s === 'all' ? 'All' : s === 'low' ? 'Low' : 'Out'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Menu Item</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Category / Menu</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Current Stock</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map(item => {
                  const inventory = item.inventory || 0;
                  const status = getStatus(inventory);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border">
                            <img 
                              src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} 
                              className="w-full h-full object-cover" 
                              alt={item.name} 
                            />
                          </div>
                          <span className="font-black text-slate-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold uppercase text-[9px] tracking-widest">
                            {item.category || 'Uncategorized'}
                          </Badge>
                          <p className="text-[10px] text-slate-400 font-medium italic">{item.menuName}</p>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-xl font-black text-slate-900">{inventory}</span>
                      </td>
                      <td className="p-6">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", status.color)}>
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-slate-200"
                            disabled={updatingId === item.id || inventory <= 0}
                            onClick={() => updateStock(item.menuId, item.id, inventory - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input 
                            type="number"
                            className="w-16 h-9 rounded-xl text-center font-bold bg-slate-50"
                            value={inventory}
                            onChange={(e) => updateStock(item.menuId, item.id, parseInt(e.target.value) || 0)}
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-slate-200"
                            disabled={updatingId === item.id}
                            onClick={() => updateStock(item.menuId, item.id, inventory + 1)}
                          >
                            <Plus className="h-4 w-4" />
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
                        <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">No items found</p>
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
  );
}
