
"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Utensils, 
  Settings, 
  Clock,
  Save,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ShieldAlert,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  Truck,
  DollarSign,
  ChevronRight,
  ListFilter
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { doc, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { DesignSystemEditor } from '@/components/design-system-editor';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function DashboardContent() {
  const router = useRouter();
  const auth = useAuth();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const activeTab = searchParams.get('tab') || 'overview';
  
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const { toast } = useToast();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);
  
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // Menus (Containers)
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'menus');
  }, [firestore, effectiveRestaurantId]);
  const { data: menus } = useCollection(menusQuery);

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

  // Menu Items (for selected menu)
  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId || !selectedMenuId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'menus', selectedMenuId, 'items');
  }, [firestore, effectiveRestaurantId, selectedMenuId]);
  const { data: menuItems } = useCollection(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'orders');
  }, [firestore, effectiveRestaurantId]);
  const { data: orders } = useCollection(ordersQuery);

  // Dialog States
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', description: '', isAvailable: true });

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'Main', isAvailable: true });

  const [isSaving, setIsSaving] = useState(false);

  const [payDevForm, setPayDevForm] = useState({
    paypal: { enabled: false, clientId: '' },
    cod: { enabled: false },
    delivery: { enabled: true, charge: '0', freeAbove: '' }
  });

  useEffect(() => {
    if (restaurant) {
      setPayDevForm({
        paypal: restaurant.paymentSettings?.paypal || { enabled: false, clientId: '' },
        cod: restaurant.paymentSettings?.cod || { enabled: false },
        delivery: {
          enabled: restaurant.deliverySettings?.deliveryEnabled ?? true,
          charge: restaurant.deliverySettings?.deliveryCharge?.toString() || '0',
          freeAbove: restaurant.deliverySettings?.freeDeliveryAbove?.toString() || ''
        }
      });
    }
  }, [restaurant]);

  useEffect(() => {
    if (menus && menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id);
    }
  }, [menus, selectedMenuId]);

  const handleSaveSettings = async () => {
    if (!firestore || !effectiveRestaurantId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId), {
        paymentSettings: {
          paypal: payDevForm.paypal,
          cod: payDevForm.cod,
        },
        deliverySettings: {
          deliveryEnabled: payDevForm.delivery.enabled,
          deliveryCharge: parseFloat(payDevForm.delivery.charge) || 0,
          freeDeliveryAbove: payDevForm.delivery.freeAbove ? parseFloat(payDevForm.delivery.freeAbove) : null,
        },
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Settings Saved", description: "Updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMenu = async () => {
    if (!firestore || !effectiveRestaurantId || !menuForm.name) return;
    setIsSaving(true);
    try {
      const data = { ...menuForm, updatedAt: new Date().toISOString() };
      if (editingMenuId) {
        await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId, 'menus', editingMenuId), data);
      } else {
        const docRef = await addDoc(collection(firestore, 'restaurants', effectiveRestaurantId, 'menus'), { ...data, createdAt: new Date().toISOString() });
        setSelectedMenuId(docRef.id);
      }
      setIsMenuDialogOpen(false);
      toast({ title: "Success", description: "Menu updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save menu." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMenuItem = async () => {
    if (!firestore || !effectiveRestaurantId || !selectedMenuId || !itemForm.name) return;
    setIsSaving(true);
    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price) || 0,
        updatedAt: new Date().toISOString(),
      };
      if (editingItemId) {
        await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId, 'menus', selectedMenuId, 'items', editingItemId), data);
      } else {
        await addDoc(collection(firestore, 'restaurants', effectiveRestaurantId, 'menus', selectedMenuId, 'items'), { ...data, createdAt: new Date().toISOString() });
      }
      setIsItemDialogOpen(false);
      toast({ title: "Success", description: "Item saved." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save item." });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loadingProfile || loadingRes) {
    return (
      <div className="p-20 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary border border-primary/5">
            <Utensils className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{restaurant?.name}</h1>
            <p className="text-muted-foreground text-sm font-medium">Merchant Dashboard</p>
          </div>
        </div>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href={`/customer/${effectiveRestaurantId}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" /> Live Store
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', v);
        router.push(`/restaurant-admin/dashboard?${params.toString()}`, { scroll: false });
      }} className="space-y-6 w-full">
        <TabsList className="bg-slate-100/50 border p-1 rounded-2xl h-14 w-full flex">
          <TabsTrigger value="overview" className="flex-1 rounded-xl h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="menu" className="flex-1 rounded-xl h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Menus & Items</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 rounded-xl h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Orders</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 rounded-xl h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payment & Delivery</TabsTrigger>
          <TabsTrigger value="design" className="flex-1 rounded-xl h-full font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-none shadow-md">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Total Menus</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-primary">{menus?.length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Total Orders</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-blue-600">{orders?.length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-primary text-white">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Subscription</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold uppercase">{restaurant?.subscriptionStatus}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Menu List Sidebar */}
            <Card className="lg:col-span-1 rounded-[2rem] border-none shadow-xl overflow-hidden h-fit">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black">My Menus</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingMenuId(null); setMenuForm({ name: '', description: '', isAvailable: true }); setIsMenuDialogOpen(true); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <div className="p-4 space-y-2">
                {menus?.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMenuId(m.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left group",
                      selectedMenuId === m.id ? "bg-primary text-white shadow-lg" : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    <span className="font-bold truncate">{m.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-3 w-3" onClick={(e) => { e.stopPropagation(); setEditingMenuId(m.id); setMenuForm({ name: m.name, description: m.description, isAvailable: m.isAvailable }); setIsMenuDialogOpen(true); }} />
                    </div>
                  </button>
                ))}
                {(!menus || menus.length === 0) && (
                  <p className="text-xs text-center text-muted-foreground p-4 italic">No menus created yet.</p>
                )}
              </div>
            </Card>

            {/* Items List Content */}
            <Card className="lg:col-span-3 rounded-[2rem] border-none shadow-xl overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 py-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black">
                    {menus?.find(m => m.id === selectedMenuId)?.name || "Select a Menu"}
                  </CardTitle>
                  <CardDescription>Items in this menu section.</CardDescription>
                </div>
                {selectedMenuId && (
                  <Button onClick={() => { setEditingItemId(null); setItemForm({ name: '', price: '', category: 'Main', isAvailable: true }); setIsItemDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems?.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-2xl bg-white hover:shadow-md transition-shadow">
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">${item.price} • {item.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItemId(item.id); setItemForm({ name: item.name, price: item.price.toString(), category: item.category, isAvailable: item.isAvailable }); setIsItemDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(firestore, 'restaurants', effectiveRestaurantId!, 'menus', selectedMenuId!, 'items', item.id))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {selectedMenuId && (!menuItems || menuItems.length === 0) && (
                    <div className="col-span-full py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl bg-slate-50">
                      No items in this menu yet. Click "Add Item" to begin.
                    </div>
                  )}
                  {!selectedMenuId && (
                    <div className="col-span-full py-12 text-center text-muted-foreground italic">
                      Select a menu from the left to manage items.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="border-b py-8">
              <div className="flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-black">Payment & Delivery</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black flex items-center gap-2"><Truck className="h-5 w-5" /> Delivery Settings</h3>
                  <Switch checked={payDevForm.delivery.enabled} onCheckedChange={(v) => setPayDevForm({...payDevForm, delivery: {...payDevForm.delivery, enabled: v}})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Delivery Charge ($)</Label>
                    <Input type="number" value={payDevForm.delivery.charge} onChange={(e) => setPayDevForm({...payDevForm, delivery: {...payDevForm.delivery, charge: e.target.value}})} disabled={!payDevForm.delivery.enabled} />
                  </div>
                  <div className="space-y-2">
                    <Label>Free Delivery Above ($)</Label>
                    <Input type="number" value={payDevForm.delivery.freeAbove} onChange={(e) => setPayDevForm({...payDevForm, delivery: {...payDevForm.delivery, freeAbove: e.target.value}})} disabled={!payDevForm.delivery.enabled} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-black flex items-center gap-2"><DollarSign className="h-5 w-5" /> Payment Methods</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-2xl">
                    <Label className="font-bold">PayPal</Label>
                    <Switch checked={payDevForm.paypal.enabled} onCheckedChange={(v) => setPayDevForm({...payDevForm, paypal: {...payDevForm.paypal, enabled: v}})} />
                  </div>
                  {payDevForm.paypal.enabled && (
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                      <Label className="text-xs">PayPal Client ID</Label>
                      <Input value={payDevForm.paypal.clientId} onChange={(e) => setPayDevForm({...payDevForm, paypal: {...payDevForm.paypal, clientId: e.target.value}})} />
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 border rounded-2xl">
                    <Label className="font-bold">Cash on Delivery</Label>
                    <Switch checked={payDevForm.cod.enabled} onCheckedChange={(v) => setPayDevForm({...payDevForm, cod: {...payDevForm.cod, enabled: v}})} />
                  </div>
                </div>
              </div>

              <Button className="w-full h-14 rounded-2xl font-bold text-lg" onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <DesignSystemEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>
        
        <TabsContent value="orders">
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-8">
              <CardTitle className="text-2xl font-black">Incoming Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {orders?.map(order => (
                <div key={order.id} className="p-4 border rounded-2xl flex justify-between items-center bg-white hover:shadow-md transition-all">
                  <div>
                    <p className="font-bold">Order #{order.id.slice(-6)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                    <Badge variant="secondary" className="mt-1">{order.status}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-primary">${order.totalAmount.toFixed(2)}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400">{order.paymentMethod}</p>
                  </div>
                </div>
              ))}
              {(!orders || orders.length === 0) && (
                <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">No orders yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Menu Dialog */}
      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black">{editingMenuId ? 'Edit Menu' : 'New Menu'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Menu Name</Label><Input value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} placeholder="e.g. Summer Specials" /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} placeholder="Seasonal fresh dishes..." /></div>
          </div>
          <DialogFooter><Button className="w-full h-12 rounded-xl" onClick={handleSaveMenu} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : "Save Menu"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black">{editingItemId ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Dish Name</Label><Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price ($)</Label><Input type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button className="w-full h-12 rounded-xl" onClick={handleSaveMenuItem} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : "Save Item"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RestaurantAdminDashboard() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
