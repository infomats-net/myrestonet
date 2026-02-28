"use client";

import { useState, use as reactUse, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Star, 
  Clock, 
  MapPin, 
  Plus, 
  Minus, 
  Loader2, 
  UtensilsCrossed, 
  Phone, 
  Mail, 
  Instagram, 
  Facebook, 
  Twitter, 
  AlertTriangle,
  Lock,
  Trophy,
  CreditCard,
  Wallet,
  Coins,
  CheckCircle2,
  Truck
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { checkIsRestaurantOpen, OperatingHours } from '@/lib/operating-hours';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function CustomerOrderPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = reactUse(params);
  const restaurantId = resolvedParams.restaurantId;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  // 1. Fetch Restaurant Data
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 2. Fetch Design Data
  const designRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'design', 'settings');
  }, [firestore, restaurantId]);
  const { data: design, isLoading: loadingDesign } = useDoc(designRef);

  // 3. Fetch Operating Hours
  const hoursRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'config', 'operatingHours');
  }, [firestore, restaurantId]);
  const { data: hours, isLoading: loadingHours } = useDoc<OperatingHours>(hoursRef);

  // 4. Fetch Active Menus
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return query(
      collection(firestore, 'restaurants', restaurantId, 'menus'),
      where('isActive', '==', true)
    );
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [showClosedAlert, setShowClosedAlert] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Checkout Form State
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  useEffect(() => {
    if (menus && menus.length > 0 && !activeMenuId) {
      setActiveMenuId(menus[0].id);
    }
  }, [menus, activeMenuId]);

  useEffect(() => {
    const checkStatus = () => setIsOpen(checkIsRestaurantOpen(hours));
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [hours]);

  useEffect(() => {
    if (restaurant?.enabledPaymentMethods?.length > 0) {
      setPaymentMethod(restaurant.enabledPaymentMethods[0]);
    }
  }, [restaurant]);

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId || !activeMenuId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus', activeMenuId, 'menuItems');
  }, [firestore, restaurantId, activeMenuId]);
  const { data: items, isLoading: loadingItems } = useCollection(itemsQuery);

  const [cart, setCart] = useState<{item: any, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (item: any) => {
    if (!isOpen) {
      setShowClosedAlert(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => i.item.id === itemId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  const subtotal = cart.reduce((sum, entry) => sum + (entry.item.price * entry.qty), 0);
  const deliveryCharge = restaurant?.deliveryChargeAmount || 0;
  const cartTotal = subtotal + deliveryCharge;
  const cartCount = cart.reduce((sum, entry) => sum + entry.qty, 0);

  const handleCompleteOrder = async () => {
    if (!auth || !firestore || !restaurantId) return;
    if (!deliveryAddress) {
      toast({ variant: "destructive", title: "Missing Address", description: "Please provide a delivery address." });
      return;
    }

    setCompletingOrder(true);
    try {
      // 1. Ensure user is authenticated (Anonymous fallback)
      let user = auth.currentUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }

      // 2. Create Order Header
      const ordersCol = collection(firestore, 'restaurants', restaurantId, 'orders');
      const orderData = {
        restaurantId,
        customerId: user.uid,
        status: 'pending',
        paymentMethod,
        paymentStatus: 'pending',
        subtotalAmount: subtotal,
        deliveryChargeAmount: deliveryCharge,
        totalAmount: cartTotal,
        deliveryAddress,
        customerNotes,
        adminUserIds: restaurant?.adminUserIds || [],
        createdAt: new Date().toISOString(),
        orderedAt: new Date().toISOString(),
      };

      const orderRef = await addDoc(ordersCol, orderData);

      // 3. Create Order Items
      const itemsCol = collection(firestore, 'restaurants', restaurantId, 'orders', orderRef.id, 'orderItems');
      for (const entry of cart) {
        await addDoc(itemsCol, {
          orderId: orderRef.id,
          menuItemId: entry.item.id,
          name: entry.item.name,
          quantity: entry.qty,
          unitPrice: entry.item.price,
          itemTotal: entry.item.price * entry.qty,
          adminUserIds: restaurant?.adminUserIds || [],
          customerId: user.uid,
          createdAt: new Date().toISOString(),
        });
      }

      setOrderSuccess(true);
      setCart([]);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Order Failed", description: error.message });
    } finally {
      setCompletingOrder(false);
    }
  };

  if (loadingRes || loadingDesign || loadingHours || (loadingMenus && !menus)) {
    return <div className="min-h-screen flex flex-col items-center justify-center space-y-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground font-medium animate-pulse">Syncing with Kitchen...</p></div>;
  }

  if (!restaurant) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6"><div className="bg-muted p-6 rounded-full"><UtensilsCrossed className="h-12 w-12 text-muted-foreground" /></div><div className="space-y-2"><h1 className="text-2xl font-bold">Restaurant Not Found</h1><p className="text-muted-foreground max-w-xs">We couldn't find the restaurant you're looking for.</p></div><Button asChild><Link href="/">Back to Home</Link></Button></div>;
  }

  const currencySymbol = restaurant?.baseCurrency === 'GBP' ? '£' : '$';
  const designStyles = {
    '--primary': design?.theme?.primary || '#22c55e',
    '--accent': design?.theme?.accent || '#16a34a',
    '--background': design?.theme?.background || '#FFFFFF',
    '--text': design?.theme?.text || '#1A1A1A',
    '--font-family': design?.typography?.fontFamily || 'Inter',
    '--heading-font': design?.typography?.headingFont || 'Inter',
    '--header-bg': design?.theme?.headerColor || '#FFFFFF',
    '--footer-bg': design?.theme?.footerColor || '#1A1A1A',
  } as React.CSSProperties;

  const fullAddressQuery = encodeURIComponent(`${restaurant?.address}, ${restaurant?.city}, ${restaurant?.country}`);
  const wc = design?.sections?.welcomeCard || { visible: true, showBadges: true, showRating: true, showDeliveryInfo: true, showLocation: true, showRanking: true };

  return (
    <div className="min-h-screen bg-background pb-24" style={designStyles}>
      <link href={`https://fonts.googleapis.com/css2?family=${designStyles['--font-family']?.toString().replace(' ', '+')}&family=${designStyles['--heading-font']?.toString().replace(' ', '+')}&display=swap`} rel="stylesheet" />
      {design?.customCss && <style dangerouslySetInnerHTML={{ __html: design.customCss }} />}

      <nav className="h-20 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm transition-all" style={{ backgroundColor: designStyles['--header-bg'] as string }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: designStyles['--primary'] as string }}><UtensilsCrossed className="h-5 w-5" /></div>
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: designStyles['--heading-font'] as string, color: designStyles['--text'] as string }}>{restaurant?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-8 text-[11px] font-bold tracking-[0.2em] uppercase mr-8" style={{ color: designStyles['--text'] as string, opacity: 0.7 }}>
            <a href="#menu" className="hover:opacity-100 transition-opacity">Menu</a>
            <a href="#about" className="hover:opacity-100 transition-opacity">About</a>
            <a href="#contact" className="hover:opacity-100 transition-opacity">Contact</a>
          </div>
          {isOpen ? <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-full animate-pulse flex items-center gap-2"><span className="w-2 h-2 bg-white rounded-full" />Open Now</Badge> : <Badge variant="destructive" className="font-bold px-4 py-1.5 rounded-full flex items-center gap-2"><Lock className="h-3 w-3" />Closed Now</Badge>}
        </div>
      </nav>

      {design?.sections?.hero?.visible !== false && (
        <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
          <img src={`https://picsum.photos/seed/${restaurantId}/1920/1080`} alt="Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-white text-5xl md:text-7xl font-black mb-6 leading-tight max-w-4xl" style={{ fontFamily: designStyles['--heading-font'] as string }}>{restaurant?.name}</h1>
            <p className="text-white/80 text-lg md:text-xl font-medium max-w-2xl mb-10">{restaurant?.description}</p>
            <Button size="lg" className="rounded-full h-16 px-12 text-lg font-bold shadow-2xl" style={{ backgroundColor: designStyles['--primary'] as string }} asChild><a href="#menu">Explore Menu</a></Button>
          </div>
        </div>
      )}

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        {wc.visible !== false && (
          <Card className="border-none shadow-2xl -mt-20 mb-16 overflow-hidden bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                <div className="space-y-4">
                  {wc.showBadges !== false && <div className="flex flex-wrap items-center justify-center md:justify-start gap-2"><Badge variant={isOpen ? "secondary" : "destructive"} className={cn("font-bold px-3 py-1", isOpen && "bg-primary/10 text-primary")}>{isOpen ? 'Open for Orders' : 'Closed for Orders'}</Badge><Badge variant="outline" className="font-bold border-primary/20 text-primary px-3 py-1">Michelin Recommended</Badge></div>}
                  <h2 className="text-4xl font-bold" style={{ color: designStyles['--text'] as string, fontFamily: designStyles['--heading-font'] as string }}>Welcome to {restaurant?.name}</h2>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm">
                    {wc.showRating !== false && <span className="flex items-center font-bold" style={{ color: designStyles['--accent'] as string }}><Star className="h-5 w-5 fill-current mr-2" /> 4.9 (500+ Reviews)</span>}
                    {wc.showDeliveryInfo !== false && <span className="flex items-center text-muted-foreground"><Clock className="h-5 w-5 mr-2" /> 15-25 min delivery</span>}
                    {wc.showLocation !== false && <span className="flex items-center text-muted-foreground"><MapPin className="h-5 w-5 mr-2" /> {restaurant?.address}</span>}
                  </div>
                </div>
                {wc.showRanking !== false && <div className="flex flex-col items-center md:items-end gap-3"><p className="text-xs uppercase text-muted-foreground font-black tracking-widest">Global Ranking</p><div className="text-5xl font-black text-primary">#14</div><p className="text-xs font-bold text-muted-foreground uppercase">Local Favorites</p></div>}
              </div>
            </CardContent>
          </Card>
        )}

        {design?.sections?.about?.visible !== false && (
          <section id="about" className="mb-24 px-8 py-20 bg-white rounded-[3rem] border-2 shadow-sm text-center">
            <h2 className="text-3xl font-black mb-8 uppercase tracking-widest" style={{ color: designStyles['--primary'] as string, fontFamily: designStyles['--heading-font'] as string }}>The Craft Story</h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <p className="text-lg text-slate-600 leading-relaxed font-medium">Established with a vision to bring global flavors to a local stage, {restaurant?.name} is built on the pillars of authenticity, innovation, and passion.</p>
              <div className="flex justify-center gap-4 pt-4"><Button variant="outline" className="rounded-full px-8">Read Full Story</Button><Button className="rounded-full px-8" style={{ backgroundColor: designStyles['--primary'] as string }}>Meet Our Chefs</Button></div>
            </div>
          </section>
        )}

        {design?.sections?.menuList?.visible !== false && (
          <section id="menu" className="mb-24">
            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
              <h2 className="text-4xl font-black" style={{ fontFamily: designStyles['--heading-font'] as string, color: designStyles['--text'] as string }}>Curated Menu</h2>
              <div className="flex gap-2 overflow-x-auto no-scrollbar bg-slate-100 p-2 rounded-2xl border">
                {menus?.map((m: any) => (
                  <button key={m.id} onClick={() => setActiveMenuId(m.id)} className={cn("whitespace-nowrap px-8 py-3 rounded-xl text-sm font-black transition-all", activeMenuId === m.id ? "text-white shadow-lg scale-105" : "text-slate-500 hover:bg-white/50")} style={activeMenuId === m.id ? { backgroundColor: designStyles['--primary'] as string } : {}}>{m.name}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {loadingItems ? <div className="col-span-full flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div> : items?.map((item: any) => {
                const qty = cart.find(i => i.item.id === item.id)?.qty || 0;
                return (
                  <Card key={item.id} className={cn("overflow-hidden border-none shadow-sm transition-all duration-300 group rounded-[2rem]", !isOpen ? "opacity-60 grayscale-[0.5] scale-95" : "hover:shadow-xl hover:-translate-y-1")}>
                    <div className="relative h-64 overflow-hidden bg-muted">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/600`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                      {!item.isAvailable && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center"><Badge variant="destructive" className="px-6 py-2 text-sm font-black uppercase">Sold Out</Badge></div>}
                      {isOpen ? (
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                          {qty > 0 && <Badge className="bg-white text-primary border-2 border-primary font-black px-3 py-1 shadow-lg animate-in zoom-in" style={{ color: designStyles['--primary'] as string, borderColor: designStyles['--primary'] as string }}>{qty} in cart</Badge>}
                          <Button size={qty > 0 ? "default" : "icon"} className={cn("rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95", qty > 0 ? "h-12 px-6" : "h-12 w-12")} onClick={() => addToCart(item)} style={{ backgroundColor: designStyles['--primary'] as string }}><Plus className={cn("h-6 w-6", qty > 0 && "mr-2")} />{qty > 0 && <span className="font-bold">Add more</span>}</Button>
                        </div>
                      ) : <div className="absolute top-4 right-4"><div className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white"><Lock className="h-5 w-5" /></div></div>}
                    </div>
                    <CardContent className="p-8">
                      <div className="flex justify-between items-start mb-4"><h3 className="font-bold text-xl leading-tight" style={{ fontFamily: designStyles['--heading-font'] as string, color: designStyles['--text'] as string }}>{item.name}</h3><span className="font-black text-lg" style={{ color: designStyles['--primary'] as string }}>{currencySymbol}{item.price.toFixed(2)}</span></div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 mb-6">{item.description}</p>
                      <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">{item.category}</Badge><Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">Recommended</Badge></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {design?.sections?.gallery?.visible !== false && (
          <section id="gallery" className="mb-24"><div className="text-center mb-16"><h2 className="text-4xl font-black mb-4" style={{ fontFamily: designStyles['--heading-font'] as string }}>Inside the Experience</h2><p className="text-slate-500 font-medium">A glimpse into our world of culinary artistry.</p></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[250px]"><div className="col-span-2 row-span-2 rounded-[2rem] overflow-hidden border-2 border-white shadow-xl"><img src={`https://picsum.photos/seed/gal1/800/800`} className="w-full h-full object-cover" alt="G1" /></div><div className="rounded-[2rem] overflow-hidden border-2 border-white shadow-lg"><img src={`https://picsum.photos/seed/gal2/400/400`} className="w-full h-full object-cover" alt="G2" /></div><div className="rounded-[2rem] overflow-hidden border-2 border-white shadow-lg"><img src={`https://picsum.photos/seed/gal3/400/400`} className="w-full h-full object-cover" alt="G3" /></div><div className="col-span-2 rounded-[2rem] overflow-hidden border-2 border-white shadow-lg"><img src={`https://picsum.photos/seed/gal4/800/400`} className="w-full h-full object-cover" alt="G4" /></div></div></section>
        )}

        {design?.sections?.testimonials?.visible !== false && (
          <section className="mb-24 py-20 px-8 bg-slate-50 rounded-[3rem] overflow-hidden"><div className="text-center mb-16"><h2 className="text-4xl font-black mb-4" style={{ fontFamily: designStyles['--heading-font'] as string }}>Voices of Delights</h2><p className="text-slate-500 font-medium">What our global community says about us.</p></div><div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">{[{ name: "Julianne Moore", role: "Food Critic", comment: "The attention to detail in every bite is extraordinary." }, { name: "Marco Rossellini", role: "Local Guide", comment: "The atmosphere alone is worth the visit." }, { name: "Elena Gilbert", role: "Travel Blogger", comment: "Finally, a restaurant that delivers on its promises." }].map((t, idx) => (<div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-xl hover:-translate-y-2"><div className="absolute -top-6 left-10 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: designStyles['--primary'] as string }}><Star className="h-6 w-6 fill-current" /></div><p className="italic text-slate-600 font-medium mb-8 leading-relaxed">"{t.comment}"</p><div><p className="font-black text-slate-900">{t.name}</p><p className="text-xs uppercase font-bold tracking-widest text-primary" style={{ color: designStyles['--accent'] as string }}>{t.role}</p></div></div>))}</div></section>
        )}

        {design?.sections?.contact?.visible !== false && (
          <section id="contact" className="mb-24"><div className="grid md:grid-cols-2 gap-12 bg-white rounded-[3rem] p-12 border-2 shadow-sm items-center"><div className="space-y-8"><div><h2 className="text-4xl font-black mb-4" style={{ fontFamily: designStyles['--heading-font'] as string }}>Get in Touch</h2><p className="text-slate-500 font-medium leading-relaxed">We'd love to hear from you.</p></div><div className="space-y-6"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary" style={{ color: designStyles['--primary'] as string }}><Phone className="h-5 w-5" /></div><div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Call Us</p><p className="font-bold text-slate-900">{restaurant?.contactPhone || '+1 234 567 890'}</p></div></div><div className="flex items-center gap-4"><div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary" style={{ color: designStyles['--primary'] as string }}><Mail className="h-5 w-5" /></div><div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Us</p><p className="font-bold text-slate-900">{restaurant?.contactEmail}</p></div></div><div className="flex items-center gap-4"><div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary" style={{ color: designStyles['--primary'] as string }}><MapPin className="h-5 w-5" /></div><div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Location</p><p className="font-bold text-slate-900">{restaurant?.address}</p></div></div></div></div><div className="relative group rounded-[2.5rem] overflow-hidden border-2 shadow-2xl h-[400px]"><img src={`https://picsum.photos/seed/contact/800/800`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Contact" /><div className="absolute inset-0 bg-black/20" /></div></div></section>
        )}

        {design?.sections?.map?.visible !== false && (
          <section className="mb-24 h-[500px] rounded-[3rem] overflow-hidden border-2 shadow-inner relative"><iframe width="100%" height="100%" className="absolute inset-0 w-full h-full border-0 grayscale-[0.2] brightness-90" loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${fullAddressQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`} /><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"><div className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-primary flex items-center gap-4 pointer-events-auto" style={{ borderColor: designStyles['--primary'] as string }}><div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary" style={{ color: designStyles['--primary'] as string }}><MapPin className="h-6 w-6" /></div><div><p className="font-black text-slate-900">Find Us Here</p><p className="text-xs text-slate-500">{restaurant?.city}, {restaurant?.country}</p></div></div></div></section>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-50">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild><Button className="w-full shadow-2xl h-20 text-xl font-black flex justify-between px-10 rounded-[2.5rem] transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: designStyles['--primary'] as string }}><span className="bg-white/20 px-4 py-1.5 rounded-2xl text-sm">{cartCount}</span><span>Review Selection</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></Button></SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[4rem] px-10 pt-16">
              <SheetHeader className="mb-8"><SheetTitle className="text-4xl font-black" style={{ fontFamily: designStyles['--heading-font'] as string }}>Your Order</SheetTitle></SheetHeader>
              <div className="py-6 space-y-6 overflow-y-auto max-h-[50vh] no-scrollbar">
                {cart.map((entry) => (
                  <div key={entry.item.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 transition-all hover:bg-slate-100/50"><div className="flex gap-6 items-center"><div className="w-20 h-20 rounded-[1.5rem] bg-muted overflow-hidden border-2 border-white shadow-md"><img src={entry.item.imageUrl || `https://picsum.photos/seed/${entry.item.id}/100/100`} className="w-full h-full object-cover" alt="Item" /></div><div><p className="font-black text-lg leading-tight">{entry.item.name}</p><p className="text-sm font-bold text-primary opacity-80" style={{ color: designStyles['--primary'] as string }}>{currencySymbol}{entry.item.price}</p></div></div><div className="flex items-center gap-6"><Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-2" onClick={() => updateQty(entry.item.id, -1)}><Minus className="h-4 w-4" /></Button><span className="text-xl font-black min-w-[2ch] text-center">{entry.qty}</span><Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-2" onClick={() => updateQty(entry.item.id, 1)}><Plus className="h-4 w-4" /></Button></div></div>
                ))}
              </div>
              <SheetFooter className="absolute bottom-0 left-0 w-full p-10 border-t bg-white/95 backdrop-blur-md rounded-b-[4rem]"><div className="flex justify-between w-full mb-8 font-black text-3xl"><span>Subtotal</span><span style={{ color: designStyles['--primary'] as string }}>{currencySymbol}{subtotal.toFixed(2)}</span></div><Button className="w-full h-20 text-2xl font-black rounded-[2.5rem] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: designStyles['--primary'] as string }} onClick={() => setIsCheckoutOpen(true)}>Proceed to Checkout</Button></SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Checkout Dialog */}
      <AlertDialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <AlertDialogContent className="rounded-[3rem] max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black">Finalize Your Order</AlertDialogTitle>
            <AlertDialogDescription>Complete the details below to send your order to the kitchen.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-6 space-y-8">
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Delivery Address</Label>
              <Input placeholder="Enter your full address..." className="h-14 rounded-2xl bg-slate-50" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </div>
            
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {restaurant?.enabledPaymentMethods?.includes('stripe') && (
                  <Label className={cn("flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all", paymentMethod === 'stripe' ? "border-primary bg-primary/5" : "border-slate-100")}>
                    <RadioGroupItem value="stripe" className="sr-only" />
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span className="font-bold">Stripe Payments</span>
                  </Label>
                )}
                {restaurant?.enabledPaymentMethods?.includes('paypal') && (
                  <Label className={cn("flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all", paymentMethod === 'paypal' ? "border-primary bg-primary/5" : "border-slate-100")}>
                    <RadioGroupItem value="paypal" className="sr-only" />
                    <Wallet className="h-5 w-5 text-blue-600" />
                    <span className="font-bold">PayPal</span>
                  </Label>
                )}
                {restaurant?.enabledPaymentMethods?.includes('cash_on_delivery') && (
                  <Label className={cn("flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all", paymentMethod === 'cash_on_delivery' ? "border-primary bg-primary/5" : "border-slate-100")}>
                    <RadioGroupItem value="cash_on_delivery" className="sr-only" />
                    <Coins className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold">Cash on Delivery</span>
                  </Label>
                )}
              </RadioGroup>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">{currencySymbol}{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span>Delivery Charge</span><span className="font-bold">{currencySymbol}{deliveryCharge.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between text-2xl font-black"><span>Total</span><span style={{ color: designStyles['--primary'] as string }}>{currencySymbol}{cartTotal.toFixed(2)}</span></div>
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-2xl h-14 font-bold" onClick={() => setIsCheckoutOpen(false)}>Back</Button>
            <Button className="rounded-2xl h-14 font-black flex-1 text-lg shadow-xl" style={{ backgroundColor: designStyles['--primary'] as string }} onClick={handleCompleteOrder} disabled={completingOrder}>
              {completingOrder ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Complete Order"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <AlertDialogContent className="rounded-[3rem] text-center p-12">
          <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6"><CheckCircle2 className="h-12 w-12" /></div>
          <AlertDialogHeader><AlertDialogTitle className="text-3xl font-black">Order Received!</AlertDialogTitle><AlertDialogDescription className="text-lg">Your culinary journey is underway. We'll start preparing your meal right now.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-8 justify-center sm:justify-center"><AlertDialogAction className="rounded-2xl h-14 px-12 font-black bg-primary" onClick={() => setOrderSuccess(false)}>Awesome!</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClosedAlert} onOpenChange={setShowClosedAlert}><AlertDialogContent className="rounded-[2rem]"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black flex items-center gap-3"><div className="bg-destructive/10 p-3 rounded-2xl text-destructive"><AlertTriangle className="h-6 w-6" /></div>Restaurant Closed Now</AlertDialogTitle><AlertDialogDescription className="text-lg py-4">We are sorry! We aren't taking orders right now. Please come back soon.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setShowClosedAlert(false)} className="h-14 rounded-2xl font-black text-lg bg-primary">Got it, thanks!</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <footer className="py-20 text-center border-t-4" style={{ backgroundColor: designStyles['--footer-bg'] as string, borderColor: designStyles['--primary'] as string }}>
        <div className="container max-w-4xl mx-auto px-8"><div className="mb-10 flex justify-center"><div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl" style={{ backgroundColor: designStyles['--primary'] as string }}><UtensilsCrossed className="h-8 w-8" /></div></div><h3 className="text-2xl font-black text-white mb-4 uppercase tracking-[0.5em]" style={{ fontFamily: designStyles['--heading-font'] as string }}>{restaurant?.name} Global</h3><Separator className="bg-white/10 mb-10" /><p className="text-[10px] font-bold uppercase tracking-widest text-white/20">© 2024 {restaurant?.name} • Powered by MyRestoNet Architecture</p></div>
      </footer>
    </div>
  );
}