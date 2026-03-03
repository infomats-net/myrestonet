
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Loader2, 
  Zap, 
  Globe,
  Coins,
  ShieldCheck,
  Info
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function PaymentsManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const resRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  
  const { data: restaurant, isLoading } = useDoc(resRef);

  const handleConnectStripe = async () => {
    setConnecting(true);
    // Simulate Stripe Connect OAuth Onboarding
    setTimeout(async () => {
      try {
        await updateDoc(doc(firestore, 'restaurants', restaurantId), {
          stripeAccountId: `acct_${Math.random().toString(36).substring(7)}`,
          paymentsEnabled: true,
          updatedAt: serverTimestamp()
        });
        toast({
          title: "Stripe Connected",
          description: "Your restaurant can now accept online card payments.",
        });
      } catch (e) {
        toast({ variant: "destructive", title: "Connection Failed" });
      } finally {
        setConnecting(false);
      }
    }, 2000);
  };

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="rounded-[2rem] border-none shadow-lg bg-primary/5 border border-primary/10">
        <CardContent className="p-6 flex items-start gap-4">
          <Info className="h-6 w-6 text-primary shrink-0 mt-1" />
          <div className="space-y-1">
            <h3 className="font-black text-primary uppercase text-xs tracking-widest">Merchant Payouts Configuration</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Use this section to connect your restaurant's bank account via **Stripe Connect**. This allows you to accept card payments from your customers and receive payouts directly. 
              *Note: This is separate from your platform subscription billing.*
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <CardHeader className="p-10 border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-[#635BFF] p-3 rounded-2xl">
                    <CreditCard className="text-white h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black">Stripe Connect</CardTitle>
                    <CardDescription>Direct multi-currency payouts to your bank account.</CardDescription>
                  </div>
                </div>
                <Badge className={restaurant?.paymentsEnabled ? "bg-emerald-500" : "bg-slate-400"}>
                  {restaurant?.paymentsEnabled ? "Enabled" : "Disconnected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              {!restaurant?.paymentsEnabled ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                    <Zap className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-black text-blue-900">Activate Online Payments</h4>
                      <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                        Connect your Stripe account to securely process customer orders. Supports Credit Cards, Apple Pay, and Google Pay in <strong>{restaurant?.baseCurrency}</strong>.
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full h-16 rounded-2xl bg-[#635BFF] hover:bg-[#5249e0] text-white font-black text-lg shadow-xl"
                    onClick={handleConnectStripe}
                    disabled={connecting}
                  >
                    {connecting ? <Loader2 className="animate-spin mr-2" /> : <ExternalLink className="mr-2" />}
                    Connect with Stripe
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Connected Account</p>
                      <p className="font-mono text-sm mt-2 text-slate-900">{restaurant.stripeAccountId}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Settlement Currency</p>
                      <p className="font-black text-lg mt-1 text-slate-900">{restaurant.baseCurrency}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black">View Dashboard</Button>
                    <Button variant="ghost" className="flex-1 h-14 rounded-2xl text-destructive font-black">Disconnect</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white p-10">
            <h3 className="text-xl font-black mb-6">Payment Configuration</h3>
            <div className="space-y-4">
              {[
                { label: 'Platform Commission', value: '5.0%', icon: Coins },
                { label: 'Payout Schedule', value: 'Daily', icon: Globe },
                { label: 'Security Level', value: '3D Secure 2', icon: ShieldCheck }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium opacity-70">{item.label}</span>
                  </div>
                  <span className="font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-white text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h4 className="text-lg font-black">Verified Account</h4>
            <p className="text-sm text-slate-500 mt-2">Your business identity has been verified by the MyRestoNet automated compliance system.</p>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h4 className="font-black text-amber-900">Notice</h4>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              Ensure your Stripe account settings match the <strong>{restaurant?.country}</strong> business registration details provided during onboarding to avoid payout delays.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
