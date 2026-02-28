
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
  BarChart3, 
  Globe, 
  ShoppingCart, 
  Sparkles,
  TrendingUp,
  Clock,
  Save,
  Loader2,
  Plus,
  Info,
  Trash2,
  Wand2,
  Pencil,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Truck,
  Palette
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAiSalesInsights, AiSalesInsightsOutput } from '@/ai/flows/ai-sales-insights';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { localizedSeoContentGenerator, LocalizedSeoContentOutput } from '@/ai/flows/localized-seo-content';
import { generateItemDescription } from '@/ai/flows/generate-item-description';
import { selectPlaceholder } from '@/ai/flows/select-placeholder';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DesignSystemEditor } from '@/components/design-system-editor';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

function MenuItemManager({ 
  restaurantId, 
  menuId, 
  currency, 
  onEditItem 
}: { 
  restaurantId: string, 
  menuId: string, 
  currency: string, 
  onEditItem: (item: any) => void 
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId || !menuId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus', menuId, 'menuItems');
  }, [firestore, restaurantId, menuId]);

  const { data: items, isLoading } = useCollection(itemsQuery);

  const handleDeleteItem = (itemId: string) => {
    if (!firestore || !restaurantId || !menuId) return;
    const itemRef = doc(firestore, 'restaurants', restaurantId, 'menus', menuId, 'menuItems', itemId);
    
    deleteDoc(itemRef).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: itemRef.path,
        operation: 'delete',
      }));
    });
    
    toast({
      title: "Item Removed",
      description: "The item has been deleted from your catalog.",
    });
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>;

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between px-1">
        <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Menu Items ({items?.length || 0})</h5>
      </div>
      {items && items.length > 0 ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-primary/20 transition-colors shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                  <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} className="w-full h-full object-cover" alt={item.name} />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{currency}{item.price.toFixed(2)} • {item.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => onEditItem(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed">
          <p className="text-xs text-muted-foreground italic">No items added to this menu section yet.</p>
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
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
  
  const effectiveRestaurantId = impersonateId || (userProfile?.role?.toLowerCase() === 'restaurant_admin' ? userProfile.restaurantId : null);

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);
  
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'menus');
  }, [firestore, effectiveRestaurantId]);

  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'orders');
  }, [firestore, effectiveRestaurantId]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);

  const [aiInsights, setAiInsights] = useState<AiSalesInsightsOutput | null>(null);
  const [seoResult, setSeoResult] = useState<LocalizedSeoContentOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Dialog States
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [targetMenuId, setTargetMenuId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    contactPhone: '',
    contactEmail: '',
    cuisine: '',
    deliveryChargeAmount: 0,
    enabledPaymentMethods: ['cash_on_delivery'] as string[]
  });

  // Menu Form State
  const [menuForm, setMenuForm] = useState({ name: '', description: '', isActive: true });
  // Item Form State
  const [itemForm, setItemForm] = useState({ 
    name: '', 
    description: '', 
    price: '', 
    category: 'Main Course', 
    imageUrl: '', 
    isAvailable: true 
  });

  const [seoForm, setSeoForm] = useState({
    restaurantName: '',
    cuisineType: '',
    location: '',
    description: '',
    menuHighlights: 'Chef specials, Seasonal menu',
    websiteUrl: '',
    phoneNumber: '',
    address: '',
    locale: 'en-GB'
  });

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/restaurant-admin/dashboard?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (restaurant) {
      setProfileForm({
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        city: restaurant.city || '',
        country: restaurant.country || '',
        contactPhone: restaurant.contactPhone || '',
        contactEmail: restaurant.contactEmail || '',
        cuisine: Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : (restaurant.cuisine || ''),
        deliveryChargeAmount: restaurant.deliveryChargeAmount || 0,
        enabledPaymentMethods: restaurant.enabledPaymentMethods || ['cash_on_delivery']
      });

      setSeoForm({
        restaurantName: restaurant.name || '',
        cuisineType: Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : '',
        location: `${restaurant.city || ''}, ${restaurant.country || ''}`,
        description: restaurant.description || '',
        menuHighlights: 'Chef specials, Seasonal menu',
        websiteUrl: restaurant.customDomain ? `https://${restaurant.customDomain}` : '',
        phoneNumber: restaurant.contactPhone || '',
        address: restaurant.address || '',
        locale: 'en-GB'
      });
    }
  }, [restaurant]);

  const togglePaymentMethod = (method: string) => {
    setProfileForm(prev => {
      const current = prev.enabledPaymentMethods || [];
      const updated = current.includes(method) 
        ? current.filter(m => m !== method) 
        : [...current, method];
      return { ...prev, enabledPaymentMethods: updated };
    });
  };

  const handleSaveProfile = async () => {
    if (!firestore || !effectiveRestaurantId) return;
    setSavingSettings(true);
    try {
      const restRef = doc(firestore, 'restaurants', effectiveRestaurantId);
      const updateData = {
        name: profileForm.name,
        description: profileForm.description,
        address: profileForm.address,
        city: profileForm.city,
        country: profileForm.country,
        contactPhone: profileForm.contactPhone,
        contactEmail: profileForm.contactEmail,
        cuisine: profileForm.cuisine.split(',').map(c => c.trim()),
        deliveryChargeAmount: Number(profileForm.deliveryChargeAmount),
        enabledPaymentMethods: profileForm.enabledPaymentMethods,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(restRef, updateData);
      toast({ title: "Settings Saved", description: "Your restaurant profile has been updated successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateMenu = () => {
    if (!firestore || !effectiveRestaurantId || !menuForm.name) return;
    setIsCreating(true);

    const menusColRef = collection(firestore, 'restaurants', effectiveRestaurantId, 'menus');
    const newMenuData = {
      restaurantId: effectiveRestaurantId,
      name: menuForm.name,
      description: menuForm.description,
      isActive: menuForm.isActive,
      adminUserIds: restaurant?.adminUserIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addDoc(menusColRef, newMenuData)
      .then(() => {
        toast({
          title: "Menu Created",
          description: `${newMenuData.name} has been added to your catalog.`,
        });
        setIsMenuDialogOpen(false);
        setMenuForm({ name: '', description: '', isActive: true });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: menusColRef.path,
          operation: 'create',
          requestResourceData: newMenuData
        }));
      })
      .finally(() => setIsCreating(false));
  };

  const handleSaveMenuItem = async () => {
    if (!firestore || !effectiveRestaurantId || !targetMenuId || !itemForm.name) return;
    setIsCreating(true);

    let finalImageUrl = itemForm.imageUrl;

    if (!finalImageUrl) {
      try {
        const { placeholderId } = await selectPlaceholder({ itemName: itemForm.name });
        const match = PlaceHolderImages.find(img => img.id === placeholderId);
        if (match) {
          finalImageUrl = match.imageUrl;
        }
      } catch (e) {
        const fallback = PlaceHolderImages.find(img => img.id === 'hero-restaurant');
        if (fallback) finalImageUrl = fallback.imageUrl;
      }
    }

    const newItemData = {
      menuId: targetMenuId,
      name: itemForm.name,
      description: itemForm.description,
      price: parseFloat(itemForm.price) || 0,
      currency: restaurant?.baseCurrency || "USD",
      inventoryLevel: 100,
      category: itemForm.category,
      imageUrl: finalImageUrl,
      isAvailable: itemForm.isAvailable,
      adminUserIds: restaurant?.adminUserIds || [],
      updatedAt: new Date().toISOString(),
    };

    if (editingItemId) {
      const itemDocRef = doc(firestore, 'restaurants', effectiveRestaurantId, 'menus', targetMenuId, 'menuItems', editingItemId);
      updateDoc(itemDocRef, newItemData)
        .then(() => {
          toast({ title: "Item Updated", description: `${newItemData.name} has been updated.` });
          setIsItemDialogOpen(false);
          setEditingItemId(null);
          setItemForm({ name: '', description: '', price: '', category: 'Main Course', imageUrl: '', isAvailable: true });
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: itemDocRef.path,
            operation: 'update',
            requestResourceData: newItemData
          }));
        })
        .finally(() => setIsCreating(false));
    } else {
      const itemsColRef = collection(firestore, 'restaurants', effectiveRestaurantId, 'menus', targetMenuId, 'menuItems');
      const createData = {
        ...newItemData,
        createdAt: new Date().toISOString(),
      };
      addDoc(itemsColRef, createData)
        .then(() => {
          toast({ title: "Item Added", description: `${createData.name} has been created.` });
          setIsItemDialogOpen(false);
          setItemForm({ name: '', description: '', price: '', category: 'Main Course', imageUrl: '', isAvailable: true });
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: itemsColRef.path,
            operation: 'create',
            requestResourceData: createData
          }));
        })
        .finally(() => setIsCreating(false));
    }
  };

  const handleEditItemRequest = (item: any) => {
    setTargetMenuId(item.menuId);
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable
    });
    setIsItemDialogOpen(true);
  };

  const handleDeleteMenu = (menuId: string) => {
    if (!firestore || !effectiveRestaurantId) return;
    const menuRef = doc(firestore, 'restaurants', effectiveRestaurantId, 'menus', menuId);
    deleteDoc(menuRef);
    toast({ title: "Menu Deleted", description: "The menu section has been removed." });
  };

  const generateSeo = async () => {
    if (!firestore || !effectiveRestaurantId) return;
    setLoadingSeo(true);
    try {
      const res = await localizedSeoContentGenerator(seoForm);
      setSeoResult(res);
      toast({ title: "SEO Strategy Generated", description: "AI has optimized your restaurant's digital presence." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "SEO Generation Failed", description: e.message });
    } finally {
      setLoadingSeo(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!itemForm.name) return;
    setGeneratingDescription(true);
    try {
      const { description } = await generateItemDescription({ itemName: itemForm.name, cuisine: restaurant?.cuisine?.[0] || 'Modern' });
      setItemForm(prev => ({ ...prev, description }));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: e.message });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const generateInsights = async () => {
    setLoadingAi(true);
    try {
      const insights = await getAiSalesInsights({ salesData: [] }); // In MVP, raw data might be empty
      setAiInsights(insights);
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Analysis Failed", description: e.message });
    } finally {
      setLoadingAi(false);
    }
  };

  const isTrulyLoading = authLoading || (!!authUser && loadingProfile) || (!!effectiveRestaurantId && loadingRes && !restaurant);

  if (isTrulyLoading) {
    return <div className="flex flex-col items-center justify-center p-20 space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground animate-pulse font-medium">Validating Merchant Credentials...</p></div>;
  }

  if (!restaurant) {
    return <div className="p-20 text-center max-w-md mx-auto space-y-6"><div className="bg-destructive/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-destructive"><Info className="h-10 w-10" /></div><div className="space-y-2"><h2 className="text-2xl font-bold text-primary">Access Restriction</h2><p className="text-muted-foreground">Access Restrictions could not connect with your restaurant.</p></div><Button variant="outline" asChild className="w-full"><Link href="/auth/login">Return to Login</Link></Button></div>;
  }

  const currencySymbol = restaurant?.baseCurrency === 'GBP' ? '£' : '$';

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-headline font-bold text-primary">{restaurant?.name}</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">Active Pro</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{restaurant?.contactEmail} • Location: {restaurant?.city}, {restaurant?.country}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary/5" asChild><Link href={`/customer/${restaurant?.id}`} target="_blank"><ShoppingCart className="mr-2 h-4 w-4" /> View Storefront</Link></Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => handleTabChange('settings')}><Settings className="mr-2 h-4 w-4" /> Store Settings</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-white border p-1 rounded-xl flex overflow-x-auto no-scrollbar h-auto w-full md:w-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Overview</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Orders</TabsTrigger>
          <TabsTrigger value="menu" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Menus</TabsTrigger>
          <TabsTrigger value="hours" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2"><Clock className="h-4 w-4" /> Timing System</TabsTrigger>
          <TabsTrigger value="design" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2"><Palette className="h-4 w-4" /> Design System</TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">SEO Engine</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">AI Insights</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Daily Sales</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{currencySymbol}1,240.50</div><p className="text-xs text-muted-foreground">+8.2% from yesterday</p></CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Open Orders</CardTitle><Clock className="h-4 w-4 text-primary" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{orders?.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length || 0}</div><p className="text-xs text-muted-foreground">Active platform-wide</p></CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Prep Time</CardTitle><Utensils className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">18 min</div><p className="text-xs text-primary font-semibold">Performing optimally</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="design" className="pt-4"><DesignSystemEditor restaurantId={effectiveRestaurantId!} /></TabsContent>
        <TabsContent value="hours" className="pt-4"><OperatingHoursEditor restaurantId={effectiveRestaurantId!} /></TabsContent>

        <TabsContent value="settings" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            <Card className="lg:col-span-2 border-none shadow-lg">
              <CardHeader><CardTitle className="font-headline">Global Profile</CardTitle><CardDescription>Manage your restaurant's identity and location.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label>Restaurant Name</Label><Input value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Cuisines (Comma separated)</Label><Input value={profileForm.cuisine} onChange={(e) => setProfileForm({...profileForm, cuisine: e.target.value})} placeholder="Italian, Pizza, Dessert" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Public Description</Label><Textarea value={profileForm.description} onChange={(e) => setProfileForm({...profileForm, description: e.target.value})} className="min-h-[100px]" /></div>
                  <div className="space-y-2"><Label>Contact Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={profileForm.contactEmail} onChange={(e) => setProfileForm({...profileForm, contactEmail: e.target.value})} /></div></div>
                  <div className="space-y-2"><Label>Contact Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={profileForm.contactPhone} onChange={(e) => setProfileForm({...profileForm, contactPhone: e.target.value})} /></div></div>
                  <div className="space-y-2 md:col-span-2"><Label>Street Address</Label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={profileForm.address} onChange={(e) => setProfileForm({...profileForm, address: e.target.value})} /></div></div>
                  <div className="space-y-2"><Label>City</Label><Input value={profileForm.city} onChange={(e) => setProfileForm({...profileForm, city: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Country</Label><Input value={profileForm.country} onChange={(e) => setProfileForm({...profileForm, country: e.target.value})} /></div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader><CardTitle className="font-headline flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payments & Delivery</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enabled Gateways</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50/50">
                        <div className="flex items-center gap-3"><div className="bg-blue-100 p-2 rounded-lg text-blue-600 font-bold text-[10px]">STRIPE</div><span className="text-sm font-medium">Stripe Payments</span></div>
                        <Switch checked={profileForm.enabledPaymentMethods.includes('stripe')} onCheckedChange={() => togglePaymentMethod('stripe')} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50/50">
                        <div className="flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 font-bold text-[10px]">PAYPAL</div><span className="text-sm font-medium">PayPal</span></div>
                        <Switch checked={profileForm.enabledPaymentMethods.includes('paypal')} onCheckedChange={() => togglePaymentMethod('paypal')} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50/50">
                        <div className="flex items-center gap-3"><div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 font-bold text-[10px]">CASH</div><span className="text-sm font-medium">Cash on Delivery</span></div>
                        <Switch checked={profileForm.enabledPaymentMethods.includes('cash_on_delivery')} onCheckedChange={() => togglePaymentMethod('cash_on_delivery')} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Delivery Charge ({currencySymbol})</Label><Truck className="h-4 w-4 text-muted-foreground" /></div>
                    <Input type="number" step="0.01" value={profileForm.deliveryChargeAmount} onChange={(e) => setProfileForm({...profileForm, deliveryChargeAmount: Number(e.target.value)})} placeholder="0.00" />
                    <p className="text-[10px] text-muted-foreground italic">Flat rate applied to every order.</p>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full h-14 bg-primary hover:bg-primary/90 text-white shadow-lg rounded-2xl font-bold" onClick={handleSaveProfile} disabled={savingSettings}>{savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Publish All Settings</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6 pt-4">
          <Card className="border-none shadow-lg overflow-hidden">
            <CardHeader><CardTitle className="font-headline">Order Management</CardTitle><CardDescription>Track and update active customer orders.</CardDescription></CardHeader>
            <CardContent className="p-0">
              {loadingOrders ? <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : orders && orders.length > 0 ? (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Order ID</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead>Total</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>{orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id.slice(-6).toUpperCase()}</TableCell>
                      <TableCell className="text-xs">{new Date(order.createdAt).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={order.status === 'delivered' ? 'secondary' : 'default'} className="capitalize">{order.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="uppercase text-[9px]">{order.paymentMethod?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="font-bold">{currencySymbol}{order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-primary">Manage</Button></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              ) : <div className="text-center py-20 m-6 border-2 border-dashed rounded-xl"><p className="text-muted-foreground">No orders have been placed yet.</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 pt-4">
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4"><div><CardTitle className="font-headline">Menu Catalog</CardTitle><CardDescription>Manage your active sections and digital catalogue.</CardDescription></div><Button className="bg-primary hover:bg-primary/90 text-white shadow-sm w-full md:w-auto" onClick={() => { setMenuForm({ name: '', description: '', isActive: true }); setIsMenuDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Create New Menu Section</Button></CardHeader>
            <CardContent>{loadingMenus ? <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : menus && menus.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-4">{menus.map((menu) => (
                <AccordionItem key={menu.id} value={menu.id} className="border rounded-xl bg-white px-6 py-2">
                  <AccordionTrigger className="hover:no-underline"><div className="flex flex-1 items-center justify-between text-left pr-4"><div className="flex items-center gap-4"><div className="bg-primary/5 p-3 rounded-xl hidden sm:block"><Utensils className="h-6 w-6 text-primary" /></div><div><p className="font-bold text-lg leading-tight">{menu.name}</p><p className="text-xs text-muted-foreground">{menu.description || 'No section summary.'}</p></div></div><div className="flex items-center gap-4"><Badge variant={menu.isActive ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold px-2 py-0">{menu.isActive ? 'Active' : 'Draft'}</Badge></div></div></AccordionTrigger>
                  <AccordionContent className="pt-4 border-t mt-4"><div className="flex items-center justify-between mb-4"><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Section Management</p><div className="flex gap-2"><Button variant="outline" size="sm" className="text-xs h-9 border-primary text-primary hover:bg-primary/5 gap-1.5" onClick={() => { setEditingItemId(null); setItemForm({ name: '', description: '', price: '', category: 'Main Course', imageUrl: '', isAvailable: true }); setTargetMenuId(menu.id); setIsItemDialogOpen(true); }}><Plus className="h-3.5 w-3.5" /> Add Menu Item</Button><Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={() => handleDeleteMenu(menu.id)}><Trash2 className="h-4 w-4" /></Button></div></div><MenuItemManager restaurantId={effectiveRestaurantId!} menuId={menu.id} currency={currencySymbol} onEditItem={handleEditItemRequest} /></AccordionContent>
                </AccordionItem>
              ))}</Accordion>
            ) : <div className="text-center py-20 border-2 border-dashed rounded-xl space-y-4"><p className="text-muted-foreground">You haven't initialized any menus yet.</p><Button variant="outline" onClick={() => setIsMenuDialogOpen(true)} className="shadow-sm border-primary text-primary"><Plus className="mr-2 h-4 w-4" /> Start Initial Menu</Button></div>}</CardContent>
          </Card>
        </TabsContent>

        <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Create Menu Section</DialogTitle><DialogDescription>Add a new category to your menu, like "Starters" or "Main Courses".</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid gap-2"><Label htmlFor="menuName">Name</Label><Input id="menuName" value={menuForm.name} onChange={(e) => setMenuForm({...menuForm, name: e.target.value})} placeholder="e.g. Dinner Menu" /></div><div className="grid gap-2"><Label htmlFor="menuDesc">Description</Label><Textarea id="menuDesc" value={menuForm.description} onChange={(e) => setMenuForm({...menuForm, description: e.target.value})} placeholder="A short summary of this section..." /></div><div className="flex items-center gap-2"><Switch id="menuActive" checked={menuForm.isActive} onCheckedChange={(v) => setMenuForm({...menuForm, isActive: v})} /><Label htmlFor="menuActive">Active and visible to customers</Label></div></div><DialogFooter><Button variant="outline" onClick={() => setIsMenuDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateMenu} disabled={isCreating || !menuForm.name} className="bg-primary">{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Section"}</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}><DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>{editingItemId ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle><DialogDescription>Fill in the details for your {editingItemId ? 'updated' : 'new'} culinary creation.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label htmlFor="itemName">Name</Label><Input id="itemName" value={itemForm.name} onChange={(e) => setItemForm({...itemForm, name: e.target.value})} placeholder="e.g. Truffle Pizza" /></div><div className="grid gap-2"><Label htmlFor="itemPrice">Price ({restaurant?.baseCurrency})</Label><Input id="itemPrice" type="number" value={itemForm.price} onChange={(e) => setItemForm({...itemForm, price: e.target.value})} placeholder="15.00" /></div></div><div className="grid gap-2"><Label htmlFor="itemCategory">Category</Label><Input id="itemCategory" value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})} placeholder="Main Course" /></div><div className="grid gap-2"><div className="flex items-center justify-between"><Label htmlFor="itemDesc">Description</Label><Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={handleGenerateDescription} disabled={generatingDescription || !itemForm.name}>{generatingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Write with AI</Button></div><Textarea id="itemDesc" value={itemForm.description} onChange={(e) => setItemForm({...itemForm, description: e.target.value})} placeholder="Ingredients and prep details..." /></div><div className="grid gap-2"><Label htmlFor="itemImage">Image URL (Optional)</Label><Input id="itemImage" value={itemForm.imageUrl} onChange={(e) => setItemForm({...itemForm, imageUrl: e.target.value})} placeholder="https://images.unsplash.com/..." /></div><div className="flex items-center gap-2"><Switch id="itemAvailable" checked={itemForm.isAvailable} onCheckedChange={(v) => setItemForm({...itemForm, isAvailable: v})} /><Label htmlFor="itemAvailable">Available for order</Label></div></div><DialogFooter><Button variant="outline" onClick={() => { setIsItemDialogOpen(false); setEditingItemId(null); }}>Cancel</Button><Button onClick={handleSaveMenuItem} disabled={isCreating || !itemForm.name} className="bg-primary">{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : editingItemId ? "Update Item" : "Save Item"}</Button></DialogFooter></DialogContent></Dialog>

        <TabsContent value="seo" className="space-y-6 pt-4"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card className="border-none shadow-lg"><CardHeader><CardTitle className="font-headline">Restaurant Details for SEO</CardTitle><CardDescription>Fill out your restaurant profile to generate optimized SEO tags.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Restaurant Name</Label><Input value={seoForm.restaurantName} onChange={(e) => setSeoForm({...seoForm, restaurantName: e.target.value})} /></div><div className="space-y-2"><Label>Cuisine</Label><Input value={seoForm.cuisineType} onChange={(e) => setSeoForm({...seoForm, cuisineType: e.target.value})} /></div></div><div className="space-y-2"><Label>Description</Label><Textarea value={seoForm.description} onChange={(e) => setSeoForm({...seoForm, description: e.target.value})} className="min-h-[100px]" /></div><div className="space-y-2"><Label>Address</Label><Input value={seoForm.address} onChange={(e) => setSeoForm({...seoForm, address: e.target.value})} /></div><Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm" onClick={generateSeo} disabled={loadingSeo}>{loadingSeo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate SEO Strategy"}</Button></CardContent></Card><Card className="border-none shadow-lg h-fit"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Generated SEO Package</CardTitle></CardHeader><CardContent>{!seoResult ? <div className="text-center py-12 border-2 border-dashed rounded-xl"><p className="text-muted-foreground">Generated SEO content will appear here.</p></div> : <div className="space-y-4"><div className="space-y-1"><Label className="text-xs uppercase text-muted-foreground">Meta Title</Label><div className="p-3 bg-muted/50 rounded border text-sm font-medium">{seoResult.metaTitle}</div></div><div className="space-y-1"><Label className="text-xs uppercase text-muted-foreground">Meta Description</Label><div className="p-3 bg-muted/50 rounded border text-sm">{seoResult.metaDescription}</div></div><div className="space-y-1"><Label className="text-xs uppercase text-muted-foreground">Schema.org JSON-LD</Label><div className="p-3 bg-muted/50 rounded border text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">{seoResult.schemaMarkup}</div></div><Button className="w-full mt-4 bg-primary shadow-sm"><Save className="mr-2 h-4 w-4" /> Apply Global Meta Tags</Button></div>}</CardContent></Card></div></TabsContent>

        <TabsContent value="analytics" className="space-y-6 pt-4">{!aiInsights ? <Card className="border-none shadow-lg text-center py-20"><CardContent className="space-y-4"><div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto"><BarChart3 className="h-10 w-10 text-primary opacity-40" /></div><h3 className="text-xl font-bold">Comprehensive Sales Intelligence</h3><p className="text-muted-foreground max-w-md mx-auto">Run our AI auditor to identify trends, underperforming menu items, and peak revenue windows.</p><Button onClick={generateInsights} disabled={loadingAi} className="bg-primary shadow-md">{loadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run Deep Analysis"}</Button></CardContent></Card> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Card className="lg:col-span-2 border-none shadow-lg"><CardHeader><CardTitle className="font-headline">Performance Trend Analysis</CardTitle></CardHeader><CardContent className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="p-4 bg-primary/5 rounded-xl border border-primary/10"><p className="text-xs uppercase text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{currencySymbol}{aiInsights.keyPerformanceIndicators.totalRevenue.toLocaleString()}</p></div><div className="p-4 bg-primary/5 rounded-xl border border-primary/10"><p className="text-xs uppercase text-muted-foreground">Avg. Order</p><p className="text-2xl font-bold">{currencySymbol}{aiInsights.keyPerformanceIndicators.averageOrderValue.toFixed(2)}</p></div><div className="p-4 bg-primary/5 rounded-xl border border-primary/10"><p className="text-xs uppercase text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{aiInsights.keyPerformanceIndicators.numberOfOrders}</p></div></div></CardContent></Card></div>}</TabsContent>
      </Tabs>
    </div>
  );
}

export default function RestaurantAdminDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
