
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, Star, Clock, MapPin, ChevronLeft, Plus, Minus, X } from 'lucide-react';
import { MOCK_RESTAURANTS, MOCK_MENU_ITEMS, MenuItem } from '@/lib/mock-data';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';

export default function CustomerOrderPage({ params }: { params: { restaurantId: string } }) {
  const restaurant = MOCK_RESTAURANTS.find(r => r.id === params.restaurantId) || MOCK_RESTAURANTS[0];
  const items = MOCK_MENU_ITEMS;
  
  const [cart, setCart] = useState<{item: MenuItem, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const cartTotal = cart.reduce((sum, entry) => sum + (entry.item.price * entry.qty), 0);
  const cartCount = cart.reduce((sum, entry) => sum + entry.qty, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src="https://picsum.photos/seed/header/1200/600" 
          alt="Restaurant Cover" 
          className="w-full h-full object-cover brightness-75"
        />
        <Button variant="ghost" size="icon" asChild className="absolute top-4 left-4 text-white bg-black/20 hover:bg-black/40">
          <Link href="/"><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
      </div>

      <div className="container max-w-4xl mx-auto px-4 -mt-12 relative z-10">
        <Card className="border-none shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-3xl font-headline font-bold text-primary">{restaurant.name}</h1>
                <p className="text-muted-foreground">{restaurant.cuisineType} • {restaurant.location}</p>
                <div className="flex items-center gap-4 text-sm mt-2">
                  <span className="flex items-center text-accent font-bold"><Star className="h-4 w-4 fill-current mr-1" /> 4.9 (500+)</span>
                  <span className="flex items-center text-muted-foreground"><Clock className="h-4 w-4 mr-1" /> 20-30 min</span>
                  <span className="flex items-center text-muted-foreground"><MapPin className="h-4 w-4 mr-1" /> 0.8 miles</span>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 hidden sm:block">
                <p className="text-xs uppercase text-muted-foreground font-bold">Store Hours</p>
                <p className="text-sm font-semibold">Open until 10:00 PM</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="flex gap-4 overflow-x-auto py-6 no-scrollbar">
          {['All Items', 'Pizza', 'Pasta', 'Sides', 'Desserts', 'Drinks'].map((cat) => (
            <Badge key={cat} variant={cat === 'All Items' ? 'default' : 'outline'} className="whitespace-nowrap px-4 py-1.5 cursor-pointer">
              {cat}
            </Badge>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid gap-6">
          <h2 className="text-xl font-bold font-headline px-1">Main Menu</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex h-full">
                  <div className="flex-1 p-4 space-y-2">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-bold text-primary">£{item.price.toFixed(2)}</span>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-full h-9 w-9 p-0" onClick={() => addToCart(item)}>
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="w-32 h-full overflow-hidden relative">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="w-full shadow-2xl bg-primary text-white h-14 text-lg font-bold flex justify-between px-6 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 px-2 py-0.5 rounded text-sm">{cartCount}</div>
                  <span>View Cart</span>
                </div>
                <span>£{cartTotal.toFixed(2)}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-none">
              <SheetHeader>
                <SheetTitle className="text-2xl font-headline font-bold text-center">Your Order</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-6 overflow-y-auto max-h-[50vh]">
                {cart.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">Your cart is empty</div>
                ) : (
                  cart.map((entry) => (
                    <div key={entry.item.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <img src={entry.item.imageUrl} className="w-16 h-16 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold">{entry.item.name}</p>
                          <p className="text-sm text-muted-foreground">£{(entry.item.price * entry.qty).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted p-1 rounded-full">
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
              <SheetFooter className="absolute bottom-0 left-0 w-full p-6 bg-white border-t space-y-4">
                <div className="flex justify-between items-center w-full">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold text-lg">£{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center w-full">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-bold text-accent">FREE</span>
                </div>
                <Button className="w-full h-14 text-lg font-bold bg-primary" disabled={cartCount === 0}>
                  Checkout • £{cartTotal.toFixed(2)}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
