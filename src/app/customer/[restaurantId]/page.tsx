
"use client";

import { use, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Loader2, UtensilsCrossed, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CustomerStorefront({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const firestore = useFirestore();

  // 1. Fetch Restaurant Info
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 2. Fetch Nested Menu Items (Multi-tenant path)
  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menu');
  }, [firestore, restaurantId]);
  const { data: menuItems, isLoading: loadingMenu } = useCollection(menuQuery);

  if (loadingRes || loadingMenu) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  if (!restaurant) return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Restaurant Not Found</h1></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-bold text-primary">{restaurant.name}</h1>
        <p className="text-muted-foreground flex items-center justify-center gap-2"><MapPin className="h-4 w-4" /> {restaurant.city}, {restaurant.country}</p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b pb-2">Our Menu</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {menuItems?.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <Badge variant="outline" className="mt-1">{item.category}</Badge>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">${item.price}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!menuItems || menuItems.length === 0) && <p className="text-muted-foreground italic">No menu items available yet.</p>}
        </div>
      </section>
    </div>
  );
}
