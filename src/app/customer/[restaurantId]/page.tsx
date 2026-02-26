
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

  // 2. Fetch Active Menus for this restaurant
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return query(
      collection(firestore, 'restaurants', restaurantId, 'menus'),
      where('isActive', '==', true)
    );
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Set default active menu once menus load
  useEffect(() => {
    if (menus && menus.length > 0 && !activeMenuId) {
      setActiveMenuId(menus[0].id);
    }
  }, [menus, activeMenuId]);

  // 3. Fetch Items for the currently selected active menu
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
          <p className="text-muted-foreground max-w-xs">We couldn't find the restaurant you're looking for. It may have moved or closed.</p>
        </div>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const currencySymbol = restaurant?.baseCurrency === 'GBP' ? '£' : (restaurant?.baseCurrency === 'USD' ? '$' : (restaurant?.baseCurrency === 'AUD' ? '$' : restaurant?.baseCurrency || '£'));
  const activeMenu = menus?.find(m => m.id === activeMenuId);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Navigation Overlay */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <Button variant="ghost" size="icon" asChild className="pointer-events-auto text-white bg-black/20 hover:bg-black/40 rounded-full">
          <Link href="/"><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
      </div>

      {/* Hero Header */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-primary/20">
        <img 
          src={`https://picsum.photos/seed/${restaurantId}/1200/600`}
          alt="Restaurant Cover" 
          className="w-full h-full object-cover brightness-75"
          data-ai-hint="restaurant interior"
        />
      </div>

      <div className="container max-w-4xl mx-auto px-4 -mt-12 relative z-10">
        <Card className="border-none shadow-xl mb-6">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-3xl font-headline font-bold text-primary">{restaurant?.name}</h1>
                <p className="text-muted-foreground">
                  {Array.isArray(restaurant?.cuisine) ? restaurant.cuisine.join(' • ') : restaurant?.cuisineType || 'International'} • {restaurant?.city}, {restaurant?.country}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                  <span className="flex items-center text-accent font-bold"><Star className="h-4 w-4 fill-current mr-1" /> 4.9 (Live)</span>
                  <span className="flex items-center text-muted-foreground"><Clock className="h-4 w-4 mr-1" /> 20-30 min</span>
                  <span className="flex items-center text-muted-foreground"><MapPin className="h-4 w-4 mr-1" /> {restaurant?.address}</span>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 hidden sm:block">
                <p className="text-xs uppercase text-muted-foreground font-bold">Store Status</p>
                <p className="text-sm font-semibold text-accent">Open for Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories / Menus Navigation Bar */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-40 -mx-4 px-4 py-4 border-b mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-4xl mx-auto">
            {menus && menus.length > 0 ? menus.map((m: any) => (
              <button
                key={m.id}
                onClick={() => setActiveMenuId(m.id)}
                className={cn(
                  "whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold transition-all",
                  activeMenuId === m.id 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {m.name}
              </button>
            )) : (
              <Badge variant="outline" className="whitespace-nowrap px-4 py-1.5 opacity-50">
                No active menus
              </Badge>
            )}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid gap-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-bold font-headline">
              {activeMenu?.name || 'Menu Items'}
            </h2>
            {activeMenu?.description && (
              <p className="text-xs text-muted-foreground italic max-w-[50%] text-right">{activeMenu.description}</p>
            )}
          </div>
          
          {loadingItems ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item: any) => (
                <Card key={item.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group h-full">
                  <div className="flex h-full">
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-lg font-bold text-primary">{currencySymbol}{item.price.toFixed(2)}</span>
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90 rounded-full h-10 w-10 p-0 shadow-lg shadow-primary/20" 
                          onClick={() => addToCart(item)}
                          disabled={item.isAvailable === false}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="w-28 sm:w-36 h-full overflow-hidden relative bg-muted shrink-0">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                      {item.isAvailable === false && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-2">
                          <Badge variant="destructive" className="text-[10px] uppercase">Sold Out</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl space-y-4">
              <div className="bg-muted p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground">This section is currently being updated. Check back soon!</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="w-full shadow-2xl bg-primary text-white h-16 text-lg font-bold flex justify-between px-8 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 px-2.5 py-1 rounded-lg text-sm">{cartCount}</div>
                  <span>Review Order</span>
                </div>
                <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2.5rem] border-none">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl font-headline font-bold text-center">Your Order</SheetTitle>
              </SheetHeader>
              <div className="py-2 space-y-6 overflow-y-auto max-h-[55vh] no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                    <ShoppingBag className="h-12 w-12 opacity-20" />
                    <span>Your cart is empty</span>
                  </div>
                ) : (
                  cart.map((entry) => (
                    <div key={entry.item.id} className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={entry.item.imageUrl || `https://picsum.photos/seed/${entry.item.id}/100/100`} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight">{entry.item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{currencySymbol}{entry.item.price.toFixed(2)} each</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white p-1 rounded-full border shadow-sm">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(entry.item.id, -1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-4 text-center font-bold text-sm">{entry.qty}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(entry.item.id, 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <SheetFooter className="absolute bottom-0 left-0 w-full p-6 bg-white border-t space-y-4 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="space-y-2 w-full">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{currencySymbol}{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Delivery / Service</span>
                    <span className="font-bold text-accent">FREE</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-primary">{currencySymbol}{cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                <Button className="w-full h-16 text-lg font-bold bg-primary rounded-2xl shadow-xl shadow-primary/20" disabled={cartCount === 0}>
                  Proceed to Checkout
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
