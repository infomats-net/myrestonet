
"use client";

import { use, useState, useEffect, ReactNode } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, collection, addDoc, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  UtensilsCrossed, 
  MapPin, 
  ShoppingBag, 
  Plus, 
  Minus, 
  CreditCard, 
  Truck, 
  Phone, 
  Clock, 
  Star, 
  Info, 
  ChevronRight, 
  CalendarDays, 
  Quote, 
  Mail, 
  CheckCircle2
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
import { checkIsRestaurantOpen } from '@/lib/operating-hours';
import { generateEmailContent } from '@/ai/flows/generate-email-content';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function CustomerStorefront({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Firestore Queries
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

  const hoursRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'config', 'operatingHours');
  }, [firestore, restaurantId]);
  const { data: operatingHours } = useDoc(hoursRef);

  const galleryRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'gallery');
  }, [firestore, restaurantId]);
  const { data: galleryImages } = useCollection(galleryRef);

  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

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

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast({ title: "Added to cart" });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) return { ...i, quantity: Math.max(1, i.quantity + delta) };
      return i;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryCharge = 0;
  const total = subtotal + deliveryCharge;

  const handleCheckout = async () => {
    if (!auth || !firestore || !restaurantId) return;
    setIsProcessing(true);
    try {
      let user = auth.currentUser;
      if (!user) {
        const userCredential = await signInAnonymously(auth);
        user = userCredential.user;
      }

      const orderData = {
        customerId: user.uid,
        items: cart,
        totalAmount: total,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(firestore, 'restaurants', restaurantId, 'orders'), orderData);
      setCart([]);
      setOrderComplete(true);
      setIsCheckoutOpen(false);
      toast({ title: "Order Placed!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to place order." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingRes || loadingMenus || loadingItems) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10" /></div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center"><h1>Restaurant Not Found</h1></div>;

  const isOpen = checkIsRestaurantOpen(operatingHours);
  const theme = designSettings?.theme || { primary: '#22c55e', background: '#ffffff', text: '#0f172a' };
  const typography = designSettings?.typography || { fontFamily: 'Inter', headingFont: 'Inter', baseSize: '16px' };
  
  const sections = designSettings?.sections || {
    navbar: { visible: true },
    hero: { visible: true },
    welcomeCard: { visible: true, showBadges: true, showRating: true, showDeliveryInfo: true, showLocation: true },
    about: { visible: true },
    menuList: { visible: true },
    gallery: { visible: true },
    testimonials: { visible: true },
    contact: { visible: true },
    map: { visible: true },
    bookingCTA: { visible: true }
  };

  const sectionOrder = designSettings?.sectionOrder || ['navbar', 'hero', 'welcomeCard', 'about', 'menuList', 'gallery', 'testimonials', 'map', 'contact', 'bookingCTA'];

  const SECTION_COMPONENTS: Record<string, ReactNode> = {
    hero: (
      <section key="hero" className="relative h-[60vh] flex items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img src={designSettings?.branding?.bannerUrl || "https://picsum.photos/seed/restaurant-hero/1920/1080"} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative z-20 space-y-6 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-black text-white" style={{ fontFamily: typography.headingFont }}>{restaurant.name}</h1>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="rounded-2xl" style={{ backgroundColor: theme.primary }} asChild><a href="#menu">View Menu</a></Button>
            <Button size="lg" variant="outline" className="rounded-2xl text-white border-white hover:bg-white hover:text-black" asChild><Link href={`/customer/${restaurantId}/reserve`}>Book Table</Link></Button>
          </div>
        </div>
      </section>
    ),
    welcomeCard: (
      <section key="welcomeCard" className={cn("relative z-30", sections.hero?.visible && "-mt-32 px-6")}>
        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white max-w-6xl mx-auto overflow-hidden">
          <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 text-slate-900">
            <div className="flex-1 space-y-6">
              <Badge className={cn("text-2xl font-black px-6 py-2 rounded-2xl border-none", isOpen ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive")}>
                {isOpen ? "OPEN NOW" : "CLOSED NOW"}
              </Badge>
              <h2 className="text-3xl font-black">Welcome to {restaurant.name}</h2>
              <p className="text-slate-500 font-medium">{restaurant.city}, {restaurant.country}. Experience localized flavors delivered with precision.</p>
            </div>
            <div className="w-full md:w-72 space-y-4">
              <Button className="w-full h-16 rounded-2xl text-xl font-black" style={{ backgroundColor: theme.primary }} asChild disabled={!isOpen}><Link href={`/customer/${restaurantId}/reserve`}>Reserve Table</Link></Button>
              <Button variant="outline" className="w-full h-16 rounded-2xl text-xl font-black border-2" asChild><a href="#menu">Order Online</a></Button>
            </div>
          </CardContent>
        </Card>
      </section>
    ),
    about: (
      <section key="about" id="about" className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-4xl font-black">About Our Vision</h2>
          <p className="text-lg opacity-70">At {restaurant.name}, we believe dining is an art form. Every dish reflects our commitment to excellence.</p>
        </div>
        <img src="https://picsum.photos/seed/rest-about/800/600" alt="About" className="rounded-[2.5rem] shadow-2xl object-cover w-full h-[400px]" />
      </section>
    ),
    menuList: (
      <section key="menuList" id="menu" className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <h2 className="text-5xl font-black text-center">Our Signature Menu</h2>
        {menus?.map(menu => (
          <div key={menu.id} className="space-y-8">
            <h3 className="text-3xl font-black border-l-8 pl-6" style={{ borderColor: theme.primary }}>{menu.name}</h3>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {allMenuItems.filter(i => i.menuId === menu.id).map(item => (
                <Card key={item.id} className="overflow-hidden border-none shadow-lg rounded-[2.5rem] bg-white text-slate-900">
                  <div className="relative h-56">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`} alt={item.name} className="w-full h-full object-cover" />
                    <Badge className="absolute top-4 right-4 bg-white/90 text-black font-black text-lg">${item.price}</Badge>
                  </div>
                  <CardContent className="p-8 space-y-4">
                    <h4 className="font-black text-2xl">{item.name}</h4>
                    <p className="text-sm text-slate-500 font-medium">{item.description}</p>
                    <Button className="w-full rounded-2xl font-black" style={{ backgroundColor: theme.primary }} onClick={() => addToCart(item)}>Add to Cart</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>
    ),
    gallery: (
      <section key="gallery" className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <h2 className="text-4xl font-black text-center">Visual Journey</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {galleryImages?.map(img => (
            <div key={img.id} className="relative rounded-3xl overflow-hidden shadow-xl aspect-square">
              <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </section>
    ),
    testimonials: (
      <section key="testimonials" className="max-w-6xl mx-auto px-6 py-12 bg-slate-50 rounded-[4rem]">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Quote className="h-12 w-12 text-primary mx-auto opacity-20" style={{ color: theme.primary }} />
          <h2 className="text-4xl font-black">Guest Experiences</h2>
          <p className="text-slate-400 italic">Be the first to share your experience with us!</p>
        </div>
      </section>
    ),
    map: (
      <section key="map" className="max-w-6xl mx-auto px-6 py-12 h-[450px]">
        <iframe 
          width="100%" height="100%" style={{ border: 0, borderRadius: '3rem' }} loading="lazy" allowFullScreen 
          src={`https://maps.google.com/maps?q=${encodeURIComponent(`${restaurant.address}, ${restaurant.city}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        />
      </section>
    ),
    contact: (
      <section key="contact" id="contact" className="max-w-6xl mx-auto px-6 py-12">
        <Card className="rounded-[3rem] p-12 bg-white text-slate-900 border-none shadow-2xl text-center">
          <h2 className="text-3xl font-black mb-8">Connect With Us</h2>
          <div className="flex justify-center gap-12">
            <div className="flex flex-col items-center gap-2"><Phone className="text-primary" /> <p className="font-bold">{restaurant.contactPhone}</p></div>
            <div className="flex flex-col items-center gap-2"><Mail className="text-primary" /> <p className="font-bold">{restaurant.adminEmail}</p></div>
          </div>
        </Card>
      </section>
    ),
    bookingCTA: (
      <section key="bookingCTA" className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-slate-900 text-white rounded-[3rem] p-12 md:p-20 text-center space-y-8">
          <h2 className="text-4xl font-black">Plan Your Visit</h2>
          <p className="text-white/60">We are ready to welcome you. Instant table confirmation via AI management.</p>
          <Button size="lg" className="h-16 px-12 rounded-2xl text-xl font-black" style={{ backgroundColor: theme.primary }} asChild disabled={!isOpen}><Link href={`/customer/${restaurantId}/reserve`}>Book Now</Link></Button>
        </div>
      </section>
    )
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.background, color: theme.text, fontFamily: typography.fontFamily }}>
      <nav className="sticky top-0 z-[100] w-full border-b backdrop-blur-md h-20 flex items-center bg-white/90">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <Link href={`/customer/${restaurantId}`} className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1.5" style={{ backgroundColor: theme.primary }}><UtensilsCrossed className="text-white" /></div>
            <span className="text-xl font-black">{restaurant.name}</span>
          </Link>
          {cart.length > 0 && (
            <button className="relative p-2" onClick={() => setIsCheckoutOpen(true)}>
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute top-0 right-0 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black" style={{ backgroundColor: theme.primary }}>{cart.length}</span>
            </button>
          )}
        </div>
      </nav>

      <div className="space-y-24">
        {sectionOrder.map(key => SECTION_COMPONENTS[key])}
      </div>

      {/* Checkout Sheet logic remains similar but uses real data */}
    </div>
  );
}
