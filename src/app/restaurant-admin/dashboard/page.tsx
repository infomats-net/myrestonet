
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
  Palette,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Truck,
  CreditCard,
  User,
  ExternalLink,
  ChevronRight,
  ShoppingBag
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
import { doc, collection, addDoc, query, deleteDoc, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { DesignSystemEditor } from '@/components/design-system-editor';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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

function OrderManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return query(
      collection(firestore, 'restaurants', restaurantId, 'orders'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, restaurantId]);

  const { data: orders, isLoading } = useCollection(ordersQuery);

  const updateStatus = (orderId: string, newStatus: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'restaurants', restaurantId, 'orders', orderId);
    
    updateDoc(orderRef, { status: newStatus })
      .then(() => toast({ title: "Order Updated", description: `Status changed to ${newStatus}.` }))
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: { status: newStatus }
        }));
      });
  };

  if (isLoading) return <div className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="space-y-6">
      {orders && orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-none shadow-md overflow-hidden bg-white">
              <div className={cn(
                "h-1.5 w-full",
                order.status === 'pending' ? "bg-amber-400" :
                order.status === 'accepted' ? "bg-emerald-400" :
                order.status === 'preparing' ? "bg-blue-400" :
                order.status === 'delivered' ? "bg-slate-200" : "bg-primary"
              )} />
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black tracking-tight uppercase">Order #{order.id.slice(-6).toUpperCase()}</h3>
                          <Badge variant={order.status === 'pending' ? 'destructive' : 'secondary'} className="capitalize">{order.status}</Badge>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{order.currency}{order.total?.toFixed(2)}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{order.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 border">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest"><User className="h-3 w-3" /> Customer</div>
                      <p className="font-bold text-sm">{order.customerInfo?.name}</p>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {order.customerInfo?.phone}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.customerInfo?.address}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest"><Utensils className="h-3 w-3" /> Items</div>
                      <div className="grid gap-1.5">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded border border-dashed">
                            <span className="font-bold"><span className="text-primary">{item.qty}x</span> {item.name}</span>
                            <span className="text-muted-foreground">{order.currency}{item.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-48 flex flex-col gap-2 border-l lg:pl-8">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Actions</p>
                    {order.status === 'pending' && (
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(order.id, 'accepted')}>Accept Order</Button>
                    )}
                    {order.status === 'accepted' && (
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(order.id, 'preparing')}>Start Prep</Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => updateStatus(order.id, 'out_for_delivery')}>Dispatch</Button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <Button className="w-full bg-slate-800" onClick={() => updateStatus(order.id, 'delivered')}>Complete</Button>
                    )}
                    <Button variant="ghost" className="w-full text-xs text-destructive hover:bg-destructive/5" onClick={() => updateStatus(order.id, 'cancelled')}>Cancel Order</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed space-y-4">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="h-10 w-10 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No Orders Yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">When customers place orders on your storefront, they will appear here in real-time.</p>
          </div>
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
  
  const isRestaurantAdmin = userProfile?.role?.toLowerCase() === 'restaurant_admin' || userProfile?.role?.toLowerCase() === 'restaurantadmin';
  const isSuperAdmin = userProfile?.role?.toLowerCase() === 'super_admin' || userProfile?.role?.toLowerCase() === 'superadmin';
  
  const effectiveRestaurantId = impersonateId || (isRestaurantAdmin ? userProfile.restaurantId : null);

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  const paymentsConfigRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId, 'config', 'payments');
  }, [firestore, effectiveRestaurantId]);
  const { data: paymentsConfig } = useDoc(paymentsConfigRef);
  
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'menus');
  }, [firestore, effectiveRestaurantId]);

  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

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

  // Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    contactPhone: '',
    contactEmail: '',
    cuisine: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    deliveryCharge: '0.00',
    paypal: false,
    cod: true
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
        cuisine: Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : (restaurant.cuisine || '')
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

  useEffect(() => {
    if (paymentsConfig) {
      setPaymentForm({
        deliveryCharge: (paymentsConfig.deliveryCharge || 0).toString(),
        paypal: !!paymentsConfig.methods?.paypal,
        cod: paymentsConfig.methods?.cod !== false
      });
    }
  }, [paymentsConfig]);

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

  const handleSavePayments = async () => {
    if (!firestore || !effectiveRestaurantId) return;
    setSavingSettings(true);
    try {
      const pRef = doc(firestore, 'restaurants', effectiveRestaurantId, 'config', 'payments');
      await setDoc(pRef, {
        deliveryCharge: parseFloat(paymentForm.deliveryCharge) || 0,
        methods: {
          paypal: paymentForm.paypal,
          cod: paymentForm.cod
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Payments Updated", description: "Configuration has been synchronized." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
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
      const insights = await getAiSalesInsights({ salesData: [] }); 
      setAiInsights(insights);
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Analysis Failed", description: e.message });
    } finally {
      setLoadingAi(false);
    }
  };

  const isTrulyLoading = authLoading || (!!authUser && loadingProfile);

  if (isTrulyLoading) {
    return <div className="flex flex-col items-center justify-center p-20 space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground animate-pulse font-medium">Validating Merchant Credentials...</p></div>;
  }

  if (isSuperAdmin && !impersonateId) {
    return (
      <div className="p-20 text-center max-w-lg mx-auto space-y-6">
        <div className="bg-primary/10 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto text-primary">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-headline font-bold text-primary">Global Control Required</h2>
          <p className="text-muted-foreground">
            As a Super Admin, you must select a restaurant tenant from the management panel to access its specific dashboard tools.
          </p>
        </div>
        <Button className="w-full h-12 text-lg font-bold" asChild>
          <Link href="/super-admin/tenants">Go to Tenant Management</Link>
        </Button>
      </div>
    );
  }

  if (!restaurant && !loadingRes) {
    return (
      <div className="p-20 text-center max-w-md mx-auto space-y-6">
        <div className="bg-destructive/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-destructive">
          <Info className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-primary">Restaurant Connection Failed</h2>
          <p className="text-muted-foreground">
            {isRestaurantAdmin 
              ? "We couldn't find a restaurant linked to your admin profile. Please contact platform support."
              : "The requested restaurant instance could not be retrieved."}
          </p>
        </div>
        <Button variant="outline" asChild className="w-full">
          <Link href="/auth/login">Return to Login</Link>
        </Button>
      </div>
    );
  }

  if (loadingRes) {
    return <div className="flex flex-col items-center justify-center p-20 space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground animate-pulse font-medium">Connecting to Store Instance...</p></div>;
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
          <Button variant="outline" className="border-primary text-primary hover:bg-primary/5" asChild><Link href={`/customer/${restaurant?.id}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> View Storefront</Link></Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => handleTabChange('settings')}><Settings className="mr-2 h-4 w-4" /> Store Settings</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-white border p-1 rounded-xl flex overflow-x-auto no-scrollbar h-auto w-full md:w-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Overview</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Orders</TabsTrigger>
          <TabsTrigger value="menu" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Menus</TabsTrigger>
          <TabsTrigger value="hours" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2"><Clock className="h-4 w-4" /> Timing</TabsTrigger>
          <TabsTrigger value="design" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2"><Palette className="h-4 w-4" /> Design</TabsTrigger>
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
              <CardContent><div className="text-2xl font-bold">12</div><p className="text-xs text-muted-foreground">Active platform-wide</p></CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Prep Time</CardTitle><Utensils className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">18 min</div><p className="text-xs text-primary font-semibold">Performing optimally</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="pt-4"><OrderManager restaurantId={effectiveRestaurantId!} /></TabsContent>
        <TabsContent value="design" className="pt-4"><DesignSystemEditor restaurantId={effectiveRestaurantId!} /></TabsContent>
        <TabsContent value="hours" className="pt-4"><OperatingHoursEditor restaurantId={effectiveRestaurantId!} /></TabsContent>

        <TabsContent value="settings" className="space-y-6 pt-4 pb-20">
          <Card className="border-none shadow-lg max-w-4xl">
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
              <Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm" onClick={handleSaveProfile} disabled={savingSettings}>{savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Global Profile</Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg max-w-4xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <CardTitle className="font-headline">Payments & Delivery</CardTitle>
              </div>
              <CardDescription>Configure how customers pay and set your standard delivery rates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Methods</Label>
                <div className="grid gap-4">
                  {[
                    { id: 'paypal', label: 'PayPal (Digital Wallet)', icon: ExternalLink },
                    { id: 'cod', label: 'Cash on Delivery', icon: BanknoteIcon }
                  ].map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100"><method.icon className="h-4 w-4 text-slate-400" /></div>
                        <span className="text-sm font-bold text-slate-700">{method.label}</span>
                      </div>
                      <Switch 
                        checked={(paymentForm as any)[method.id]} 
                        onCheckedChange={(v) => setPaymentForm({...paymentForm, [method.id]: v})} 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Logistics Settings</Label>
                <div className="space-y-2">
                  <Label>Delivery Charge ({restaurant?.baseCurrency})</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">{currencySymbol}</span>
                    <Input 
                      type="number" 
                      className="pl-8 h-12 rounded-xl bg-slate-50 border-slate-100" 
                      value={paymentForm.deliveryCharge}
                      onChange={(e) => setPaymentForm({...paymentForm, deliveryCharge: e.target.value})}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">This fee is added to every order at checkout automatically.</p>
                </div>
              </div>

              <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl" onClick={handleSavePayments} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Publish Payment Strategy
              </Button>
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

function BanknoteIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

export default function RestaurantAdminDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
