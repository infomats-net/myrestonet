
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Settings2, 
  ShoppingBag, 
  CalendarDays, 
  Truck, 
  Store, 
  Star, 
  Palette, 
  Loader2, 
  Save,
  Info,
  ShieldCheck
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface RestaurantFeatures {
  onlineOrdering: boolean;
  tableReservations: boolean;
  delivery: boolean;
  pickup: boolean;
  loyaltyProgram: boolean;
  menuCustomization: boolean;
}

const DEFAULT_FEATURES: RestaurantFeatures = {
  onlineOrdering: true,
  tableReservations: true,
  delivery: true,
  pickup: true,
  loyaltyProgram: true,
  menuCustomization: true,
};

export function FeatureControlPanel({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const featuresRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'features', 'settings');
  }, [firestore, restaurantId]);

  const { data: featuresData, isLoading } = useDoc(featuresRef);
  const [features, setFeatures] = useState<RestaurantFeatures>(DEFAULT_FEATURES);

  useEffect(() => {
    if (featuresData) {
      setFeatures({ ...DEFAULT_FEATURES, ...featuresData });
    }
  }, [featuresData]);

  const handleToggle = async (key: keyof RestaurantFeatures, value: boolean) => {
    if (!firestore || !restaurantId) return;
    
    // Update local state for immediate feedback
    const updatedFeatures = { ...features, [key]: value };
    setFeatures(updatedFeatures);

    try {
      await setDoc(doc(firestore, 'restaurants', restaurantId, 'features', 'settings'), {
        ...updatedFeatures,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast({
        title: "Feature Updated",
        description: `${key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())} has been ${value ? 'enabled' : 'disabled'}.`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update feature setting." });
      // Revert local state on error
      setFeatures(features);
    }
  };

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const FEATURE_LIST = [
    { 
      key: 'onlineOrdering', 
      label: 'Online Ordering', 
      icon: ShoppingBag, 
      description: 'Allow customers to place orders directly from your storefront.',
      color: 'text-primary'
    },
    { 
      key: 'tableReservations', 
      label: 'Table Reservations', 
      icon: CalendarDays, 
      description: 'Enable the smart reservation engine and guestbook.',
      color: 'text-blue-600'
    },
    { 
      key: 'delivery', 
      label: 'Delivery Service', 
      icon: Truck, 
      description: 'Offer delivery options to customers in your service area.',
      color: 'text-orange-500'
    },
    { 
      key: 'pickup', 
      label: 'Store Pickup', 
      icon: Store, 
      description: 'Allow customers to collect their orders from your physical location.',
      color: 'text-emerald-600'
    },
    { 
      key: 'loyaltyProgram', 
      label: 'Loyalty & Rewards', 
      icon: Star, 
      description: 'Automated points tracking and rewards for repeat customers.',
      color: 'text-amber-500'
    },
    { 
      key: 'menuCustomization', 
      label: 'Advanced Customization', 
      icon: Palette, 
      description: 'Enable add-ons, modifiers, and complex item options.',
      color: 'text-purple-500'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/5">
            <Settings2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Feature Control</h1>
            <p className="text-muted-foreground text-sm font-medium">Activate or decommission core modules for this instance.</p>
          </div>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-500" />
          <span className="text-[10px] font-black uppercase text-blue-700 tracking-widest">Isolation Guard Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TooltipProvider>
          {FEATURE_LIST.map((feature) => (
            <Card key={feature.key} className="rounded-[2rem] border-none shadow-lg overflow-hidden bg-white hover:shadow-xl transition-all">
              <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-slate-50 border border-slate-100 ${feature.color}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">{feature.label}</CardTitle>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-slate-300 hover:text-primary transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl p-3 max-w-xs bg-slate-900 text-white border-none shadow-2xl">
                    <p className="text-xs font-medium leading-relaxed">{feature.description}</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Module Status</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${features[feature.key as keyof RestaurantFeatures] ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {features[feature.key as keyof RestaurantFeatures] ? 'Active' : 'Offline'}
                    </span>
                    <Switch 
                      checked={features[feature.key as keyof RestaurantFeatures]} 
                      onCheckedChange={(v) => handleToggle(feature.key as keyof RestaurantFeatures, v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TooltipProvider>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white p-10">
        <div className="flex items-start gap-6">
          <div className="bg-white/10 p-4 rounded-3xl shrink-0">
            <Info className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black">Global Impact Notice</h3>
            <p className="text-sm opacity-70 leading-relaxed max-w-2xl">
              Disabling features here will immediately remove them from the customer storefront and public directory. 
              Existing data related to these features (such as pending reservations or loyalty balances) will remain in the database but will not be accessible to guests until the feature is re-enabled.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
