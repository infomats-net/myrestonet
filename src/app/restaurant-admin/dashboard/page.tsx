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
  DollarSign
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { doc, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { DesignSystemEditor } from '@/components/design-system-editor';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import Link from 'next/link';

function DashboardContent() {
  const router = useRouter();
  const auth = useAuth();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const activeTab = searchParams.get('tab') || 'overview';
  
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const { toast } = useToast();
  
  // 1. Fetch User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);
  
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  // 2. Fetch Restaurant Data
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 3. Fetch Menu Items
  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'menu');
  }, [firestore, effectiveRestaurantId]);

  const { data: menuItems } = useCollection(menuQuery);

  // 4. Fetch Orders
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'orders');
  }, [firestore, effectiveRestaurantId]);

  const { data: orders } = useCollection(ordersQuery);

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'Main', isAvailable: true });

  // Payment & Delivery Form State
  const [payDevForm, setPayDevForm] = useState({
    stripe: { enabled: false, publishableKey: '', accountId: '' },
    paypal: { enabled: false, clientId: '' },
    cod: { enabled: false },
    delivery: { enabled: true, charge: '0', freeAbove: '' }
  });

  useEffect(() => {
    if (restaurant) {
      setPayDevForm({
        stripe: restaurant.paymentSettings?.stripe || { enabled: false, publishableKey: '', accountId: '' },
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

  const handleSaveSettings = async () => {
    if (!firestore || !effectiveRestaurantId) return;
    setIsSaving(true);
    try {
      // Validations
      if (payDevForm.stripe.enabled && !payDevForm.stripe.publishableKey) {
        throw new Error("Stripe requires a Publishable Key");
      }
      if (payDevForm.paypal.enabled && !payDevForm.paypal.clientId) {
        throw new Error("PayPal requires a Client ID");
      }

      await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId), {
        paymentSettings: {
          stripe: payDevForm.stripe,
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
      toast({ title: "Settings Saved", description: "Payment and delivery options updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/restaurant-admin/dashboard?${params.toString()}`, { scroll: false });
  };

  const handleSaveMenuItem = async () => {
    if (!firestore || !effectiveRestaurantId || !itemForm.name) return;
    setIsSaving(true);
    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price) || 0,
        updatedAt: new Date().toISOString(),
      };

      if (editingItemId) {
        await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId, 'menu', editingItemId), data);
        toast({ title: "Updated", description: "Menu item updated." });
      } else {
        await addDoc(collection(firestore, 'restaurants', effectiveRestaurantId, 'menu'), { ...data, createdAt: new Date().toISOString() });
        toast({ title: "Added", description: "Menu item added." });
      }
      setIsItemDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save menu item." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/auth/login');
  };

  if (authLoading || loadingProfile || loadingRes) {
    return (
      <div className="p-20 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold text-lg">Loading Dashboard...</p>
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
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">{effectiveRestaurantId}</p>
          </div>
        </div>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href={`/customer/${effectiveRestaurantId}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" /> Live Store
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-slate-100/50 border p-1 rounded-2xl h-14">
          <TabsTrigger value="overview" className="flex-1 rounded-xl h-full">Overview</TabsTrigger>
          <TabsTrigger value="menu" className="flex-1 rounded-xl h-full">Menu</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 rounded-xl h-full">Orders</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 rounded-xl h-full">Payment & Delivery</TabsTrigger>
          <TabsTrigger value="design" className="flex-1 rounded-xl h-full">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-none shadow-md">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Total Dishes</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-primary">{menuItems?.length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Orders</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-blue-600">{orders?.length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-primary text-white">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Status</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold uppercase">{restaurant?.subscriptionStatus}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b py-8">
              <div>
                <CardTitle className="text-2xl font-black">Menu Catalog</CardTitle>
                <CardDescription>Add and manage your tenant-specific dishes.</CardDescription>
              </div>
              <Button onClick={() => { setEditingItemId(null); setItemForm({ name: '', price: '', category: 'Main', isAvailable: true }); setIsItemDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems?.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-2xl bg-slate-50/50">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price} • {item.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItemId(item.id); setItemForm({ name: item.name, price: item.price.toString(), category: item.category, isAvailable: item.isAvailable }); setIsItemDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(firestore, 'restaurants', effectiveRestaurantId!, 'menu', item.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="border-b py-8">
              <div className="flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-black">Payment & Delivery Settings</CardTitle>
              </div>
              <CardDescription>Configure how your customers pay and how delivery is calculated.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              {/* Delivery Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black flex items-center gap-2"><Truck className="h-5 w-5" /> Delivery Options</h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="del-enabled" className="text-xs font-bold uppercase">Enable Delivery</Label>
                    <Switch id="del-enabled" checked={payDevForm.delivery.enabled} onCheckedChange={(v) => setPayDevForm({...payDevForm, delivery: {...payDevForm.delivery, enabled: v}})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Standard Delivery Charge ($)</Label>
                    <Input type="number" step="0.01" value={payDevForm.delivery.charge} onChange={(e) => setPayDevForm({...payDevForm, delivery: {...payDevForm.delivery, charge: e.target.value}})} disabled={!payDevForm.delivery.enabled} />
                  </div>
                  <div className="space-y-2">
                    <Label>Free Delivery Threshold ($)</Label>
                    <Input type="number" step="0.01" placeholder="e.g. 50" value={payDevForm.delivery.freeAbove} onChange={(e) => setPayDevForm({...payDevForm, delivery: {...payDevForm.delivery, freeAbove: e.target.value}})} disabled={!payDevForm.delivery.enabled} />
                    <p className="text-[10px] text-muted-foreground italic">Orders above this amount will have $0 delivery fee.</p>
                  </div>
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="space-y-8">
                <h3 className="text-lg font-black flex items-center gap-2"><DollarSign className="h-5 w-5" /> Payment Methods</h3>
                
                <div className="grid gap-6">
                  {/* Stripe */}
                  <Card className="p-6 border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg"><CreditCard className="h-5 w-5 text-blue-600" /></div>
                        <div>
                          <p className="font-bold">Stripe Payments</p>
                          <p className="text-xs text-muted-foreground">Accept credit cards securely.</p>
                        </div>
                      </div>
                      <Switch checked={payDevForm.stripe.enabled} onCheckedChange={(v) => setPayDevForm({...payDevForm, stripe: {...payDevForm.stripe, enabled: v}})} />
                    </div>
                    {payDevForm.stripe.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold">Publishable Key</Label>
                          <Input value={payDevForm.stripe.publishableKey} onChange={(e) => setPayDevForm({...payDevForm, stripe: {...payDevForm.stripe, publishableKey: e.target.value}})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold">Account ID</Label>
                          <Input value={payDevForm.stripe.accountId} onChange={(e) => setPayDevForm({...payDevForm, stripe: {...payDevForm.stripe, accountId: e.target.value}})} />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* PayPal */}
                  <Card className="p-6 border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600/10 p-2 rounded-lg"><DollarSign className="h-5 w-5 text-blue-700" /></div>
                        <div>
                          <p className="font-bold">PayPal</p>
                          <p className="text-xs text-muted-foreground">Digital wallet payments.</p>
                        </div>
                      </div>
                      <Switch checked={payDevForm.paypal.enabled} onCheckedChange={(v) => setPayDevForm({...payDevForm, paypal: {...payDevForm.paypal, enabled: v}})} />
                    </div>
                    {payDevForm.paypal.enabled && (
                      <div className="space-y-1 animate-in slide-in-from-top-2">
                        <Label className="text-[10px] font-bold">Client ID</Label>
                        <Input value={payDevForm.paypal.clientId} onChange={(e) => setPayDevForm({...payDevForm, paypal: {...payDevForm.paypal, clientId: e.target.value}})} />
                      </div>
                    )}
                  </Card>

                  {/* COD */}
                  <Card className="p-6 border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/10 p-2 rounded-lg"><ShoppingBag className="h-5 w-5 text-emerald-600" /></div>
                        <div>
                          <p className="font-bold">Cash on Delivery</p>
                          <p className="text-xs text-muted-foreground">Customer pays upon arrival.</p>
                        </div>
                      </div>
                      <Switch checked={payDevForm.cod.enabled} onCheckedChange={(v) => setPayDevForm({...payDevForm, cod: {...payDevForm.cod, enabled: v}})} />
                    </div>
                  </Card>
                </div>
              </div>

              <div className="pt-8 border-t">
                <Button className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20" onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                  Save All Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <DesignSystemEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>
        
        <TabsContent value="orders">
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-8">
              <CardTitle className="text-2xl font-black">Orders</CardTitle>
              <CardDescription>Live incoming orders for your specific restaurant.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {orders?.map(order => (
                <div key={order.id} className="p-4 border rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold">Order #{order.id.slice(-6)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                    <p className="text-[10px] font-black uppercase text-primary">{order.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${order.totalAmount}</p>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                </div>
              ))}
              {(!orders || orders.length === 0) && (
                <div className="py-20 text-center text-muted-foreground italic">No orders yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingItemId ? 'Edit Dish' : 'New Dish'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl" onClick={handleSaveMenuItem} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : "Save Item"}
            </Button>
          </DialogFooter>
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
