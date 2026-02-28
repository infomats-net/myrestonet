
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
  ShoppingBag
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { DesignSystemEditor } from '@/components/design-system-editor';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const activeTab = searchParams.get('tab') || 'overview';
  
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const { toast } = useToast();
  
  // 1. Fetch User Profile to get restaurantId
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);
  
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

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/restaurant-admin/dashboard?${params.toString()}`, { scroll: false });
  };

  const handleSaveMenuItem = async () => {
    if (!firestore || !effectiveRestaurantId || !itemForm.name) return;
    setIsSaving(true);
    try {
      const menuCol = collection(firestore, 'restaurants', effectiveRestaurantId, 'menu');
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

  if (authLoading || loadingProfile) return <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p>Verifying Identity...</p></div>;

  if (!effectiveRestaurantId && !loadingProfile) {
    return <div className="p-20 text-center"><ShieldAlert className="h-12 w-12 mx-auto text-destructive" /><h2 className="text-xl font-bold mt-4">Access Restricted</h2><p>No restaurant linked to your account.</p></div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">{restaurant?.name || "Loading..."}</h1>
          <p className="text-muted-foreground text-sm">Tenant ID: {effectiveRestaurantId}</p>
        </div>
        <Button variant="outline" asChild><Link href={`/customer/${effectiveRestaurantId}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> Storefront</Link></Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-white border p-1 rounded-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="menu">Menu Catalog</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardHeader><CardTitle>Total Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{menuItems?.length || 0}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Status</CardTitle></CardHeader><CardContent><Badge>Live</Badge></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="pt-4 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Menu Items</CardTitle><CardDescription>Directly managed in tenant subcollection.</CardDescription></div>
              <Button onClick={() => { setEditingItemId(null); setItemForm({ name: '', price: '', category: 'Main', isAvailable: true }); setIsItemDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
            </CardHeader>
            <CardContent>
              {loadingMenu ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                <div className="space-y-2">
                  {menuItems?.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50">
                      <div><p className="font-bold">{item.name}</p><p className="text-xs text-muted-foreground">${item.price} • {item.category}</p></div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItemId(item.id); setItemForm({ name: item.name, price: item.price.toString(), category: item.category, isAvailable: item.isAvailable }); setIsItemDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="pt-4"><DesignSystemEditor restaurantId={effectiveRestaurantId!} /></TabsContent>
        <TabsContent value="settings" className="pt-4">
          <Card><CardHeader><CardTitle>Tenant Configuration</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Admin: {restaurant?.adminUserId}</p></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItemId ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Item Name</Label><Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price</Label><Input type="number" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveMenuItem} disabled={isSaving}>{isSaving ? "Saving..." : "Save Item"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RestaurantAdminDashboard() {
  return <Suspense fallback={<Loader2 className="animate-spin" />}><DashboardContent /></Suspense>;
}
