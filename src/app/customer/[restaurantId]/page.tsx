"use client";

import { useState, use as reactUse, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Lock,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  Truck,
  User,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { checkIsRestaurantOpen, OperatingHours } from '@/lib/operating-hours';
import { signInAnonymously } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  // 4. Fetch Payments Config
  const paymentsRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'config', 'payments');
  }, [firestore, restaurantId]);
  const { data: paymentsConfig } = useDoc(paymentsRef);

  // 5. Fetch Active Menus
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
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Form State
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('cod');

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
  const deliveryFee = paymentsConfig?.deliveryCharge || 0;
  const total = subtotal + deliveryFee;
  const cartCount = cart.reduce((sum, entry) => sum + entry.qty, 0);

  const handlePlaceOrder = async () => {
    if (!auth || !firestore || !restaurantId) return;
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      toast({ variant: "destructive", title: "Missing Info", description: "Please provide your contact and delivery details." });
      return;
    }

    setIsOrdering(true);
    try {
      // 1. Sign in anonymously if not already authed
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // 2. Create the order
      const orderData = {
        restaurantId,
        customerId: auth.currentUser?.uid,
        customerInfo,
        items: cart.map(c => ({
          id: c.item.id,
          name: c.item.name,
          price: c.item.price,
          qty: c.qty
        })),
        paymentMethod,
        subtotal,
        deliveryFee,
        total,
        status: 'pending',
        currency: restaurant?.baseCurrency || 'USD',
        adminUserIds: restaurant?.adminUserIds || [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'restaurants', restaurantId, 'orders'), orderData);
      
      setOrderComplete(true);
      setCart([]);
      setIsCartOpen(false);
      setIsCheckoutMode(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Order Failed", description: error.message });
    } finally {
      setIsOrdering(false);
    }
  };

  if (loadingRes || loadingDesign || loadingHours || (loadingMenus && !menus)) {
    return <div className="min-h-screen flex flex-col items-center justify-center space-y-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground font-medium animate-pulse">Syncing with Kitchen...</p></div>;
  }

  if (!restaurant) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6"><div className="bg-muted p-6 rounded-full"><UtensilsCrossed className="h-12 w-12 text-muted-foreground" /></div><div className="space-y-2"><h1 className="text-2xl font-bold">Restaurant Not Found</h1><p className="text-muted-foreground max-w-xs">We couldn't find the restaurant you're looking for.</p></div><Button asChild><Link href="/">Back to Home</Link></Button></div>;
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-slate-50">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900">Order Confirmed!</h1>
          <p className="text-slate-500 max-w-md mx-auto">Thank you for dining with us. Your meal is being prepared and will be with you shortly.</p>
        </div>
        <Card className="w-full max-w-md border-none shadow-xl rounded-[2.5rem] p-8 bg-white">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Estimated Time</span>
              <span className="font-black text-slate-900">25-35 Mins</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Payment Method</span>
              <span className="font-black text-slate-900 uppercase">{paymentMethod}</span>
            </div>
          </div>
        </Card>
        <Button size="lg" className="rounded-full px-12 h-16 text-lg font-black" onClick={() => setOrderComplete(false)}>Return to Menu</Button>
      </div>
    );
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

  const availableMethods = [
    { id: 'stripe', label: 'Credit Card', enabled: paymentsConfig?.methods?.stripe },
    { id: 'paypal', label: 'PayPal', enabled: paymentsConfig?.methods?.paypal },
    { id: 'cod', label: 'Cash on Delivery', enabled: paymentsConfig?.methods?.cod !== false },
  ].filter(m => m.enabled);

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
            <SheetContent side="bottom" className="h-[90vh] rounded-t-[4rem] px-6 md:px-10 pt-12 overflow-hidden flex flex-col">
              <SheetHeader className="mb-6 shrink-0 text-center md:text-left">
                <SheetTitle className="text-3xl md:text-4xl font-black flex items-center gap-3 justify-center md:justify-start" style={{ fontFamily: designStyles['--heading-font'] as string }}>
                  {isCheckoutMode ? <><Truck className="h-8 w-8 text-primary" /> Delivery Details</> : <><ShoppingBag className="h-8 w-8 text-primary" /> Your Order</>}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {!isCheckoutMode ? (
                  <div className="space-y-4">
                    {cart.map((entry) => (
                      <div key={entry.item.id} className="flex justify-between items-center p-4 md:p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:bg-slate-100/50">
                        <div className="flex gap-4 md:gap-6 items-center">
                          <div className="w-16 h-16 rounded-[1.2rem] bg-muted overflow-hidden border-2 border-white shadow-md shrink-0">
                            <img src={entry.item.imageUrl || `https://picsum.photos/seed/${entry.item.id}/100/100`} className="w-full h-full object-cover" alt="Item" />
                          </div>
                          <div>
                            <p className="font-black text-base md:text-lg leading-tight">{entry.item.name}</p>
                            <p className="text-sm font-bold text-primary opacity-80" style={{ color: designStyles['--primary'] as string }}>{currencySymbol}{entry.item.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 md:gap-6">
                          <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-full border-2" onClick={() => updateQty(entry.item.id, -1)}><Minus className="h-4 w-4" /></Button>
                          <span className="text-lg md:text-xl font-black min-w-[2ch] text-center">{entry.qty}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-full border-2" onClick={() => updateQty(entry.item.id, 1)}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right duration-300 px-1">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><User className="h-3 w-3" /> Contact Information</h4>
                        <div className="grid gap-4">
                          <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase ml-1">Full Name</Label><Input value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-slate-100" placeholder="e.g. John Doe" /></div>
                          <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase ml-1">Phone Number</Label><Input value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-slate-100" placeholder="e.g. +1 234 567 890" /></div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MapPin className="h-3 w-3" /> Delivery Address</h4>
                        <Textarea value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="min-h-[100px] rounded-2xl bg-slate-50 border-slate-100 p-4" placeholder="Enter your full street address, apartment number, and any special instructions..." />
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><CreditCard className="h-3 w-3" /> Payment Method</h4>
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid gap-3">
                          {availableMethods.map(m => (
                            <Label key={m.id} className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === m.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")}>
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={m.id} className="sr-only" />
                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === m.id ? "border-primary" : "border-slate-300")}>
                                  {paymentMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                                <span className="font-bold text-slate-700">{m.label}</span>
                              </div>
                              <CreditCard className="h-5 w-5 text-slate-300" />
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <SheetFooter className="shrink-0 pt-6 border-t bg-white mt-auto">
                <div className="w-full space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-400 text-sm font-bold uppercase tracking-wider"><span>Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
                    {deliveryFee > 0 && <div className="flex justify-between text-slate-400 text-sm font-bold uppercase tracking-wider"><span>Delivery Fee</span><span>{currencySymbol}{deliveryFee.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-black text-3xl md:text-4xl text-slate-900 pt-2 border-t border-dashed"><span>Total</span><span style={{ color: designStyles['--primary'] as string }}>{currencySymbol}{total.toFixed(2)}</span></div>
                  </div>
                  
                  {isCheckoutMode ? (
                    <div className="flex gap-4">
                      <Button variant="outline" className="h-16 flex-1 rounded-[2rem] font-black text-lg border-2" onClick={() => setIsCheckoutMode(false)}>Back</Button>
                      <Button className="h-16 flex-[2] rounded-[2rem] font-black text-xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: designStyles['--primary'] as string }} onClick={handlePlaceOrder} disabled={isOrdering}>
                        {isOrdering ? <Loader2 className="h-6 w-6 animate-spin" /> : "Confirm Order"}
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-black rounded-[2rem] md:rounded-[2.5rem] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] group" style={{ backgroundColor: designStyles['--primary'] as string }} onClick={() => setIsCheckoutMode(true)}>
                      Go to Checkout <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <AlertDialog open={showClosedAlert} onOpenChange={setShowClosedAlert}><AlertDialogContent className="rounded-[2rem]"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black flex items-center gap-3"><div className="bg-destructive/10 p-3 rounded-2xl text-destructive"><AlertTriangle className="h-6 w-6" /></div>Restaurant Closed Now</AlertDialogTitle><AlertDialogDescription className="text-lg py-4">We are sorry! We aren't taking orders right now. Please come back soon.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setShowClosedAlert(false)} className="h-14 rounded-2xl font-black text-lg bg-primary">Got it, thanks!</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <footer className="py-20 text-center border-t-4" style={{ backgroundColor: designStyles['--footer-bg'] as string, borderColor: designStyles['--primary'] as string }}>
        <div className="container max-w-4xl mx-auto px-8"><div className="mb-10 flex justify-center"><div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl" style={{ backgroundColor: designStyles['--primary'] as string }}><UtensilsCrossed className="h-8 w-8" /></div></div><h3 className="text-2xl font-black text-white mb-4 uppercase tracking-[0.5em]" style={{ fontFamily: designStyles['--heading-font'] as string }}>{restaurant?.name} Global</h3><Separator className="bg-white/10 mb-10" /><p className="text-[10px] font-bold uppercase tracking-widest text-white/20">© 2024 {restaurant?.name} • Powered by MyRestoNet Architecture</p></div>
      </footer>
    </div>
  );
}