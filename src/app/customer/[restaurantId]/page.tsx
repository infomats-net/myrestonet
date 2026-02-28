
"use client";

import { use, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Loader2, UtensilsCrossed, MapPin, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CustomerStorefront({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const firestore = useFirestore();

  // 1. Fetch Restaurant Info (Target Structure)
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 2. Fetch Nested Menu Items (Strict Multi-tenant path)
  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menu');
  }, [firestore, restaurantId]);
  const { data: menuItems, isLoading: loadingMenu } = useCollection(menuQuery);

  if (loadingRes || loadingMenu) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
    </div>
  );

  if (!restaurant) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md w-full text-center p-12 space-y-4 rounded-3xl border-none shadow-xl">
        <UtensilsCrossed className="h-16 w-16 text-slate-200 mx-auto" />
        <h1 className="text-2xl font-black text-slate-900">Restaurant Not Found</h1>
        <p className="text-muted-foreground leading-relaxed">The restaurant link you followed might be incorrect or expired.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
        <header className="space-y-4 text-center">
          <div className="bg-primary/10 w-20 h-20 rounded-3xl flex items-center justify-center text-primary mx-auto shadow-sm border border-primary/5">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">{restaurant.name}</h1>
            <p className="text-slate-500 font-medium flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> {restaurant.city}, {restaurant.country}
            </p>
          </div>
        </header>

        <section className="space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-black text-slate-900">Seasonal Menu</h2>
            <Badge variant="outline" className="font-bold uppercase tracking-widest text-[10px]">{menuItems?.length || 0} Items</Badge>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            {menuItems?.map(item => (
              <Card key={item.id} className="overflow-hidden border-none shadow-md rounded-[2rem] hover:shadow-xl transition-all group">
                <CardContent className="p-8 flex justify-between items-center">
                  <div className="space-y-2">
                    <h3 className="font-black text-xl text-slate-900 group-hover:text-primary transition-colors">{item.name}</h3>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold uppercase text-[9px] tracking-wider">
                      {item.category}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-2xl text-primary">${item.price}</p>
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">In Stock</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!menuItems || menuItems.length === 0) && (
              <div className="col-span-full py-24 text-center space-y-4 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium italic">No dishes are currently available at this location.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
