
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Check, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight, 
  Loader2, 
  Info,
  DollarSign,
  History,
  Lock
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function RestaurantBilling({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  // 1. Fetch Tiers
  const tiersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tiers'), orderBy('createdAt', 'asc'));
  }, [firestore]);
  const { data: tiers, isLoading: loadingTiers } = useCollection(tiersQuery);

  // 2. Fetch Current Restaurant
  const resRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant } = useDoc(resRef);

  const handleUpgradeSimulated = async (tier: any) => {
    setProcessing(true);
    // Simulate API call to Stripe/PayPal
    setTimeout(async () => {
      try {
        await setDoc(doc(firestore, 'restaurants', restaurantId), {
          tierId: tier.id,
          subscriptionStatus: 'active',
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        toast({
          title: "Plan Updated",
          description: `You are now on the ${tier.name} plan.`,
        });
      } catch (e) {
        toast({ variant: "destructive", title: "Update failed" });
      } finally {
        setProcessing(false);
      }
    }, 1500);
  };

  if (loadingTiers) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black mb-1 capitalize">{restaurant?.subscriptionStatus || 'Trial'}</div>
            <p className="text-xs opacity-80">Managing isolated tenant instance</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-xl"><Lock className="h-4 w-4 text-slate-400" /></div>
              <span className="font-bold text-slate-600">Secure Vault</span>
            </div>
            <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase text-primary">Manage</Button>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">$0.00</div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Pending verification</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">Available Plans</h2>
          <Badge className="bg-white/10 text-white border-none px-4 py-1.5 rounded-full font-bold">
            <Zap className="h-3 w-3 mr-2 text-amber-400 fill-current" /> Auto-Scaling Infrastructure
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers?.map((tier) => {
            const isCurrent = restaurant?.tierId === tier.id;
            return (
              <Card key={tier.id} className={cn(
                "relative flex flex-col border-none shadow-2xl rounded-[3rem] overflow-hidden transition-all duration-500",
                isCurrent ? "ring-4 ring-primary bg-white scale-105 z-10" : "bg-white/90 hover:bg-white"
              )}>
                <CardHeader className="pt-12 px-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-black text-slate-900">{tier.name}</CardTitle>
                      {isCurrent && <Badge className="bg-primary text-white font-black text-[9px] uppercase tracking-widest mt-2">Active Plan</Badge>}
                    </div>
                  </div>
                  <div className="mt-8">
                    <span className="text-5xl font-black tracking-tighter text-slate-900">{tier.price}</span>
                    <span className="text-slate-400 ml-1 font-bold text-lg">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 px-10 py-8">
                  <ul className="space-y-5">
                    {tier.features?.map((f: string) => (
                      <li key={f} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                        <div className="bg-primary/10 rounded-full p-1 mt-0.5"><Check className="h-3 w-3 text-primary" /></div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-10 pt-0 mt-auto">
                  <Button 
                    disabled={isCurrent || processing}
                    className={cn(
                      "w-full h-16 rounded-[1.5rem] font-black text-lg transition-all",
                      isCurrent ? "bg-slate-100 text-slate-400 cursor-default" : "bg-slate-900 hover:bg-black text-white shadow-xl"
                    )}
                    onClick={() => handleUpgradeSimulated(tier)}
                  >
                    {processing ? <Loader2 className="animate-spin" /> : isCurrent ? "Current Plan" : "Upgrade Instance"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10">
        <CardHeader className="p-10 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-2xl"><History className="text-primary h-6 w-6" /></div>
            <CardTitle className="text-2xl font-black text-white">Billing History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-20 text-center text-white/40">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-[10px] uppercase tracking-[0.2em]">No invoices issued yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
