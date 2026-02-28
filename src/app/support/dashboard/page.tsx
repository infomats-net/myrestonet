
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  ShieldAlert, 
  ExternalLink, 
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LifeBuoy
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SupportDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  
  const { data: userProfile, isLoading } = useDoc(userProfileRef);
  const [assignedData, setAssignedData] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!userProfile?.assignedRestaurants || !firestore) return;
      setLoadingDetails(true);
      const details = [];
      for (const assignment of userProfile.assignedRestaurants) {
        const resDoc = await getDoc(doc(firestore, 'restaurants', assignment.restaurantId));
        if (resDoc.exists()) {
          details.push({
            ...assignment,
            name: resDoc.data().name,
            city: resDoc.data().city
          });
        }
      }
      setAssignedData(details);
      setLoadingDetails(false);
    };

    fetchRestaurantDetails();
  }, [userProfile, firestore]);

  if (isLoading || loadingDetails) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Assignments</h1>
          <p className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest mt-1">Managed restaurants and active support permissions.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-full border border-primary/10 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary">Support Mode Enabled</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Assigned Units</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-black">{assignedData.length}</div></CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Access Level</CardTitle></CardHeader>
          <CardContent><Badge className="bg-primary/10 text-primary capitalize text-lg px-4">{userProfile?.role}</Badge></CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Tasks</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-black">--</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
          <CardHeader className="border-b py-8 px-10 bg-slate-50/50">
            <CardTitle className="text-2xl font-black">Managed Restaurants</CardTitle>
            <CardDescription>Select a restaurant to view dashboard with support permissions.</CardDescription>
          </CardHeader>
          <div className="divide-y">
            {assignedData.map((item, idx) => {
              const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
              return (
                <div key={idx} className={`p-8 flex items-center justify-between hover:bg-slate-50 transition-colors ${isExpired ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-primary font-black text-xl">
                      {item.name[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">{item.city}</Badge>
                        {item.permissions.map((p: string) => (
                          <Badge key={p} variant="outline" className="text-[8px] uppercase text-slate-400 border-slate-200">{p.replace('_', ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Status</p>
                      <p className={`font-bold text-xs ${isExpired ? 'text-destructive' : 'text-emerald-500'}`}>
                        {isExpired ? 'Expired' : 'Active'}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full" 
                      disabled={isExpired}
                      onClick={() => router.push(`/restaurant-admin/dashboard?impersonate=${item.restaurantId}`)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {assignedData.length === 0 && (
              <div className="py-20 text-center text-muted-foreground italic bg-white">
                No active restaurant assignments found.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white p-10 space-y-8">
            <h2 className="text-2xl font-black">Support Guidelines</h2>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <p className="text-xs font-black uppercase text-primary tracking-widest">Privacy First</p>
                <p className="text-sm opacity-70">Always respect merchant data privacy. Only perform actions explicitly requested by the admin.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <p className="text-xs font-black uppercase text-amber-500 tracking-widest">Write Access</p>
                <p className="text-sm opacity-70">If you have 'Update Settings' permission, double-check all changes before saving.</p>
              </div>
            </div>
            <Button className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black">View Support Policy</Button>
          </Card>
          
          <Card className="rounded-[2.5rem] border-none shadow-xl p-10 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">System Information</h3>
            <div className="space-y-2 text-xs font-medium text-slate-600">
              <div className="flex justify-between"><span>Session UID:</span><span className="font-mono">{user?.uid.slice(0, 8)}...</span></div>
              <div className="flex justify-between"><span>Portal Version:</span><span>v2.4.0-stable</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
