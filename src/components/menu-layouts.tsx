
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  UtensilsCrossed, 
  Sparkles, 
  LayoutGrid, 
  CheckCircle2, 
  Leaf, 
  Flame, 
  WheatOff, 
  ShieldCheck, 
  Star,
  Zap,
  Clock,
  XCircle,
  Settings2
} from 'lucide-react';
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
  return cart.filter(i => i.id === itemId).reduce((sum, i) => sum + i.quantity, 0);
};

const DietaryBadges = ({ item }: { item: any }) => {
  if (!item.dietary || item.dietary.length === 0) return null;
  const known = ['veg', 'vegan', 'gf', 'spicy', 'halal'];
  
  return (
    <div className="flex flex-wrap gap-1 mt-2 items-center">
      {item.dietary.includes('veg') && <Leaf className="h-3 w-3 text-emerald-500" title="Vegetarian" />}
      {item.dietary.includes('vegan') && <div className="flex gap-0.5"><Leaf className="h-3 w-3 text-emerald-500" title="Vegan" /><Leaf className="h-3 w-3 text-emerald-500" /></div>}
      {item.dietary.includes('gf') && <WheatOff className="h-3 w-3 text-amber-600" title="Gluten Free" />}
      {item.dietary.includes('spicy') && <Flame className="h-3 w-3 text-rose-500" title="Spicy" />}
      {item.dietary.includes('halal') && <ShieldCheck className="h-3 w-3 text-blue-500" title="Halal" />}
      {item.dietary.filter((d: string) => !known.includes(d)).map((d: string) => (
        <Badge key={d} variant="outline" className="text-[7px] px-1 py-0 h-3 border-slate-200 text-slate-400 uppercase font-black">
          {d}
        </Badge>
      ))}
    </div>
  );
};

/**
 * Style 1: Classic List
 */
export function MenuStyle1({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-16">
      {menus?.map(menu => {
        const menuItems = allMenuItems.filter(i => i.menuId === menu.id);
        if (menuItems.length === 0) return null;

        return (
          <div key={menu.id} className="space-y-10">
            <div className="flex items-center gap-6">
              <h3 className="text-3xl font-black whitespace-nowrap" style={{ color: theme.text }}>{menu.name}</h3>
              <div className="h-px bg-slate-100 flex-1" />
            </div>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {menuItems.map(item => {
                const quantity = getItemQuantity(cart, item.id);
                const isOutOfStock = item.isOutOfStock;
                const hasSpecialPrice = !!item.specialPrice;
                const hasAddons = item.addOns && item.addOns.length > 0;

                return (
                  <Card key={item.id} className={cn(
                    "overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-white group hover:scale-[1.02] transition-all duration-500",
                    isOutOfStock && "opacity-60"
                  )}>
                    <div className="relative h-64">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg flex flex-col items-end">
                        {hasSpecialPrice ? (
                          <>
                            <span className="text-[10px] text-slate-400 line-through font-bold">{currencySymbol}{item.price}</span>
                            <span className="font-black text-lg text-rose-600">{currencySymbol}{item.specialPrice}</span>
                          </>
                        ) : (
                          <span className="font-black text-lg text-slate-900">{currencySymbol}{item.price}</span>
                        )}
                      </div>

                      {item.isPopular && (
                        <div className="absolute top-4 left-4 bg-amber-400 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                          <Star className="h-3 w-3 fill-current" /> Popular
                        </div>
                      )}

                      {item.isCombo && (
                        <div className="absolute top-14 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                          <Zap className="h-3 w-2 fill-current" /> Combo
                        </div>
                      )}

                      {hasAddons && (
                        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm border">
                          Customizable
                        </div>
                      )}

                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                          <Badge className="bg-white text-black font-black uppercase px-6 py-2 rounded-xl text-sm">Out of Stock</Badge>
                        </div>
                      )}

                      {quantity > 0 && !isOutOfStock && (
                        <div className="absolute bottom-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5" style={{ backgroundColor: theme.primary }}>
                          <CheckCircle2 className="h-3 w-3" /> In Order ({quantity})
                        </div>
                      )}
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-2xl group-hover:text-primary transition-colors" style={{ color: theme.text }}>{item.name}</h4>
                          <DietaryBadges item={item} />
                        </div>
                        <p className="text-sm text-slate-400 font-medium line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                      <Button 
                        className="w-full h-12 rounded-2xl font-black shadow-lg" 
                        style={{ backgroundColor: theme.primary }} 
                        onClick={() => addToCart(item)}
                        disabled={isOutOfStock}
                      >
                        {isOutOfStock ? "Unavailable" : (hasAddons ? "Customize & Add" : (quantity > 0 ? `Add Another (${quantity})` : "Add to Order"))} 
                        {!isOutOfStock && <ChevronRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Style 2: Grid Cards
 */
export function MenuStyle2({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-24">
      <div className="flex items-center gap-4 border-l-8 pl-6" style={{ borderColor: theme.primary }}>
        <h2 className="text-6xl font-black tracking-tighter" style={{ color: theme.text }}>DINE.</h2>
      </div>
      {menus?.map(menu => {
        const menuItems = allMenuItems.filter(i => i.menuId === menu.id);
        if (menuItems.length === 0) return null;

        return (
          <div key={menu.id} className="space-y-12">
            <div className="space-y-2">
              <h3 className="text-4xl font-black uppercase tracking-tight" style={{ color: theme.text }}>{menu.name}</h3>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{menu.description || 'Masterfully prepared'}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {menuItems.map(item => {
                const quantity = getItemQuantity(cart, item.id);
                const isOutOfStock = item.isOutOfStock;
                const hasAddons = item.addOns && item.addOns.length > 0;
                
                return (
                  <Card key={item.id} className={cn(
                    "border-none shadow-md rounded-3xl bg-white overflow-hidden hover:shadow-2xl transition-all relative",
                    isOutOfStock && "opacity-60"
                  )}>
                    <div className="aspect-square relative">
                      <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/400`} className="w-full h-full object-cover" alt={item.name} />
                      
                      {item.isPopular && (
                        <div className="absolute top-2 left-2 bg-amber-400 text-white p-1.5 rounded-full shadow-lg">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}

                      {item.isCombo && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase shadow-lg flex items-center gap-1">
                          <Zap className="h-2 w-2 fill-current" /> Combo
                        </div>
                      )}

                      {hasAddons && (
                        <div className="absolute top-10 right-2 bg-white/90 px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-slate-500 shadow-sm border">
                          Custom
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                        <div className="flex flex-col">
                          {quantity > 0 && <span className="text-[9px] text-primary font-black uppercase mb-1" style={{ color: theme.primary }}>Added ({quantity})</span>}
                          <div className="flex items-baseline gap-2">
                            <span className="text-white font-black text-xl">
                              {currencySymbol}{item.specialPrice || item.price}
                            </span>
                            {item.specialPrice && (
                              <span className="text-white/60 text-[10px] line-through font-bold">
                                {currencySymbol}{item.price}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="icon" 
                          className="rounded-full h-10 w-10" 
                          style={{ backgroundColor: theme.primary }} 
                          onClick={() => addToCart(item)}
                          disabled={isOutOfStock}
                        >
                          {isOutOfStock ? <XCircle className="h-4 w-4" /> : (hasAddons ? <Settings2 className="h-4 w-4" /> : (quantity > 0 ? <span className="text-[10px] font-black">+{quantity}</span> : <ChevronRight className="h-4 w-4" />))}
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-lg leading-none" style={{ color: theme.text }}>{item.name}</h4>
                        <DietaryBadges item={item} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 uppercase font-black tracking-wider">{item.category}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Style 3: Category Tabs
 */
export function MenuStyle3({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  if (!menus || menus.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
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

        {menus.map(menu => {
          const menuItems = allMenuItems.filter(i => i.menuId === menu.id);
          return (
            <TabsContent key={menu.id} value={menu.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid gap-8 sm:grid-cols-2">
                {menuItems.map(item => {
                  const quantity = getItemQuantity(cart, item.id);
                  const isOutOfStock = item.isOutOfStock;
                  const hasAddons = item.addOns && item.addOns.length > 0;

                  return (
                    <div key={item.id} className={cn(
                      "flex gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all relative",
                      isOutOfStock && "opacity-60"
                    )}>
                      <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 shadow-lg relative">
                        <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/300/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                        {item.isPopular && <div className="absolute top-2 left-2 bg-amber-400 p-1 rounded-lg text-white"><Star className="h-3 w-3 fill-current" /></div>}
                        {item.isCombo && <div className="absolute top-2 right-2 bg-blue-500 p-1 rounded-lg text-white"><Zap className="h-3 w-3 fill-current" /></div>}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-black text-xl" style={{ color: theme.text }}>{item.name}</h4>
                              <DietaryBadges item={item} />
                            </div>
                            <div className="text-right">
                              <span className="font-black text-primary block" style={{ color: theme.primary }}>{currencySymbol}{item.specialPrice || item.price}</span>
                              {item.specialPrice && <span className="text-[10px] text-slate-400 line-through">{currencySymbol}{item.price}</span>}
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          className="w-fit p-0 h-auto font-black text-[10px] uppercase tracking-[0.2em] text-primary hover:bg-transparent flex items-center gap-2 mt-4"
                          onClick={() => addToCart(item)}
                          disabled={isOutOfStock}
                          style={{ color: theme.primary }}
                        >
                          {isOutOfStock ? "Out of Stock" : (hasAddons ? <><Settings2 className="h-4 w-4" /> Customize</> : (quantity > 0 ? (
                            <><CheckCircle2 className="h-4 w-4" /> Added ({quantity})</>
                          ) : (
                            <><LayoutGrid className="h-4 w-4" /> Add To Order</>
                          )))}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {menuItems.length === 0 && <p className="col-span-full text-center text-slate-400 italic py-10">No matching items in this category.</p>}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

/**
 * Style 4: Modern Minimal
 */
export function MenuStyle4({ menus, allMenuItems, currencySymbol, theme, addToCart, cart }: MenuLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-24">
      <div className="text-center">
        <Badge variant="outline" className="px-4 py-1 rounded-full mb-4 border-slate-200 font-bold uppercase text-[9px] tracking-[0.3em]">Signature Selection</Badge>
        <h2 className="text-5xl font-light italic" style={{ color: theme.text, fontFamily: 'serif' }}>The Culinary Journey</h2>
      </div>

      {menus?.map(menu => {
        const menuItems = allMenuItems.filter(i => i.menuId === menu.id);
        if (menuItems.length === 0) return null;

        return (
          <div key={menu.id} className="space-y-12">
            <div className="flex flex-col items-center">
              <h3 className="text-2xl font-bold uppercase tracking-[0.4em] mb-2" style={{ color: theme.text }}>{menu.name}</h3>
              <p className="text-slate-400 text-sm font-medium italic">{menu.description}</p>
            </div>
            <div className="space-y-16">
              {menuItems.map(item => {
                const quantity = getItemQuantity(cart, item.id);
                const isOutOfStock = item.isOutOfStock;
                const hasAddons = item.addOns && item.addOns.length > 0;

                return (
                  <div key={item.id} className={cn(
                    "grid grid-cols-1 md:grid-cols-4 gap-8 items-center border-b pb-12 border-slate-100 last:border-0 group",
                    isOutOfStock && "opacity-50"
                  )}>
                    <div className="md:col-span-1">
                      <div className="aspect-[4/5] rounded-lg overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 relative">
                        <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/500`} className="w-full h-full object-cover" alt={item.name} />
                        {item.isPopular && <div className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-lg"><Star className="h-3 w-3 text-amber-500 fill-current" /></div>}
                        {item.isCombo && <div className="absolute bottom-2 left-2 bg-blue-500/90 text-white px-2 py-0.5 rounded text-[8px] font-black">COMBO</div>}
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex justify-between items-baseline gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-3xl font-bold tracking-tight" style={{ color: theme.text }}>{item.name}</h4>
                            {quantity > 0 && <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-black" style={{ color: theme.primary }}>{quantity} in Order</Badge>}
                          </div>
                          <DietaryBadges item={item} />
                        </div>
                        <div className="h-px bg-slate-100 flex-1 dotted" />
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-bold">{currencySymbol}{item.specialPrice || item.price}</span>
                          {item.specialPrice && <span className="text-[10px] text-slate-400 line-through">{currencySymbol}{item.price}</span>}
                        </div>
                      </div>
                      <p className="text-slate-500 leading-loose text-lg">{item.description}</p>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button 
                        className="rounded-full px-8 h-12 font-black uppercase text-xs tracking-widest"
                        onClick={() => addToCart(item)}
                        disabled={isOutOfStock}
                        style={{ backgroundColor: theme.primary }}
                      >
                        {isOutOfStock ? "Sold Out" : (hasAddons ? "Customize" : (quantity > 0 ? `Add More (${quantity})` : "Select Item"))}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
