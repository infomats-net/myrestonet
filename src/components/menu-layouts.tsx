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
  Settings2,
  Sparkle,
  TrendingUp,
  History
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface MenuLayoutProps {
  menus: any[] | null;
  allMenuItems: any[];
  currencySymbol: string;
  theme: { primary: string; text: string; background: string };
  addToCart: (item: any) => void;
  cart: any[];
  bestSellerIds?: Set<string>;
}

const ItemBadges = ({ item, isBestSeller }: { item: any, isBestSeller: boolean }) => {
  const isLTO = item.isLTO && item.ltoExpiry && new Date(item.ltoExpiry) > new Date();
  
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
      {isLTO && (
        <div className="bg-rose-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 animate-pulse">
          <History className="h-3 w-3" /> Ends Soon
        </div>
      )}
      {isBestSeller && (
        <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
          <Star className="h-3 w-3 fill-current" /> Best Seller
        </div>
      )}
      {item.isNew && (
        <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
          <Sparkle className="h-3 w-3 fill-current" /> New
        </div>
      )}
      {item.quantityDiscounts?.length > 0 && (
        <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" /> Multi-Buy Deal
        </div>
      )}
    </div>
  );
};

export function MenuStyle2({ menus, allMenuItems, currencySymbol, theme, addToCart, cart, bestSellerIds }: MenuLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto py-10 space-y-24">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {allMenuItems.map(item => {
          const isBestSeller = bestSellerIds?.has(item.id) || false;
          
          return (
            <Card key={item.id} className={cn(
              "border-none shadow-md rounded-[2.5rem] bg-white overflow-hidden hover:shadow-2xl transition-all relative group",
              item.isOutOfStock && "opacity-60"
            )}>
              <div className="aspect-square relative overflow-hidden">
                <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/400`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                <ItemBadges item={item} isBestSeller={isBestSeller} />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                  <p className="text-white text-[10px] font-medium leading-relaxed line-clamp-3 mb-4">{item.description}</p>
                  <Button className="w-full rounded-xl font-black h-10 text-xs" style={{ backgroundColor: theme.primary }} onClick={() => addToCart(item)}>
                    {item.addOns?.length > 0 ? "Customize" : "Quick Add"}
                  </Button>
                </div>

                {!item.isOutOfStock && (
                  <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-lg">
                    <span className="font-black text-sm text-slate-900">{currencySymbol}{item.specialPrice || item.price}</span>
                  </div>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-lg leading-tight truncate">{item.name}</h4>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">{item.category}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Additional styles (MenuStyle1, 3, 4) should follow similar patterns for badges
export function MenuStyle1(props: MenuLayoutProps) { return <MenuStyle2 {...props} />; }
export function MenuStyle3(props: MenuLayoutProps) { return <MenuStyle2 {...props} />; }
export function MenuStyle4(props: MenuLayoutProps) { return <MenuStyle2 {...props} />; }
