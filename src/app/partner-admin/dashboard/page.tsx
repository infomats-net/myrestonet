
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  ChevronRight,
  Loader2,
  Info
} from 'lucide-react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PartnerDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  // Query restaurants assigned to this partner
  const restaurantsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'restaurants'), where('partnerId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: restaurants, isLoading } = useCollection(restaurantsQuery);

  const totalVolume = 0; // Aggregation from sub-tenants pending
  const commissionRate = 0; // Fetched from partner profile pending
  const totalCommission = 0;

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Partner Portal</h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Grow your merchant network and track earnings.</p>
        </div>
        <Button className="rounded-2xl h-12 shadow-xl" asChild>
          <Link href="/super-admin/tenants/new"><Plus className="mr-2" /> Onboard Restaurant</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Active Tenants</CardTitle>
            <Store className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent><div className="text-4xl font-black">{restaurants?.length || 0}</div></CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-4xl font-black">${totalVolume.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg bg-primary text-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-70">Your Earnings</CardTitle>
            <DollarSign className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent><div className="text-4xl font-black">${totalCommission.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Rate</CardTitle>
            <Badge className="bg-primary/10 text-primary">{commissionRate}%</Badge>
          </CardHeader>
          <CardContent><div className="text-4xl font-black">Commission</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-white border-b py-8 px-10">
            <CardTitle className="text-2xl font-black">Managed Restaurants</CardTitle>
            <CardDescription>Real-time status of your onboarded merchants.</CardDescription>
          </CardHeader>
          <div className="divide-y bg-white">
            {restaurants?.map(res => (
              <div key={res.id} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-primary group-hover:scale-110 transition-transform">{res.name[0]}</div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">{res.name}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">ID: {res.id.slice(0, 8)}</Badge>
                      {res.city}, {res.country}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push(`/restaurant-admin/dashboard?impersonate=${res.id}`)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            ))}
            {(!restaurants || restaurants.length === 0) && (
              <div className="py-20 text-center text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="font-bold text-[10px] uppercase tracking-widest">No restaurants onboarded yet</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white p-10 space-y-8">
            <h2 className="text-2xl font-black">Payout Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-sm opacity-60 font-bold uppercase tracking-widest">Pending</span>
                <span className="text-2xl font-black text-primary">$0.00</span>
              </div>
            </div>
            <Button className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black" disabled>No Settlements Pending</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
