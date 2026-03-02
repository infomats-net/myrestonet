"use client";

import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Utensils, CalendarDays, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Suspense } from 'react';

function HeaderContent() {
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile } = useDoc(userProfileRef);
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  if (loadingRes) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="flex items-center gap-4 flex-1">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 w-9 h-9 rounded-xl flex items-center justify-center text-primary border border-primary/5 shrink-0">
          <Utensils className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none truncate">
            {restaurant?.name || 'Untitled'}
          </h1>
          <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider mt-0.5">Merchant Dashboard</p>
        </div>
      </div>
      
      <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild className="rounded-lg h-8 px-3 text-[11px] font-bold border-slate-200 hover:bg-slate-50 transition-all">
          <Link href={effectiveRestaurantId ? `/customer/${effectiveRestaurantId}/reserve` : "#"} target="_blank">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> 
            <span className="hidden md:inline text-blue-600">Booking Page</span>
            <span className="md:hidden text-blue-600">Book</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="rounded-lg h-8 px-3 text-[11px] font-bold border-slate-200 hover:bg-slate-50 transition-all">
          <Link href={effectiveRestaurantId ? `/customer/${effectiveRestaurantId}` : "#"} target="_blank">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> 
            <span className="hidden md:inline text-blue-600">Live Store</span>
            <span className="md:hidden text-blue-600">Store</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function RestaurantHeaderInfo() {
  return (
    <Suspense fallback={<div className="h-4 w-32 bg-slate-100 animate-pulse rounded" />}>
      <HeaderContent />
    </Suspense>
  );
}
