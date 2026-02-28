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
  LogOut
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
  
  // Safety Redirect for logged out users
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/auth/login');
    }
  }, [authLoading, authUser, router]);

  // 1. Fetch User Profile to get restaurantId
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile, error: profileError } = useDoc(userProfileRef);
  
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  // 2. Fetch Restaurant Tenant Data
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
        toast({ title: "Created", description: "New menu item added." });
      }
      setIsItemDialogOpen(false);
      setEditingItemId(null);
      setItemForm({ name: '', price: '', category: 'Main', isAvailable: true });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore || !effectiveRestaurantId) return;
    try {
      await deleteDoc(doc(firestore, 'restaurants', effectiveRestaurantId, 'menu', id));
      toast({ title: "Deleted", description: "Item removed from menu." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
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
          <p className="font-bold text-lg">Validating Credentials...</p>
          <p className="text-sm text-muted-foreground italic">Syncing with your secure restaurant instance</p>
        </div>
        
        {showTimeout && (
          <div className="pt-8 space-y-4 animate-in fade-in duration-1000">
            <p className="text-sm text-destructive font-medium flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" /> This is taking longer than usual...
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry Connection
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-destructive/10 p-6 rounded-full">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Authentication Error</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn't verify your access permissions. This might happen if your account isn't fully set up yet.
          </p>
        </div>
        <Button onClick={handleSignOut} variant="outline">Return to Login</Button>
      </div>
    );
  }

  if (!effectiveRestaurantId && !loadingProfile) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-slate-100 p-6 rounded-full">
          <ShieldAlert className="h-12 w-12 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground">No restaurant is linked to this account.</p>
        </div>
        <Button onClick={() => router.push('/super-admin/dashboard')} variant="outline">
          Return to Platform Center
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-primary/5">
            <Utensils className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{restaurant?.name || "Merchant Dashboard"}</h1>
            {/* Hydration fix: use div instead of p for container with complex children */}
            <div className="text-muted-foreground text-sm font-medium flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest h-5">{userProfile?.role || 'Admin'}</Badge>
              <span>•</span>
              <span>Tenant ID: {effectiveRestaurantId}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" asChild className="rounded-xl h-12 px-6 shadow-sm group">
          <Link href={`/customer/${effectiveRestaurantId}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" /> 
            View Public Storefront
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-slate-100/50 border p-1 rounded-2xl h-14">
          <TabsTrigger value="overview" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="menu" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Menu Catalog</TabsTrigger>
          <TabsTrigger value="design" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Brand Designer</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Store Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 pb-2"><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Menu items</CardTitle></CardHeader>
              <CardContent className="pt-4"><div className="text-4xl font-black text-primary">{menuItems?.length || 0}</div></CardContent>
            </Card>
            <Card className="border-none shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 pb-2"><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Live Status</CardTitle></CardHeader>
              <CardContent className="pt-4"><Badge className="bg-emerald-500 hover:bg-emerald-600">Active Tenant</Badge></CardContent>
            </Card>
            <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-primary text-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-black uppercase tracking-widest text-white/70">Availability</CardTitle></CardHeader>
              <CardContent className="pt-4"><div className="text-2xl font-bold">Online Now</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4 py-8">
              <div>
                <CardTitle className="text-2xl font-black">Menu Catalog</CardTitle>
                <CardDescription className="text-slate-500 font-medium">Direct management of items in your tenant subcollection.</CardDescription>
              </div>
              <Button onClick={() => { setEditingItemId(null); setItemForm({ name: '', price: '', category: 'Main', isAvailable: true }); setIsItemDialogOpen(true); }} className="rounded-xl h-12 px-6 shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Add New Dish
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {loadingMenu ? (
                <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
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
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm" onClick={() => { setEditingItemId(item.id); setItemForm({ name: item.name, price: item.price.toString(), category: item.category, isAvailable: item.isAvailable }); setIsItemDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/5 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {(!menuItems || menuItems.length === 0) && (
                    <div className="col-span-2 py-20 text-center space-y-4">
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <ShoppingBag className="h-10 w-10 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-medium italic">Your menu catalog is currently empty.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="pt-4 animate-in fade-in duration-500">
          <DesignSystemEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>
        
        <TabsContent value="settings" className="pt-4 animate-in fade-in duration-500">
          <OperatingHoursEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>
      </Tabs>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingItemId ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
            <DialogDescription>Fill out the details for your dish below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Item Name</Label>
              <Input className="h-12 rounded-xl bg-slate-50 border-none" placeholder="e.g. Classic Margherita" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Price ($)</Label>
                <Input className="h-12 rounded-xl bg-slate-50 border-none" type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Category</Label>
                <Input className="h-12 rounded-xl bg-slate-50 border-none" placeholder="e.g. Mains" value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} />
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
  return <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}><DashboardContent /></Suspense>;
}
