"use client";

import { use, useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  UtensilsCrossed, 
  MapPin, 
  ShoppingBag, 
  Clock, 
  Star, 
  Info, 
  ChevronRight, 
  Quote, 
  Mail, 
  CheckCircle2,
  User,
  Map as MapIcon,
  CalendarDays,
  Menu as MenuIcon,
  X,
  Maximize2,
  Image as ImageIcon,
  Search,
  Filter,
  Leaf,
  Flame,
  WheatOff,
  ShieldCheck,
  Zap,
  Sparkles,
  AlertTriangle,
  Tag,
  Plus,
  Minus,
  Sparkle,
  ArrowUpCircle,
  TrendingUp,
  History
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetFooter,
  SheetDescription 
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { checkIsRestaurantOpen } from '@/lib/operating-hours';
import { generateEmailContent } from '@/ai/flows/generate-email-content';
import { getSmartRecommendations } from '@/ai/flows/smart-recommendations';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { MenuStyle1, MenuStyle2, MenuStyle3, MenuStyle4 } from '@/components/menu-layouts';

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

const DEFAULT_SECTION_ORDER = ['navbar', 'siteBanner', 'hero', 'welcomeCard', 'about', 'menuList', 'gallery', 'testimonials', 'map', 'contact', 'bookingCTA'];

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
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDietaryFilters, setActiveDietaryFilters] = useState<string[]>([]);

  const [customizingItem, setCustomizingItem] = useState<any>(null);
  const [activeAddOns, setActiveAddOns] = useState<AddOn[]>([]);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', address: '' });

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  const designRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'design', 'settings');
  }, [firestore, restaurantId]);
  const { data: designSettings } = useDoc(designRef);

  const dietaryTagsRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'config', 'dietaryTags');
  }, [firestore, restaurantId]);
  const { data: customTagsDoc } = useDoc(dietaryTagsRef);
  const customTags = customTagsDoc?.list || [];

  const ALL_DIETARY = useMemo(() => {
    const list = [...DIETARY_FILTERS];
    customTags.forEach((tag: string) => {
      if (!list.some(f => f.id === tag.toLowerCase())) {
        list.push({ id: tag.toLowerCase(), label: tag, icon: Sparkles });
      }
    });
    return list;
  }, [customTags]);

  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!firestore || !restaurantId) return;
    const fetchAll = async () => {
      setLoadingItems(true);
      const menusSnap = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus'));
      const items: any[] = [];
      for (const m of menusSnap.docs) {
        const iSnap = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', m.id, 'items'));
        iSnap.forEach(d => items.push({ ...d.data(), id: d.id, menuId: m.id }));
      }
      setAllMenuItems(items);
      setLoadingItems(false);
    };
    fetchAll();
  }, [firestore, restaurantId]);

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

  useEffect(() => {
    if (customizingItem?.enableAIRecommendations && cart.length > 0) {
      setLoadingAI(true);
      getSmartRecommendations({
        cartItems: cart.map(i => i.name),
        availableMenu: allMenuItems.map(i => ({ id: i.id, name: i.name, category: i.category, description: i.description })),
      }).then(res => {
        const items = allMenuItems.filter(i => res.recommendedIds.includes(i.id));
        setAiRecs(items);
      }).finally(() => setLoadingAI(false));
    }
  }, [customizingItem, cart, allMenuItems]);

  const addToCart = (item: any, quantity = 1) => {
    if (item.isOutOfStock) return;

    let unitPrice = item.specialPrice || item.price;
    if (item.quantityDiscounts) {
      const applicable = item.quantityDiscounts
        .filter((d: any) => quantity >= d.minQty)
        .sort((a: any, b: any) => b.minQty - a.minQty)[0];
      if (applicable) unitPrice = applicable.discountPrice;
    }

    const uniqueId = `${item.id}-${activeAddOns.map(a => a.name).sort().join('|')}`;
    const addOnsTotal = activeAddOns.reduce((s, a) => s + a.price, 0);
    const finalPrice = unitPrice + addOnsTotal;

    setCart(prev => {
      const existing = prev.find(i => i.uniqueId === uniqueId);
      if (existing) {
        return prev.map(i => i.uniqueId === uniqueId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { id: item.id, uniqueId, name: item.name, price: finalPrice, quantity, selectedAddOns: activeAddOns }];
    });
    
    setCustomizingItem(null);
    setActiveAddOns([]);
    setAiRecs([]);
    toast({ title: "Added to Cart" });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loadingRes || loadingItems) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-24 scroll-smooth" style={{ backgroundColor: designSettings?.theme?.background || '#fff' }}>
      <nav className="sticky top-0 z-[100] w-full border-b backdrop-blur-lg h-20 flex items-center bg-white/95 px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <h1 className="text-xl font-black">{restaurant?.name}</h1>
          <Button variant="ghost" className="relative" onClick={() => setIsCheckoutOpen(true)}>
            <ShoppingBag className="h-6 w-6" />
            {cart.length > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">{cart.length}</Badge>}
          </Button>
        </div>
      </nav>

      <div id="menu-list" className="py-20 max-w-6xl mx-auto px-6">
        <div className="mb-12 flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {ALL_DIETARY.map(f => (
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
              <img src={customizingItem?.imageUrl || `https://picsum.photos/seed/${customizingItem?.id}/400/400`} className="w-full aspect-square object-cover rounded-2xl shadow-lg mb-6" alt="" />
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
              <div className="space-y-8">
                {customizingItem?.upsellIds?.length > 0 && (
                  <div className="space-y-4 animate-in slide-in-from-right duration-500">
                    <h3 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4" /> Recommendation
                    </h3>
                    {allMenuItems.filter(i => customizingItem.upsellIds.includes(i.id)).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <div className="flex items-center gap-3">
                          <img src={item.imageUrl} className="h-10 w-10 rounded-lg object-cover" alt="" />
                          <span className="font-bold text-sm">{item.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="font-black text-xs text-primary" onClick={() => addToCart(item)}>Add • ${item.price}</Button>
                      </div>
                    ))}
                  </div>
                )}

                {loadingAI ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold animate-pulse"><Loader2 className="h-3 w-3 animate-spin" /> AI is thinking...</div>
                ) : aiRecs.length > 0 && (
                  <div className="space-y-4 animate-in fade-in duration-700">
                    <h3 className="font-black text-xs uppercase tracking-widest text-amber-600 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Frequently Paired
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {aiRecs.map(item => (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-xl text-center border group cursor-pointer hover:border-primary transition-all" onClick={() => addToCart(item)}>
                          <p className="font-bold text-[10px] mb-1 truncate">{item.name}</p>
                          <span className="font-black text-xs text-primary">${item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t mt-8 space-y-4">
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
            <div className="flex justify-between text-sm opacity-60 font-bold"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-2xl font-black border-t border-white/10 pt-4"><span>Total</span><span>${subtotal.toFixed(2)}</span></div>
            <Button className="w-full h-16 rounded-2xl font-black text-xl mt-4" style={{ backgroundColor: designSettings?.theme?.primary }}>Checkout</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}