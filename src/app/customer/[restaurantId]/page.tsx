"use client";

import { useState, use as reactUse, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Clock, MapPin, ChevronLeft, Plus, Minus, Loader2, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function CustomerOrderPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = reactUse(params);
  const restaurantId = resolvedParams.restaurantId;
  const firestore = useFirestore();

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
  const { data: design } = useDoc(designRef);

  // 3. Fetch Active Menus for this restaurant
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return query(
      collection(firestore, 'restaurants', restaurantId, 'menus'),
      where('isActive', '==', true)
    );
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (menus && menus.length > 0 && !activeMenuId) {
      setActiveMenuId(menus[0].id);
    }
  }, [menus, activeMenuId]);

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId || !activeMenuId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus', activeMenuId, 'menuItems');
  }, [firestore, restaurantId, activeMenuId]);
  const { data: items, isLoading: loadingItems } = useCollection(itemsQuery);

  const [cart, setCart] = useState<{item: any, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => {
      const newCart = prev.map(i => {
        if (i.item.id === itemId) {
          const newQty = i.qty + delta;
          return newQty > 0 ? { ...i, qty: newQty } : null;
        }
        return i;
      }).filter((i): i is {item: any, qty: number} => i !== null);
      return newCart;
    });
  };

  const cartTotal = cart.reduce((sum, entry) => sum + (entry.item.price * entry.qty), 0);
  const cartCount = cart.reduce((sum, entry) => sum + entry.qty, 0);

  if (loadingRes || (loadingMenus && !menus)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Opening Menu...</p>
      </div>
    );
  }

  if (!restaurant && !loadingRes) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="bg-muted p-6 rounded-full">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Restaurant Not Found</h1>
          <p className="text-muted-foreground max-w-xs">We couldn't find the restaurant you're looking for.</p>
        </div>
        <Button asChild><Link href="/">Back to Home</Link></Button>
      </div>
    );
  }

  const currencySymbol = restaurant?.baseCurrency === 'GBP' ? '£' : '$';
  const activeMenu = menus?.find(m => m.id === activeMenuId);

  // Dynamic Styles from Design Config
  const designStyles = {
    '--primary': design?.theme?.primary || '#42668A',
    '--accent': design?.theme?.accent || '#53C683',
    '--background': design?.theme?.background || '#FFFFFF',
    '--text': design?.theme?.text || '#1A1A1A',
    '--font-family': design?.typography?.fontFamily || 'Inter',
    '--heading-font': design?.typography?.headingFont || 'Inter',
    '--header-bg': design?.theme?.headerColor || '#FFFFFF',
    '--footer-bg': design?.theme?.footerColor || '#1A1A1A',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background pb-24" style={designStyles}>
      {/* Dynamic Font Import */}
      <link href={`https://fonts.googleapis.com/css2?family=${designStyles['--font-family']?.toString().replace(' ', '+')}&family=${designStyles['--heading-font']?.toString().replace(' ', '+')}&display=swap`} rel="stylesheet" />

      {/* Custom CSS Injection */}
      {design?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: design.customCss }} />
      )}

      {/* Hero Section */}
      {design?.sections?.hero?.visible !== false && (
        <div className="relative h-48 md:h-64 overflow-hidden bg-primary/20">
          <img 
            src={`https://picsum.photos/seed/${restaurantId}/1200/600`}
            alt="Restaurant Cover" 
            className="w-full h-full object-cover brightness-75"
          />
        </div>
      )}

      <div className="container max-w-4xl mx-auto px-4 -mt-12 relative z-10">
        <Card className="border-none shadow-xl mb-6">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold hero-title" style={{ color: designStyles['--primary'] as string, fontFamily: designStyles['--heading-font'] as string }}>{restaurant?.name}</h1>
                <p className="text-muted-foreground text-sm">
                  {Array.isArray(restaurant?.cuisine) ? restaurant.cuisine.join(' • ') : 'International'} • {restaurant?.city}, {restaurant?.country}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                  <span className="flex items-center font-bold" style={{ color: designStyles['--accent'] as string }}><Star className="h-4 w-4 fill-current mr-1" /> 4.9 (Live)</span>
                  <span className="flex items-center text-muted-foreground"><Clock className="h-4 w-4 mr-1" /> 20-30 min</span>
                  <span className="flex items-center text-muted-foreground"><MapPin className="h-4 w-4 mr-1" /> {restaurant?.address}</span>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 hidden sm:block">
                <p className="text-xs uppercase text-muted-foreground font-bold">Store Status</p>
                <p className="text-sm font-semibold" style={{ color: designStyles['--accent'] as string }}>Open for Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        {design?.sections?.about?.visible && (
          <div className="mb-10 px-4 py-8 bg-white rounded-2xl border shadow-sm text-center about-section">
            <h2 className="text-xl font-bold mb-4" style={{ color: designStyles['--primary'] as string, fontFamily: designStyles['--heading-font'] as string }}>Our Story</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {restaurant?.description}
            </p>
          </div>
        )}

        {/* Categories Bar */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-40 -mx-4 px-4 py-4 border-b mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-4xl mx-auto">
            {menus?.map((m: any) => (
              <button
                key={m.id}
                onClick={() => setActiveMenuId(m.id)}
                className={cn(
                  "whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold transition-all",
                  activeMenuId === m.id 
                    ? "text-white shadow-md" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                style={activeMenuId === m.id ? { backgroundColor: designStyles['--primary'] as string } : {}}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="grid gap-6 menu-section">
          <h2 className="text-2xl font-bold px-1" style={{ fontFamily: designStyles['--heading-font'] as string }}>{activeMenu?.name || 'Menu Items'}</h2>
          {loadingItems ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin opacity-20" /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items?.map((item: any) => (
                <Card key={item.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex h-36">
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-base leading-tight" style={{ fontFamily: designStyles['--heading-font'] as string }}>{item.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold" style={{ color: designStyles['--primary'] as string }}>{currencySymbol}{item.price.toFixed(2)}</span>
                        <Button 
                          size="sm" 
                          className="rounded-full h-8 w-8 p-0" 
                          onClick={() => addToCart(item)}
                          style={{ backgroundColor: designStyles['--primary'] as string }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="w-28 h-full relative bg-muted">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} className="w-full h-full object-cover" />
                      {!item.isAvailable && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Badge variant="destructive">Sold Out</Badge></div>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button className="w-full shadow-2xl h-16 text-lg font-bold flex justify-between px-8 rounded-2xl" style={{ backgroundColor: designStyles['--primary'] as string }}>
                <span className="bg-white/20 px-2 py-1 rounded-lg text-sm">{cartCount}</span>
                <span>Review Order</span>
                <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[2rem]">
              <SheetHeader><SheetTitle>Your Order</SheetTitle></SheetHeader>
              <div className="py-6 space-y-4 overflow-y-auto max-h-[50vh]">
                {cart.map((entry) => (
                  <div key={entry.item.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                        <img src={entry.item.imageUrl || `https://picsum.photos/seed/${entry.item.id}/100/100`} className="w-full h-full object-cover" />
                      </div>
                      <div><p className="font-bold text-sm">{entry.item.name}</p><p className="text-xs opacity-60">{currencySymbol}{entry.item.price}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(entry.item.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="text-sm font-bold">{entry.qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(entry.item.id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <SheetFooter className="absolute bottom-0 left-0 w-full p-6 border-t bg-white">
                <div className="flex justify-between w-full mb-4 font-bold text-lg"><span>Total</span><span>{currencySymbol}{cartTotal.toFixed(2)}</span></div>
                <Button className="w-full h-14 text-lg font-bold rounded-xl" style={{ backgroundColor: designStyles['--primary'] as string }}>Place Order</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Footer Section */}
      <footer className="mt-20 py-10 text-center border-t" style={{ backgroundColor: designStyles['--footer-bg'] as string }}>
        <p className="text-xs font-bold uppercase tracking-widest text-white/50">© 2024 {restaurant?.name} Global</p>
      </footer>
    </div>
  );
}
