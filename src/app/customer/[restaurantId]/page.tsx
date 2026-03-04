"use client";

import { use, useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, collection, addDoc, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  UtensilsCrossed, 
  MapPin, 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  Phone, 
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
  Image as ImageIcon
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
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { checkIsRestaurantOpen } from '@/lib/operating-hours';
import { generateEmailContent } from '@/ai/flows/generate-email-content';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { MenuStyle1, MenuStyle2, MenuStyle3, MenuStyle4 } from '@/components/menu-layouts';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

const DEFAULT_SECTION_ORDER = ['navbar', 'siteBanner', 'hero', 'welcomeCard', 'about', 'menuList', 'gallery', 'testimonials', 'map', 'contact', 'bookingCTA'];

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
  
  // Lightbox state
  const [selectedImage, setSelectedImage] = useState<any>(null);

  // Customer Delivery Info
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

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

  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const galleryQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'gallery');
  }, [firestore, restaurantId]);
  const { data: gallery } = useCollection(galleryQuery);

  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Handle Hydration Safe "Open" status
  useEffect(() => {
    if (operatingHours !== undefined) {
      setIsOpen(checkIsRestaurantOpen(operatingHours));
    }
  }, [operatingHours]);

  useEffect(() => {
    if (!firestore || !restaurantId || !menus) return;
    const fetchAllItems = async () => {
      setLoadingItems(true);
      const items: any[] = [];
      try {
        for (const menu of menus) {
          const querySnapshot = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', menu.id, 'items'));
          querySnapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id, menuId: menu.id });
          });
        }
        setAllMenuItems(items);
      } catch (e) {
        console.error("Error fetching menu items:", e);
      } finally {
        setLoadingItems(false);
      }
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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  const handleCheckout = async () => {
    if (!auth || !firestore || !restaurantId) return;

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please provide delivery and contact details." });
      return;
    }

    setIsProcessing(true);
    
    try {
      let user = auth.currentUser;
      if (!user) {
        const userCredential = await signInAnonymously(auth);
        user = userCredential.user;
      }

      // Generate a numeric-only order ID (6 digits)
      const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();

      const orderData = {
        orderNumber,
        customerId: user.uid,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        deliveryAddress: customerInfo.address,
        items: cart,
        totalAmount: total,
        currency: restaurant?.baseCurrency || 'USD',
        status: 'pending',
        paymentMethod,
        paymentStatus: paymentMethod === 'stripe' ? 'paid' : 'pending',
        createdAt: new Date().toISOString()
      };

      const ordersRef = collection(firestore, 'restaurants', restaurantId, 'orders');
      
      addDoc(ordersRef, orderData)
        .then(async () => {
          setCart([]);
          setLastOrderNumber(orderNumber);
          setOrderComplete(true);
          setIsCheckoutOpen(false);
          toast({ title: "Order Placed!" });

          generateEmailContent({
            type: 'order_confirmed',
            recipientName: customerInfo.name,
            restaurantName: restaurant?.name,
            details: `Order #: ${orderNumber}. Total: ${total} ${restaurant?.baseCurrency}. Items: ${cart.length}`
          }).then(emailContent => {
            addDoc(collection(firestore, 'mail'), {
              to: [customerInfo.email],
              message: emailContent,
              createdAt: new Date().toISOString()
            });
          }).catch(err => {
            console.warn("AI Email failed, but order was saved.", err);
          });
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: ordersRef.path,
            operation: 'create',
            requestResourceData: orderData,
          });
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
          setIsProcessing(false);
        });

    } catch (e: any) {
      toast({ variant: "destructive", title: "Checkout Error", description: "Could not initialize order session." });
      setIsProcessing(false);
    }
  };

  const sectionOrder = useMemo(() => {
    const rawOrder = designSettings?.sectionOrder || DEFAULT_SECTION_ORDER;
    const mergedOrder = [...rawOrder];
    DEFAULT_SECTION_ORDER.forEach(key => {
      if (!mergedOrder.includes(key)) {
        mergedOrder.push(key);
      }
    });
    // For visual consistency, ensure 'navbar' is always at index 0 if it is present
    const cleanOrder = mergedOrder.filter(k => k !== 'navbar');
    return ['navbar', ...cleanOrder];
  }, [designSettings?.sectionOrder]);

  if (loadingRes || loadingMenus || loadingItems) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10" /></div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center"><h1>Restaurant Not Found</h1></div>;

  const theme = designSettings?.theme || { primary: '#22c55e', background: '#ffffff', text: '#0f172a' };
  const currencySymbol = restaurant?.baseCurrency === 'USD' ? '$' : restaurant?.baseCurrency || '$';

  // Dynamic Section Rendering Engine
  const renderSection = (key: string) => {
    const config = designSettings?.sections?.[key];
    const isVisible = config ? config.visible : true;

    // navbar and menuList are special, but we handle toggle for others.
    if (!isVisible && key !== 'menuList' && key !== 'navbar') return null; 

    switch (key) {
      case 'navbar':
        return (
          <nav key={key} className="sticky top-0 z-[100] w-full border-b backdrop-blur-lg h-20 flex items-center bg-white/95" style={{ borderBottomColor: theme.primary + '20' }}>
            <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
              <Link href={`/customer/${restaurantId}`} className="flex items-center gap-2 shrink-0">
                {designSettings?.branding?.logoUrl ? (
                  <img src={designSettings.branding.logoUrl} alt="Logo" className="h-10 w-auto" />
                ) : (
                  <div className="bg-primary rounded-lg p-1.5" style={{ backgroundColor: theme.primary }}><UtensilsCrossed className="text-white" /></div>
                )}
                <span className="text-xl font-black hidden sm:inline" style={{ color: theme.text }}>{restaurant.name}</span>
              </Link>

              {/* Navigation Links Bar */}
              <div className="hidden md:flex items-center gap-8 mx-auto">
                <a href="#hero" className="text-sm font-bold hover:opacity-70 transition-opacity" style={{ color: theme.text }}>Home</a>
                <a href="#menu-list" className="text-sm font-bold hover:opacity-70 transition-opacity" style={{ color: theme.text }}>Menu</a>
                {designSettings?.sections?.about?.visible && <a href="#about" className="text-sm font-bold hover:opacity-70 transition-opacity" style={{ color: theme.text }}>About</a>}
                {designSettings?.sections?.gallery?.visible && <a href="#gallery" className="text-sm font-bold hover:opacity-70 transition-opacity" style={{ color: theme.text }}>Gallery</a>}
                {designSettings?.sections?.contact?.visible && <a href="#contact" className="text-sm font-bold hover:opacity-70 transition-opacity" style={{ color: theme.text }}>Contact</a>}
                <Link href={`/customer/${restaurantId}/reserve`} className="text-sm font-black px-4 py-2 rounded-full text-white shadow-md transition-transform hover:scale-105" style={{ backgroundColor: theme.primary }}>Book Table</Link>
              </div>

              <button className="relative p-2 shrink-0" onClick={() => setIsCheckoutOpen(true)}>
                <ShoppingBag className="h-6 w-6" style={{ color: theme.text }} />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black" style={{ backgroundColor: theme.primary }}>{cart.length}</span>
                )}
              </button>
            </div>
          </nav>
        );

      case 'siteBanner':
        return (
          <section key={key} id="site-banner" className="w-full h-24 md:h-40 overflow-hidden bg-slate-50 border-b">
            {designSettings?.branding?.siteBannerUrl ? (
              <img src={designSettings.branding.siteBannerUrl} className="w-full h-full object-cover" alt="Site Banner" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-center">
                <ImageIcon className="text-slate-200 h-8 w-8" />
              </div>
            )}
          </section>
        );

      case 'hero':
        return (
          <section key={key} id="hero" className="relative h-[500px] flex items-center justify-center text-center px-6 overflow-hidden">
            {designSettings?.branding?.bannerUrl ? (
              <img src={designSettings.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
            ) : (
              <div className="absolute inset-0 bg-slate-900" style={{ backgroundColor: theme.primary + '20' }} />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 space-y-6">
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">{restaurant.name}</h1>
              <p className="text-xl text-white/80 font-medium max-w-2xl mx-auto">{restaurant.cuisine?.join(' • ')}</p>
              <Button className="rounded-full h-14 px-10 font-black text-lg shadow-2xl" style={{ backgroundColor: theme.primary }} onClick={() => {
                const menuElement = document.getElementById('menu-list');
                menuElement?.scrollIntoView({ behavior: 'smooth' });
              }}>Explore Menu</Button>
            </div>
          </section>
        );

      case 'welcomeCard':
        const cardConfig = config || { showBadges: true, showRating: true, showLocation: true, showDeliveryInfo: true };
        return (
          <div key={key} className="max-w-4xl mx-auto px-6 -mt-16 relative z-20">
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              <CardContent className="p-10 md:p-12 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-2">
                    {cardConfig.showBadges && (
                      <Badge className={cn("px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest", isOpen ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                        {isOpen === null ? "Loading..." : isOpen ? "Open Now" : "Closed"}
                      </Badge>
                    )}
                    <h2 className="text-3xl font-black text-slate-900">Experience Excellence</h2>
                  </div>
                  {cardConfig.showRating && (
                    <div className="flex items-center gap-2 bg-slate-50 px-6 py-3 rounded-2xl border">
                      <Star className="h-5 w-5 text-amber-400 fill-current" />
                      <span className="font-black text-xl text-slate-900">4.9</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Rating</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                  {cardConfig.showLocation && (
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-xl text-primary" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}><MapPin className="h-5 w-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Us</p>
                        <p className="text-sm font-bold text-slate-700">{restaurant.city}, {restaurant.country}</p>
                      </div>
                    </div>
                  )}
                  {cardConfig.showDeliveryInfo && (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Truck className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery</p>
                          <p className="text-sm font-bold text-slate-700">30 - 45 Mins</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><Clock className="h-5 w-5" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Wait</p>
                          <p className="text-sm font-bold text-slate-700">15 Mins</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'about':
        return (
          <section key={key} id="about" className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge variant="outline" className="px-4 py-1 rounded-full text-primary border-primary/20 font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: theme.primary }}>Our Heritage</Badge>
              <h2 className="text-5xl font-black tracking-tight" style={{ color: theme.text }}>Crafting culinary stories since 2024.</h2>
              <p className="text-lg text-slate-500 leading-relaxed font-medium italic">
                "We believe that great food is more than just ingredients—it's a sensory journey. At {restaurant.name}, every dish is a masterpiece designed to delight and inspire."
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center"><User className="text-slate-400" /></div>
                <div>
                  <p className="font-bold" style={{ color: theme.text }}>Alex Rivers</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Executive Chef</p>
                </div>
              </div>
            </div>
            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl relative">
              <img src={`https://picsum.photos/seed/chef-${restaurantId}/800/800`} alt="Chef" className="w-full h-full object-cover" />
              <div className="absolute bottom-10 left-10 right-10 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="bg-primary p-2 rounded-lg" style={{ backgroundColor: theme.primary }}><UtensilsCrossed className="text-white h-4 w-4" /></div>
                  <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Michelin Standard Quality</p>
                </div>
              </div>
            </div>
          </section>
        );

      case 'menuList':
        const layoutStyle = designSettings?.menuLayout || 'style1';
        const LayoutComponent = {
          style1: MenuStyle1,
          style2: MenuStyle2,
          style3: MenuStyle3,
          style4: MenuStyle4
        }[layoutStyle as keyof typeof MenuStyle1] || MenuStyle1;

        return (
          <div key={key} id="menu-list">
            <LayoutComponent 
              menus={menus || []}
              allMenuItems={allMenuItems}
              currencySymbol={currencySymbol}
              theme={theme}
              addToCart={addToCart}
              cart={cart}
            />
          </div>
        );

      case 'gallery':
        return (
          <section key={key} id="gallery" className="py-20 bg-slate-50/50">
            <div className="max-w-7xl mx-auto px-6 space-y-12">
              <div className="text-center">
                <h2 className="text-4xl font-black" style={{ color: theme.text }}>Visual Atmosphere</h2>
                <p className="text-slate-400 font-medium mt-2">A glimpse into our dining experience.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-8">
                {gallery?.map((img, i) => (
                  <div 
                    key={i} 
                    className="relative rounded-[3rem] overflow-hidden shadow-2xl group w-full sm:w-[calc(50%-2rem)] lg:w-[calc(33.333%-2rem)] max-w-md aspect-square cursor-zoom-in bg-white/50"
                    onClick={() => setSelectedImage(img)}
                  >
                    <img 
                      src={img.url} 
                      alt={img.caption} 
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-8">
                      <div className="flex justify-end">
                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                          <Maximize2 className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      {img.caption && (
                        <p className="text-white text-xs font-bold uppercase tracking-[0.2em]">{img.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section key={key} id="testimonials" className="py-20 text-center">
            <div className="max-w-4xl mx-auto px-6 space-y-8">
              <Quote className="h-12 w-12 mx-auto text-primary opacity-20" style={{ color: theme.primary }} />
              <h2 className="text-4xl font-black" style={{ color: theme.text }}>What our guests say.</h2>
              <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-50 italic text-xl text-slate-600 leading-relaxed">
                "The atmosphere at {restaurant.name} is unparalleled. Every detail, from the ambient lighting to the exquisite presentation of the food, creates a dining experience that stays with you long after the meal is over."
              </div>
              <div className="flex flex-col items-center">
                <p className="font-black text-lg" style={{ color: theme.text }}>Sophia Loren</p>
                <div className="flex gap-1 mt-2 text-amber-400">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-current" />)}
                </div>
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section key={key} id="contact" className="py-20 border-t" style={{ borderTopColor: theme.primary + '10' }}>
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary" style={{ color: theme.primary }}>Reach Out</h3>
                <div className="flex items-center gap-4 text-slate-600 font-bold">
                  <Phone className="h-5 w-5 text-primary" style={{ color: theme.primary }} />
                  <span>{restaurant.contactPhone || 'No Phone listed'}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600 font-bold">
                  <Mail className="h-5 w-5 text-primary" style={{ color: theme.primary }} />
                  <span>{restaurant.adminEmail}</span>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary" style={{ color: theme.primary }}>Visit</h3>
                <div className="flex items-center gap-4 text-slate-600 font-bold">
                  <MapPin className="h-5 w-5 text-primary" style={{ color: theme.primary }} />
                  <span>{restaurant.address}, {restaurant.city}</span>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary" style={{ color: theme.primary }}>Opening Hours</h3>
                <p className="text-slate-500 text-sm font-medium">Monday — Sunday: 09:00 - 22:00</p>
              </div>
            </div>
          </section>
        );

      case 'map':
        const addressQuery = `${restaurant.address}, ${restaurant.city}, ${restaurant.country}`;
        return (
          <section key={key} id="map" className="h-96 w-full bg-slate-100 relative overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              title="Restaurant Location"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </section>
        );

      case 'bookingCTA':
        return (
          <section key={key} id="booking" className="py-20 px-6">
            <div className="max-w-6xl mx-auto rounded-[4rem] p-12 md:p-24 text-center space-y-10 text-white relative overflow-hidden shadow-2xl" style={{ backgroundColor: theme.primary }}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10 space-y-6">
                <CalendarDays className="h-16 w-16 mx-auto opacity-40" />
                <h2 className="text-4xl md:text-6xl font-black tracking-tight">Ready for a sensory journey?</h2>
                <p className="text-xl opacity-80 max-w-xl mx-auto font-medium">Secure your table now and let MyRestoNet AI guide your dining experience.</p>
                <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-full h-16 px-12 font-black text-xl shadow-xl" asChild>
                  <Link href={`/customer/${restaurantId}/reserve`}>Reserve Your Table</Link>
                </Button>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-24 scroll-smooth" style={{ backgroundColor: theme.background }}>
      {sectionOrder.map(renderSection)}

      {/* Cart Navigation (Floating) */}
      {cart.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-6">
          <Button 
            className="w-full h-16 rounded-full shadow-2xl flex items-center justify-between px-8 font-black text-lg transition-transform hover:scale-105 active:scale-95" 
            style={{ backgroundColor: theme.primary }}
            onClick={() => setIsCheckoutOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><ShoppingBag className="h-5 w-5" /></div>
              <span>View Your Order</span>
            </div>
            <div className="bg-white/95 text-slate-900 px-4 py-1 rounded-full text-sm">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
            </div>
          </Button>
        </div>
      )}

      {/* Gallery Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden border-none bg-black/90 rounded-[3rem]">
          <DialogTitle className="sr-only">Full Image View</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full text-white transition-all"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={selectedImage?.url} 
              alt={selectedImage?.caption || 'Full View'} 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl" 
            />
            {selectedImage?.caption && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10">
                <p className="text-white font-black text-sm uppercase tracking-[0.2em]">{selectedImage.caption}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <SheetContent className="w-full sm:max-w-md rounded-l-[3rem] p-0 flex flex-col">
          <SheetHeader className="p-8 border-b bg-slate-50/50">
            <SheetTitle className="text-2xl font-black">Your Order</SheetTitle>
            <SheetDescription className="text-slate-500">Provide your details for fulfillment.</SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.quantity} x {currencySymbol}{item.price}</p>
                  </div>
                  <span className="font-black">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center text-slate-400 py-10 italic">Cart is empty</p>}
            </div>

            {cart.length > 0 && (
              <div className="space-y-8 pt-8 border-t">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <User className="h-3 w-3" /> Contact & Delivery
                  </Label>
                  <div className="space-y-3">
                    <Input 
                      placeholder="Full Name" 
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="h-12 rounded-xl bg-slate-50 border-slate-100"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input 
                        placeholder="Email" 
                        type="email"
                        value={customerInfo.email}
                        onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
                        className="h-12 rounded-xl bg-slate-50 border-slate-100"
                      />
                      <Input 
                        placeholder="Phone" 
                        type="tel"
                        value={customerInfo.phone}
                        onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        className="h-12 rounded-xl bg-slate-50 border-slate-100"
                      />
                    </div>
                    <Textarea 
                      placeholder="Delivery Address" 
                      value={customerInfo.address}
                      onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                      className="rounded-xl bg-slate-50 border-slate-100 resize-none min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <CreditCard className="h-3 w-3" /> Payment Method
                  </Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid gap-3">
                    <div className={cn("flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === 'cod' ? "border-primary bg-primary/5" : "border-slate-100")}>
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1 flex items-center justify-between cursor-pointer">
                        <span className="font-bold">Cash on Delivery</span>
                        <Truck className="h-4 w-4 opacity-40" />
                      </Label>
                    </div>
                    {restaurant?.paymentsEnabled && (
                      <div className={cn("flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === 'stripe' ? "border-[#635BFF] bg-[#635BFF]/5" : "border-slate-100")}>
                        <RadioGroupItem value="stripe" id="stripe" />
                        <Label htmlFor="stripe" className="flex-1 flex items-center justify-between cursor-pointer">
                          <span className="font-bold">Pay with Card (Stripe)</span>
                          <CreditCard className="h-4 w-4 text-[#635BFF]" />
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center opacity-60 text-sm">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-black border-t border-white/10 pt-4">
                    <span>Total</span>
                    <span>{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="p-8 bg-slate-50/50 border-t">
            <Button 
              className="w-full h-16 rounded-2xl text-xl font-black shadow-xl" 
              style={{ backgroundColor: theme.primary }}
              disabled={cart.length === 0 || isProcessing || !customerInfo.name || !customerInfo.address}
              onClick={handleCheckout}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : orderComplete ? <CheckCircle2 /> : "Confirm Order"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={orderComplete} onOpenChange={setOrderComplete}>
        <DialogContent className="rounded-[3rem] text-center p-12">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <DialogTitle className="text-3xl font-black">Order Received!</DialogTitle>
          <DialogDescription className="text-slate-500 mt-2 mb-8">
            Order <strong>#{lastOrderNumber}</strong> is being prepared. An AI-generated receipt has been sent to <strong>{customerInfo.email}</strong>.
          </DialogDescription>
          <Button className="w-full h-14 rounded-2xl font-black" onClick={() => setOrderComplete(false)}>Perfect, Thanks!</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
