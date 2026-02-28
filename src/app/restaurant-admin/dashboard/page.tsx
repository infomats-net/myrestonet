
"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  RefreshCw,
  LogOut,
  CreditCard
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
  const [showTimeout, setShowTimeout] = useState(false);
  
  // 1. Fetch User Profile from strict users collection
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile, error: profileError } = useDoc(userProfileRef);
  
  // Safety Redirect for logged out users or those without profiles
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/auth/login');
    }
  }, [authLoading, authUser, router]);

  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  // 2. Fetch Restaurant Tenant Data (Nested architecture)
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 3. Fetch Nested Menu Items
  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'menu');
  }, [firestore, effectiveRestaurantId]);

  const { data: menuItems, isLoading: loadingMenu } = useCollection(menuQuery);

  // 4. Fetch Nested Orders
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'orders');
  }, [firestore, effectiveRestaurantId]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'Main', isAvailable: true });

  // Safety Timeout for Loading State
  useEffect(() => {
    if (authLoading || loadingProfile) {
      const timer = setTimeout(() => setShowTimeout(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowTimeout(false);
    }
  }, [authLoading, loadingProfile]);

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
        const ref = doc(firestore, 'restaurants', effectiveRestaurantId, 'menu', editingItemId);
        await updateDoc(ref, data);
        toast({ title: "Updated", description: "Menu item has been updated." });
      } else {
        const menuCol = collection(firestore, 'restaurants', effectiveRestaurantId, 'menu');
        await addDoc(menuCol, { ...data, createdAt: new Date().toISOString() });
        toast({ title: "Created", description: "New menu item added to catalog." });
      }
      setIsItemDialogOpen(false);
      setEditingItemId(null);
      setItemForm({ name: '', price: '', category: 'Main', isAvailable: true });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Access Denied", description: "You don't have permission to modify this menu." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore || !effectiveRestaurantId) return;
    try {
      await deleteDoc(doc(firestore, 'restaurants', effectiveRestaurantId, 'menu', id));
      toast({ title: "Deleted", description: "Item removed from catalog." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Forbidden", description: "Insufficient permissions to delete items." });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/auth/login');
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="font-bold text-lg">Verifying Access...</p>
          <p className="text-sm text-muted-foreground italic">Retrieving tenant-scoped credentials</p>
        </div>
        
        {showTimeout && (
          <div className="pt-8 space-y-4">
            <p className="text-sm text-destructive font-medium flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" /> Identity sync is taking longer than usual...
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (profileError || (!effectiveRestaurantId && !loadingProfile)) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-destructive/10 p-6 rounded-full"><ShieldAlert className="h-12 w-12 text-destructive" /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Multi-tenant Isolation Active</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You do not have an active restaurant assigned to your profile, or access was denied by security rules.
          </p>
        </div>
        <Button onClick={handleSignOut} variant="outline">Return to Login</Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary border border-primary/5">
            <Utensils className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{restaurant?.name || "Merchant Portal"}</h1>
            <div className="text-muted-foreground text-sm font-medium flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest h-5">
                {userProfile?.role?.replace('_', ' ') || 'Admin'}
              </Badge>
              <span>•</span>
              <span className="font-mono text-[10px]">{effectiveRestaurantId}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" asChild className="rounded-xl h-12 px-6 group shadow-sm">
          <Link href={`/customer/${effectiveRestaurantId}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" /> 
            Live Storefront
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-slate-100/50 border p-1 rounded-2xl h-14">
          <TabsTrigger value="overview" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="menu" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Menu Catalog</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Orders</TabsTrigger>
          <TabsTrigger value="design" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Design</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 pb-2"><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Total Items</CardTitle></CardHeader>
              <CardContent className="pt-4"><div className="text-4xl font-black text-primary">{menuItems?.length || 0}</div></CardContent>
            </Card>
            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 pb-2"><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Live Orders</CardTitle></CardHeader>
              <CardContent className="pt-4"><div className="text-4xl font-black text-blue-600">{orders?.length || 0}</div></CardContent>
            </Card>
            <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-primary text-white">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase tracking-widest text-white/70">Tenant Status</CardTitle></CardHeader>
              <CardContent className="pt-4"><div className="text-2xl font-bold uppercase">{restaurant?.subscriptionStatus || 'Active'}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4 py-8">
              <div>
                <CardTitle className="text-2xl font-black">Menu Catalog</CardTitle>
                <CardDescription>Manage your restaurant's nested menu items.</CardDescription>
              </div>
              <Button onClick={() => { setEditingItemId(null); setItemForm({ name: '', price: '', category: 'Main', isAvailable: true }); setIsItemDialogOpen(true); }} className="rounded-xl h-12 px-6 shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Add Dish
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems?.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-5 border rounded-2xl bg-slate-50/30 hover:border-primary/20 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-sm border group-hover:bg-primary/5 transition-colors">
                        <Utensils className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">${item.price} • {item.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-white" onClick={() => { setEditingItemId(item.id); setItemForm({ name: item.name, price: item.price.toString(), category: item.category, isAvailable: item.isAvailable }); setIsItemDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                {(!menuItems || menuItems.length === 0) && (
                  <div className="col-span-2 py-20 text-center text-muted-foreground italic">No menu items found in this tenant.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-8">
              <CardTitle className="text-2xl font-black">Tenant Orders</CardTitle>
              <CardDescription>Live incoming orders for your specific restaurant instance.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {orders?.map(order => (
                  <div key={order.id} className="p-4 border rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-bold">Order #{order.id.slice(-6)}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">${order.totalAmount}</p>
                      <Badge variant="secondary">{order.status}</Badge>
                    </div>
                  </div>
                ))}
                {(!orders || orders.length === 0) && (
                  <div className="py-20 text-center text-muted-foreground italic">No orders received yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <DesignSystemEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>
        
        <TabsContent value="settings">
          <OperatingHoursEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>
      </Tabs>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingItemId ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
            <DialogDescription>Store this item in the restaurant's secure menu subcollection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Item Name</Label>
              <Input className="h-12 rounded-xl bg-slate-50 border-none" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Price ($)</Label>
                <Input className="h-12 rounded-xl bg-slate-50 border-none" type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Category</Label>
                <Input className="h-12 rounded-xl bg-slate-50 border-none" value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={handleSaveMenuItem} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingItemId ? "Update Dish" : "Create Dish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RestaurantAdminDashboard() {
  return (
    <Suspense fallback={<div className="p-20 flex justify-center h-full items-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
