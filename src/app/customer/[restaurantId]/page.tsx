
"use client";

import { use, useState, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, addDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  UtensilsCrossed, 
  MapPin, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  Phone,
  Clock,
  Star,
  Info,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function CustomerStorefront({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // 1. Fetch Restaurant Info
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 2. Fetch Design Settings
  const designRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'design', 'settings');
  }, [firestore, restaurantId]);
  const { data: designSettings } = useDoc(designRef);

  // 3. Fetch All Menus
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // 4. Fetch Items for all menus
  useEffect(() => {
    if (!firestore || !restaurantId || !menus) return;
    
    const fetchAllItems = async () => {
      setLoadingItems(true);
      const items: any[] = [];
      for (const menu of menus) {
        const querySnapshot = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', menu.id, 'items'));
        querySnapshot.forEach((doc) => {
          items.push({ ...doc.data(), id: doc.id, menuId: menu.id, menuName: menu.name });
        });
      }
      setAllMenuItems(items);
      setLoadingItems(false);
    };

    fetchAllItems();
  }, [firestore, restaurantId, menus]);

  useEffect(() => {
    if (auth) signInAnonymously(auth);
  }, [auth]);

  useEffect(() => {
    if (restaurant?.paymentSettings) {
      const settings = restaurant.paymentSettings;
      if (settings.paypal?.enabled) setPaymentMethod('paypal');
      else if (settings.cod?.enabled) setPaymentMethod('cod');
    } else {
      setPaymentMethod('cod'); // Default fallback
    }
  }, [restaurant]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast({ title: "Added to cart", description: `${item.name} added.` });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryEnabled = restaurant?.deliverySettings?.deliveryEnabled ?? true;
  const baseDeliveryCharge = restaurant?.deliverySettings?.deliveryCharge || 0;
  const freeThreshold = restaurant?.deliverySettings?.freeDeliveryAbove;
  const deliveryCharge = (deliveryEnabled && (freeThreshold === null || subtotal < (freeThreshold || 0))) ? baseDeliveryCharge : 0;
  const total = subtotal + deliveryCharge;

  const handleCheckout = async () => {
    if (!auth?.currentUser || !firestore || !restaurantId) return;
    setIsProcessing(true);
    try {
      const orderData = {
        customerId: auth.currentUser.uid,
        items: cart,
        subtotal,
        deliveryCharge,
        totalAmount: total,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(firestore, 'restaurants', restaurantId, 'orders'), orderData);
      setCart([]);
      setOrderComplete(true);
      setIsCheckoutOpen(false);
      toast({ title: "Order Success!", description: "Your meal is being prepared." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to place order." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingRes || loadingMenus || loadingItems) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
  );

  if (!restaurant) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <Card className="max-w-md p-12 rounded-[2rem] border-none shadow-xl">
        <UtensilsCrossed className="h-16 w-16 text-slate-200 mx-auto mb-4" />
        <h1 className="text-2xl font-black">Restaurant Not Found</h1>
      </Card>
    </div>
  );

  const theme = designSettings?.theme || { primary: '#22c55e', background: '#ffffff', text: '#0f172a' };
  const sections = designSettings?.sections || { hero: { visible: true }, welcomeCard: { visible: true }, about: { visible: true }, menuList: { visible: true } };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.background, color: theme.text }}>
      {/* 1. Hero Section */}
      {sections.hero?.visible && (
        <section className="relative h-[60vh] flex items-center justify-center text-center px-6 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img 
            src="https://picsum.photos/seed/restaurant-hero/1920/1080" 
            alt="Hero" 
            className="absolute inset-0 w-full h-full object-cover"
            data-ai-hint="restaurant interior"
          />
          <div className="relative z-20 space-y-6 max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg">
              {restaurant.name}
            </h1>
            <p className="text-xl text-white/90 font-medium drop-shadow-md">
              Discover localized flavors and premium dining experiences.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="rounded-2xl h-14 px-8 text-lg font-black shadow-xl" style={{ backgroundColor: theme.primary }} asChild>
                <a href="#menu">View Menu</a>
              </Button>
              <Button size="lg" variant="outline" className="rounded-2xl h-14 px-8 text-lg font-black bg-white/10 text-white border-white/20 backdrop-blur-md hover:bg-white hover:text-black" asChild>
                <Link href={`/customer/${restaurantId}/reserve`}>Book Table</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-20">
        
        {/* 2. Welcome Card / Quick Info */}
        {sections.welcomeCard?.visible && (
          <section className={cn("relative z-30", sections.hero?.visible && "-mt-32")}>
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold">OPEN NOW</Badge>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-black">4.9</span>
                      <span className="text-slate-400 text-sm">(500+ reviews)</span>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">Welcome to {restaurant.name}</h2>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    {restaurant.city}, {restaurant.country}. Experience high-end dining with isolation and security at the core of our service.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border">
                      <Clock className="h-5 w-5 text-primary" style={{ color: theme.primary }} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Wait Time</p>
                        <p className="font-bold text-slate-900">15-20 Mins</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border">
                      <Truck className="h-5 w-5 text-primary" style={{ color: theme.primary }} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Delivery</p>
                        <p className="font-bold text-slate-900">Free over $50</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-72 shrink-0 space-y-4">
                  <Button className="w-full h-16 rounded-2xl text-xl font-black shadow-lg" style={{ backgroundColor: theme.primary }} asChild>
                    <Link href={`/customer/${restaurantId}/reserve`}>
                      Reserve a Table <ChevronRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full h-16 rounded-2xl text-xl font-black border-2" asChild>
                    <a href="#menu">Order Online</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 3. About Section */}
        {sections.about?.visible && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-black tracking-tight" style={{ color: theme.text }}>About Our Culinary Vision</h2>
              <p className="text-lg leading-relaxed opacity-70">
                At {restaurant.name}, we believe that dining is an art form. Every dish we serve is a testament to our commitment to excellence, crafted with the freshest local ingredients and a touch of global inspiration.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" style={{ color: theme.primary }}>
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold">Premium Location</p>
                    <p className="text-sm opacity-60">{restaurant.address}, {restaurant.city}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" style={{ color: theme.primary }}>
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold">Cuisines</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {restaurant.cuisine?.map((c: string) => (
                        <Badge key={c} variant="secondary" className="font-bold">{c}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-primary/10 rounded-[3rem] blur-xl group-hover:bg-primary/20 transition-all duration-500" style={{ backgroundColor: `${theme.primary}20` }} />
              <img 
                src="https://picsum.photos/seed/rest-about/800/600" 
                alt="Interior" 
                className="relative rounded-[2.5rem] shadow-2xl object-cover w-full h-[400px]"
                data-ai-hint="restaurant kitchen"
              />
            </div>
          </section>
        )}

        {/* 4. Menu Section */}
        {sections.menuList?.visible && (
          <section id="menu" className="space-y-12 pt-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black tracking-tight">Our Signature Menu</h2>
              <p className="text-lg opacity-60 max-w-2xl mx-auto">Explore our curated selection of dishes, designed to delight and satisfy.</p>
            </div>

            {menus?.map(menu => (
              <div key={menu.id} className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-black border-l-8 pl-6" style={{ borderColor: theme.primary }}>{menu.name}</h3>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {allMenuItems.filter(i => i.menuId === menu.id).map(item => (
                    <Card key={item.id} className="overflow-hidden border-none shadow-lg rounded-[2.5rem] group hover:shadow-2xl transition-all duration-500 bg-white">
                      <div className="relative h-56 overflow-hidden">
                        <img 
                          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          data-ai-hint="food dish"
                        />
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-white/90 text-black border-none font-black backdrop-blur-md px-4 py-1.5 rounded-full text-lg shadow-xl">
                            ${item.price}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-8 space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-black text-2xl text-slate-900 group-hover:text-primary transition-colors" style={{ color: designSettings?.theme?.text }}>{item.name}</h4>
                          <p className="text-sm text-slate-500 line-clamp-2 font-medium">{item.description}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold uppercase text-[10px] tracking-widest">
                            {item.category}
                          </Badge>
                          <Button size="icon" className="rounded-full w-12 h-12 shadow-lg shadow-primary/20 hover:scale-110 transition-transform" style={{ backgroundColor: theme.primary }} onClick={() => addToCart(item)}>
                            <Plus className="h-6 w-6" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 5. Contact / Booking Footer */}
        <section className="bg-slate-900 text-white rounded-[3rem] p-8 md:p-20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48" style={{ backgroundColor: `${theme.primary}30` }} />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-black">Plan Your Visit</h2>
              <p className="text-white/60 text-lg">We are ready to welcome you. For large parties or special events, please contact us directly or use our smart reservation system.</p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-primary" style={{ color: theme.primary }}><Phone className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Call Us</p>
                    <p className="text-xl font-bold">{restaurant.contactPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-primary" style={{ color: theme.primary }}><MapPin className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Location</p>
                    <p className="text-xl font-bold">{restaurant.address}</p>
                  </div>
                </div>
              </div>
            </div>
            <Card className="rounded-[2.5rem] bg-white text-slate-900 border-none p-10 shadow-2xl space-y-8">
              <div className="text-center space-y-2">
                <CalendarDays className="h-12 w-12 text-primary mx-auto" style={{ color: theme.primary }} />
                <h3 className="text-2xl font-black">Secure Your Spot</h3>
                <p className="text-slate-500">Instant confirmation via our AI-powered table allocator.</p>
              </div>
              <Button size="lg" className="w-full h-16 rounded-2xl text-xl font-black shadow-xl" style={{ backgroundColor: theme.primary }} asChild>
                <Link href={`/customer/${restaurantId}/reserve`}>Book Now</Link>
              </Button>
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                No credit card required for booking
              </p>
            </Card>
          </div>
        </section>
      </div>

      {/* Cart Navigation Bar */}
      {cart.length > 0 && !orderComplete && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-[100]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Your Cart Total</p>
              <p className="text-2xl font-black text-slate-900">${total.toFixed(2)}</p>
            </div>
            
            <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
              <SheetTrigger asChild>
                <Button size="lg" className="rounded-2xl h-14 px-8 font-black text-lg gap-2 shadow-xl" style={{ backgroundColor: theme.primary }}>
                  <ShoppingBag className="h-5 w-5" /> Checkout ({cart.length})
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md rounded-l-[3rem] p-0 flex flex-col h-full border-none">
                <SheetHeader className="p-8 bg-slate-50/50 shrink-0">
                  <SheetTitle className="text-3xl font-black">Your Order</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 no-scrollbar">
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                          <span className="font-black text-sm">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Payment</h4>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                      <div className="flex items-center space-x-2 border p-4 rounded-2xl">
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="font-bold flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Cash on Delivery
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-bold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Delivery</span>
                      <span className="font-bold">{deliveryCharge === 0 ? "FREE" : `$${deliveryCharge.toFixed(2)}`}</span>
                    </div>
                    <div className="pt-3 border-t flex justify-between items-center">
                      <span className="text-lg font-black">Total</span>
                      <span className="text-2xl font-black" style={{ color: theme.primary }}>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <SheetFooter className="p-8 border-t shrink-0">
                  <Button 
                    className="w-full h-16 rounded-[1.5rem] font-black text-xl" 
                    style={{ backgroundColor: theme.primary }}
                    disabled={isProcessing || cart.length === 0 || !paymentMethod}
                    onClick={handleCheckout}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : "Place Order"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
}
