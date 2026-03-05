"use client";

import { use, useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, collection, addDoc, getDocs, updateDoc, arrayUnion, arrayRemove, query, where, serverTimestamp } from 'firebase/firestore';
import { 
  Loader2, 
  ShoppingBag, 
  Leaf, 
  Flame, 
  WheatOff, 
  ShieldCheck, 
  Sparkles,
  Heart,
  UserCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetFooter
} from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getSmartRecommendations } from '@/ai/flows/smart-recommendations';
import { MenuStyle2 } from '@/components/menu-layouts';

type AddOn = {
  name: string;
  price: number;
};

type CartItem = {
  id: string;
  uniqueId: string; 
  name: string;
  price: number;
  quantity: number;
  selectedAddOns: AddOn[];
  discountedPrice?: number;
};

const DIETARY_FILTERS = [
  { id: 'veg', label: 'Vegetarian', icon: Leaf },
  { id: 'vegan', label: 'Vegan', icon: Leaf },
  { id: 'gf', label: 'Gluten Free', icon: WheatOff },
  { id: 'halal', label: 'Halal', icon: ShieldCheck },
  { id: 'spicy', label: 'Spicy', icon: Flame },
];

export default function CustomerStorefront({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const { auth, firestore, user } = useFirebase();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDietaryFilters, setActiveDietaryFilters] = useState<string[]>([]);

  const [customizingItem, setCustomizingItem] = useState<any>(null);
  const [activeAddOns, setActiveAddOns] = useState<AddOn[]>([]);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'customerProfiles', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const designRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'design', 'settings');
  }, [firestore, restaurantId]);
  const { data: designSettings } = useDoc(designRef);

  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!firestore || !restaurantId) return;
    const fetchAll = async () => {
      setLoadingItems(true);
      try {
        const menusSnap = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus'));
        const items: any[] = [];
        for (const m of menusSnap.docs) {
          const iSnap = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', m.id, 'items'));
          iSnap.forEach(d => items.push({ ...d.data(), id: d.id, menuId: m.id }));
        }
        setAllMenuItems(items);
      } catch (error) {
        console.error("Failed to load menu items", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load restaurant menu." });
      } finally {
        setLoadingItems(false);
      }
    };
    fetchAll();
  }, [firestore, restaurantId, toast]);

  const bestSellerIds = useMemo(() => {
    return new Set(allMenuItems.filter(i => i.isPopular).map(i => i.id));
  }, [allMenuItems]);

  const filteredItems = useMemo(() => {
    return allMenuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDietary = activeDietaryFilters.length === 0 || activeDietaryFilters.every(f => item.dietary?.includes(f));
      return matchesSearch && matchesDietary;
    });
  }, [allMenuItems, searchTerm, activeDietaryFilters]);

  const toggleFavorite = async (itemId: string) => {
    if (!user) {
      toast({ title: "Account Required", description: "Please sign in to save favorites." });
      return;
    }
    const isFav = profile?.favoriteMenuItemIds?.includes(itemId);
    try {
      await updateDoc(profileRef!, {
        favoriteMenuItemIds: isFav ? arrayRemove(itemId) : arrayUnion(itemId),
        updatedAt: serverTimestamp()
      });
      toast({ title: isFav ? "Removed from favorites" : "Added to favorites" });
    } catch (e) {}
  };

  const addToCart = (item: any, quantity = 1) => {
    if (item.isOutOfStock) return;
    const uniqueId = `${item.id}-${activeAddOns.map(a => a.name).sort().join('|')}`;
    const addOnsTotal = activeAddOns.reduce((s, a) => s + a.price, 0);
    const finalPrice = (item.specialPrice || item.price) + addOnsTotal;

    setCart(prev => {
      const existing = prev.find(i => i.uniqueId === uniqueId);
      if (existing) {
        return prev.map(i => i.uniqueId === uniqueId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { id: item.id, uniqueId, name: item.name, price: finalPrice, quantity, selectedAddOns: activeAddOns }];
    });
    
    setCustomizingItem(null);
    setActiveAddOns([]);
    toast({ title: "Added to Cart" });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: "Account Required", description: "Sign in to complete your order." });
      return;
    }
    setIsProcessing(true);
    try {
      const orderRef = collection(firestore!, 'restaurants', restaurantId, 'orders');
      await addDoc(orderRef, {
        customerId: user.uid,
        customerName: profile?.firstName + " " + profile?.lastName,
        customerEmail: profile?.email,
        restaurantId,
        items: cart,
        totalAmount: subtotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Update loyalty points (1 point per dollar)
      await updateDoc(profileRef!, {
        loyaltyPoints: (profile?.loyaltyPoints || 0) + Math.floor(subtotal),
        updatedAt: serverTimestamp()
      });

      setCart([]);
      setIsCheckoutOpen(false);
      toast({ title: "Order Placed!", description: "Check your history for updates." });
    } catch (e) {
      toast({ variant: "destructive", title: "Checkout failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingRes || loadingItems) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-24 scroll-smooth" style={{ backgroundColor: designSettings?.theme?.background || '#fff' }}>
      <nav className="sticky top-0 z-[100] w-full border-b backdrop-blur-lg h-20 flex items-center bg-white/95 px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <Link href={`/customer/${restaurantId}`} className="text-xl font-black">{restaurant?.name}</Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button variant="ghost" asChild className="rounded-full h-10 px-4 font-bold text-primary bg-primary/5">
                <Link href="/customer/account"><UserCircle className="mr-2 h-5 w-5" /> Account</Link>
              </Button>
            ) : (
              <Button variant="ghost" asChild className="rounded-full h-10 px-4 font-bold">
                <Link href="/auth/login">Sign In</Link>
              </Button>
            )}
            <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-slate-50" onClick={() => setIsCheckoutOpen(true)}>
              <ShoppingBag className="h-5 w-5" />
              {cart.length > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">{cart.length}</Badge>}
            </Button>
          </div>
        </div>
      </nav>

      <div id="menu-list" className="py-20 max-w-6xl mx-auto px-6">
        <div className="mb-12 flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {DIETARY_FILTERS.map(f => (
            <Button key={f.id} variant="outline" className={cn("rounded-full gap-2 shrink-0 h-10 px-6 font-bold transition-all", activeDietaryFilters.includes(f.label) && "bg-primary text-white border-primary shadow-lg")} onClick={() => setActiveDietaryFilters(prev => prev.includes(f.label) ? prev.filter(x => x !== f.label) : [...prev, f.label])}>
              <f.icon className="h-4 w-4" /> {f.label}
            </Button>
          ))}
        </div>

        <MenuStyle2 
          menus={null} 
          allMenuItems={filteredItems} 
          currencySymbol="$" 
          theme={{ primary: designSettings?.theme?.primary || '#22c55e', text: '#000', background: '#fff' }} 
          addToCart={(item) => setCustomizingItem(item)} 
          cart={cart}
          bestSellerIds={bestSellerIds}
        />
      </div>

      <Dialog open={!!customizingItem} onOpenChange={() => setCustomizingItem(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl overflow-hidden p-0">
          <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
            <div className="w-full md:w-1/2 bg-slate-50 border-r overflow-y-auto no-scrollbar p-8">
              <div className="relative">
                <img src={customizingItem?.imageUrl || `https://picsum.photos/seed/${customizingItem?.id}/400/400`} className="w-full aspect-square object-cover rounded-2xl shadow-lg mb-6" alt="" />
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 rounded-full bg-white/80 backdrop-blur-md shadow-md" onClick={() => toggleFavorite(customizingItem?.id)}>
                  <Heart className={cn("h-5 w-5", profile?.favoriteMenuItemIds?.includes(customizingItem?.id) ? "text-rose-500 fill-current" : "text-slate-400")} />
                </Button>
              </div>
              <h2 className="text-2xl font-black mb-2">{customizingItem?.name}</h2>
              <p className="text-slate-500 text-sm mb-6">{customizingItem?.description}</p>
              
              <div className="space-y-4">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Add-ons</h3>
                {customizingItem?.addOns?.map((addon: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border cursor-pointer hover:border-primary transition-all" onClick={() => setActiveAddOns(prev => prev.some(x => x.name === addon.name) ? prev.filter(x => x.name !== addon.name) : [...prev, addon])}>
                    <div className="flex items-center gap-3">
                      <Checkbox checked={activeAddOns.some(x => x.name === addon.name)} />
                      <span className="font-bold text-sm">{addon.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-400">+${addon.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-1/2 p-8 flex flex-col justify-between overflow-y-auto no-scrollbar">
              <div className="pt-8 border-t mt-auto space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Total Price</span>
                  <span className="text-2xl font-black text-primary">${((customizingItem?.specialPrice || customizingItem?.price || 0) + activeAddOns.reduce((s, a) => s + a.price, 0)).toFixed(2)}</span>
                </div>
                <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl" onClick={() => addToCart(customizingItem)}>Add to Order</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <SheetContent className="w-full sm:max-w-md rounded-l-[3rem] p-8 space-y-8 flex flex-col">
          <SheetHeader><SheetTitle className="text-3xl font-black">Your Order</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
            {cart.map(item => (
              <div key={item.uniqueId} className="flex justify-between items-start border-b pb-4">
                <div>
                  <p className="font-black text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.quantity}x • ${item.price.toFixed(2)}</p>
                </div>
                <span className="font-black">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-900 text-white rounded-3xl p-8 space-y-4 shadow-2xl">
            <div className="flex justify-between text-2xl font-black border-t border-white/10 pt-4"><span>Total</span><span>${subtotal.toFixed(2)}</span></div>
            <Button onClick={handleCheckout} disabled={isProcessing || cart.length === 0} className="w-full h-16 rounded-2xl font-black text-xl mt-4" style={{ backgroundColor: designSettings?.theme?.primary }}>
              {isProcessing ? <Loader2 className="animate-spin" /> : "Complete Order"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
