'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, UtensilsCrossed, Sparkles, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MenuLayoutProps {
  menus: any[] | null;
  allMenuItems: any[];
  currencySymbol: string;
  theme: { primary: string; text: string; background: string };
  addToCart: (item: any) => void;
  cart: any[];
}

const getItemQuantity = (cart: any[], itemId: string) => {
  return cart.find(i => i.id === itemId)?.quantity || 0;
};

/**
 * Style 1: Classic List
 */
export function MenuStyle1({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20 space-y-16">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black" style={{ color: theme.text }}>Our Curated Catalog</h2>
        <p className="text-slate-400 font-medium">Explore signature flavors crafted with passion.</p>
      </div>
      {menus?.map(menu => (
        <div key={menu.id} className="space-y-10">
          <div className="flex items-center gap-6">
            <h3 className="text-3xl font-black whitespace-nowrap" style={{ color: theme.text }}>{menu.name}</h3>
            <div className="h-px bg-slate-100 flex-1" />
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {allMenuItems.filter(i => i.menuId === menu.id).map(item => {
              const quantity = getItemQuantity(cart, item.id);
              return (
                <Card key={item.id} className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-white group hover:scale-[1.02] transition-all duration-500">
                  <div className="relative h-64">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg">
                      <span className="font-black text-lg text-slate-900">{currencySymbol}{item.price}</span>
                    </div>
                    {quantity > 0 && (
                      <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5" style={{ backgroundColor: theme.primary }}>
                        <CheckCircle2 className="h-3 w-3" /> Added ({quantity})
                      </div>
                    )}
                  </div>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-black text-2xl group-hover:text-primary transition-colors" style={{ color: theme.text }}>{item.name}</h4>
                      <p className="text-sm text-slate-400 font-medium line-clamp-2 leading-relaxed">{item.description}</p>
                    </div>
                    <Button className="w-full h-12 rounded-2xl font-black shadow-lg" style={{ backgroundColor: theme.primary }} onClick={() => addToCart(item)}>
                      {quantity > 0 ? `Add Another (${quantity})` : "Add to Selection"} <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Style 2: Grid Cards
 */
export function MenuStyle2({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-24">
      <div className="flex items-center gap-4 border-l-8 pl-6" style={{ borderColor: theme.primary }}>
        <h2 className="text-6xl font-black tracking-tighter" style={{ color: theme.text }}>DINE.</h2>
      </div>
      {menus?.map(menu => (
        <div key={menu.id} className="space-y-12">
          <div className="space-y-2">
            <h3 className="text-4xl font-black uppercase tracking-tight" style={{ color: theme.text }}>{menu.name}</h3>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{menu.description || 'Masterfully prepared'}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {allMenuItems.filter(i => i.menuId === menu.id).map(item => {
              const quantity = getItemQuantity(cart, item.id);
              return (
                <Card key={item.id} className="border-none shadow-md rounded-3xl bg-white overflow-hidden hover:shadow-2xl transition-all">
                  <div className="aspect-square relative">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/400`} className="w-full h-full object-cover" alt={item.name} />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                      <div className="flex flex-col">
                        {quantity > 0 && <span className="text-[9px] text-primary font-black uppercase mb-1" style={{ color: theme.primary }}>Added ({quantity})</span>}
                        <span className="text-white font-black text-xl">{currencySymbol}{item.price}</span>
                      </div>
                      <Button size="icon" className="rounded-full h-10 w-10" style={{ backgroundColor: theme.primary }} onClick={() => addToCart(item)}>
                        {quantity > 0 ? <span className="text-[10px] font-black">+{quantity}</span> : <ChevronRight />}
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h4 className="font-bold text-lg leading-none" style={{ color: theme.text }}>{item.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 uppercase font-black tracking-wider">{item.category}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Style 3: Category Tabs
 */
export function MenuStyle3({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  if (!menus || menus.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="flex flex-col items-center mb-16 space-y-4">
        <div className="w-16 h-1 bg-slate-900 rounded-full" style={{ backgroundColor: theme.primary }} />
        <h2 className="text-4xl font-black tracking-tight text-center" style={{ color: theme.text }}>Browse our Menu</h2>
      </div>

      <Tabs defaultValue={menus[0].id} className="space-y-12">
        <div className="sticky top-24 z-40 bg-white/80 backdrop-blur-md p-2 rounded-[2rem] border shadow-sm flex justify-center">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap justify-center gap-2">
            {menus.map(menu => (
              <TabsTrigger 
                key={menu.id} 
                value={menu.id}
                className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                style={{ '--primary': theme.primary } as any}
              >
                {menu.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {menus.map(menu => (
          <TabsContent key={menu.id} value={menu.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-8 sm:grid-cols-2">
              {allMenuItems.filter(i => i.menuId === menu.id).map(item => {
                const quantity = getItemQuantity(cart, item.id);
                return (
                  <div key={item.id} className="flex gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all relative">
                    <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/300/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-xl" style={{ color: theme.text }}>{item.name}</h4>
                          <span className="font-black text-primary" style={{ color: theme.primary }}>{currencySymbol}{item.price}</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-fit p-0 h-auto font-black text-[10px] uppercase tracking-[0.2em] text-primary hover:bg-transparent flex items-center gap-2 mt-4"
                        onClick={() => addToCart(item)}
                        style={{ color: theme.primary }}
                      >
                        {quantity > 0 ? (
                          <><CheckCircle2 className="h-4 w-4" /> Added ({quantity})</>
                        ) : (
                          <><PlusCircle className="h-4 w-4" /> Add To Order</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function PlusCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  );
}

/**
 * Style 4: Modern Minimal
 */
export function MenuStyle4({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 space-y-24">
      <div className="text-center">
        <Badge variant="outline" className="px-4 py-1 rounded-full mb-4 border-slate-200 font-bold uppercase text-[9px] tracking-[0.3em]">Signature Selection</Badge>
        <h2 className="text-5xl font-light italic serif" style={{ color: theme.text, fontFamily: 'serif' }}>The Culinary Journey</h2>
      </div>

      {menus?.map(menu => (
        <div key={menu.id} className="space-y-12">
          <div className="flex flex-col items-center">
            <h3 className="text-2xl font-bold uppercase tracking-[0.4em] mb-2" style={{ color: theme.text }}>{menu.name}</h3>
            <p className="text-slate-400 text-sm font-medium italic">{menu.description}</p>
          </div>
          <div className="space-y-16">
            {allMenuItems.filter(i => i.menuId === menu.id).map(item => {
              const quantity = getItemQuantity(cart, item.id);
              return (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center border-b pb-12 border-slate-100 last:border-0 group">
                  <div className="md:col-span-1">
                    <div className="aspect-[4/5] rounded-lg overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/500`} className="w-full h-full object-cover" alt={item.name} />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex justify-between items-baseline gap-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-3xl font-bold tracking-tight" style={{ color: theme.text }}>{item.name}</h4>
                        {quantity > 0 && <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-black" style={{ color: theme.primary }}>{quantity} in Cart</Badge>}
                      </div>
                      <div className="h-px bg-slate-100 flex-1 dotted" />
                      <span className="text-xl font-bold">{currencySymbol}{item.price}</span>
                    </div>
                    <p className="text-slate-500 leading-loose text-lg">{item.description}</p>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button 
                      className="rounded-full px-8 h-12 font-black uppercase text-xs tracking-widest"
                      onClick={() => addToCart(item)}
                      style={{ backgroundColor: theme.primary }}
                    >
                      {quantity > 0 ? `Added (${quantity})` : "Select Item"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
