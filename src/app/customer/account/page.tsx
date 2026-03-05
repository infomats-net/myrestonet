
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, collectionGroup, query, where, orderBy, updateDoc, arrayRemove, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
  User, 
  ShoppingBag, 
  MapPin, 
  Heart, 
  Wallet, 
  Star, 
  Share2, 
  Loader2, 
  ChevronRight, 
  History,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function CustomerAccountPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('orders');
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'customerProfiles', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile, isLoading: loadingProfile } = useDoc(profileRef);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collectionGroup(firestore, 'orders'), where('customerId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user?.uid]);
  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);

  const addressesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'customerProfiles', user.uid, 'addresses');
  }, [firestore, user?.uid]);
  const { data: addresses } = useCollection(addressesRef);

  // Check if loyalty is enabled globally/per restaurant - for simplicity in account page, we check recent order restaurant
  useEffect(() => {
    const checkLoyalty = async () => {
      if (orders && orders.length > 0 && firestore) {
        const lastOrder = orders[0];
        const featSnap = await getDoc(doc(firestore, 'restaurants', lastOrder.restaurantId, 'features', 'settings'));
        if (featSnap.exists()) {
          setLoyaltyEnabled(featSnap.data().loyaltyProgram !== false);
        }
      }
    };
    checkLoyalty();
  }, [orders, firestore]);

  const handleUpdateProfile = async (field: string, value: any) => {
    if (!profileRef) return;
    try {
      await updateDoc(profileRef, { [field]: value, updatedAt: serverTimestamp() });
      toast({ title: "Profile Updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const removeFavorite = async (itemId: string) => {
    if (!profileRef) return;
    try {
      await updateDoc(profileRef, { favoriteMenuItemIds: arrayRemove(itemId) });
      toast({ title: "Removed from favorites" });
    } catch (e) {}
  };

  if (isUserLoading || loadingProfile) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Button asChild><Link href="/auth/login">Please Sign In</Link></Button></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary rounded-xl p-1.5"><ShoppingBag className="h-5 w-5 text-white" /></div>
            <span className="font-black text-xl tracking-tight text-primary">MyRestoNet</span>
          </Link>
          <div className="flex items-center gap-4">
            {loyaltyEnabled && (
              <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 font-bold rounded-full">
                {profile?.loyaltyPoints || 0} Points
              </Badge>
            )}
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
              <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
              <CardContent className="p-8 space-y-6 text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-primary/5 mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                  <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">{profile?.firstName} {profile?.lastName}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gourmet Member</p>
                </div>
                <div className="pt-6 border-t space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-400">Wallet</span>
                    <span className="text-primary text-lg font-black">${profile?.walletBalance?.toFixed(2) || '0.00'}</span>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl font-bold h-11 border-slate-100 bg-slate-50"><CreditCard className="mr-2 h-4 w-4" /> Top Up</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><Share2 className="h-5 w-5 text-primary" /></div>
                <h3 className="font-black text-sm uppercase tracking-widest">Invite Friends</h3>
              </div>
              <p className="text-xs opacity-70 leading-relaxed">Share your code and get $10 for every friend who places their first order.</p>
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group cursor-pointer" onClick={() => { navigator.clipboard.writeText(profile?.referralCode); toast({title: "Copied!"}) }}>
                <span className="font-mono font-black text-primary">{profile?.referralCode || 'DINE-2024'}</span>
                <Badge className="bg-primary/20 text-primary border-none text-[10px]">Copy</Badge>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="bg-white/50 border p-1 rounded-2xl h-14 w-full md:w-fit flex gap-1">
                <TabsTrigger value="orders" className="flex-1 md:flex-none rounded-xl h-full font-bold px-8 gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
                <TabsTrigger value="addresses" className="flex-1 md:flex-none rounded-xl h-full font-bold px-8 gap-2"><MapPin className="h-4 w-4" /> Addresses</TabsTrigger>
                <TabsTrigger value="favorites" className="flex-1 md:flex-none rounded-xl h-full font-bold px-8 gap-2"><Heart className="h-4 w-4" /> Favorites</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1 md:flex-none rounded-xl h-full font-bold px-8 gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="space-y-6 mt-0">
                {loadingOrders ? (
                  <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : orders?.length === 0 ? (
                  <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed">
                    <ShoppingBag className="h-16 w-16 mx-auto opacity-10 mb-4" />
                    <h3 className="text-xl font-black">No Orders Yet</h3>
                    <p className="text-slate-400 mt-2">Hungry? Discover your next meal now.</p>
                    <Button asChild className="mt-6 rounded-xl h-12 px-8"><Link href="/">Browse Restaurants</Link></Button>
                  </div>
                ) : (
                  orders?.map(order => (
                    <Card key={order.id} className="rounded-[2.5rem] border-none shadow-lg overflow-hidden bg-white hover:shadow-xl transition-all">
                      <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                            <CheckCircle2 className={cn("h-8 w-8", order.status === 'delivered' ? "text-emerald-500" : "text-amber-500")} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Order #{order.id.slice(-6).toUpperCase()}</p>
                            <h4 className="text-lg font-black text-slate-900">{order.status === 'delivered' ? 'Delivered' : 'In Progress'} • {format(new Date(order.createdAt), 'MMM d, p')}</h4>
                            <p className="text-sm text-slate-500 font-medium mt-1">{order.items?.length || 0} Items • ${order.totalAmount?.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" className="rounded-xl font-bold h-11 border-slate-100">Details</Button>
                          <Button className="rounded-xl font-black h-11 px-6 shadow-lg shadow-primary/10">Re-order</Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="addresses" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses?.map(addr => (
                    <Card key={addr.id} className="rounded-[2rem] border-none shadow-lg bg-white overflow-hidden group">
                      <CardContent className="p-8 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="bg-primary/10 p-3 rounded-xl"><MapPin className="h-5 w-5 text-primary" /></div>
                          {addr.isDefault && <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] uppercase">Default</Badge>}
                        </div>
                        <div>
                          <h4 className="font-black text-lg text-slate-900">{addr.label}</h4>
                          <p className="text-sm text-slate-500 leading-relaxed mt-1">{addr.addressLine1}, {addr.city}</p>
                        </div>
                        <div className="pt-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><Trash2 className="h-4 w-4 text-slate-300 hover:text-destructive" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center p-12 text-center hover:bg-slate-50 cursor-pointer group transition-all h-full">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-4 group-hover:scale-110 transition-transform"><Plus className="h-7 w-7" /></div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">New Address</h4>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="favorites" className="space-y-6 mt-0">
                {profile?.favoriteMenuItemIds?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profile.favoriteMenuItemIds.map((id: string) => (
                      <Card key={id} className="rounded-[2rem] border-none shadow-lg overflow-hidden group relative">
                        <div className="aspect-square bg-slate-100">
                          <img src={`https://picsum.photos/seed/${id}/400/400`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                        </div>
                        <div className="absolute top-4 right-4">
                          <Button variant="secondary" size="icon" className="rounded-full bg-white/90 backdrop-blur-md shadow-lg" onClick={() => removeFavorite(id)}><Heart className="h-4 w-4 text-rose-500 fill-current" /></Button>
                        </div>
                        <div className="p-6 bg-white">
                          <h4 className="font-black text-slate-900">Saved Dish</h4>
                          <Button className="w-full mt-4 h-10 rounded-xl font-bold text-xs">Order Now</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed">
                    <Heart className="h-16 w-16 mx-auto opacity-10 mb-4" />
                    <h3 className="text-xl font-black">Heart Your Favorites</h3>
                    <p className="text-slate-400 mt-2">Keep your most loved dishes just one tap away.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-8 mt-0">
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                  <CardHeader className="p-10 border-b bg-slate-50/50"><CardTitle className="text-2xl font-black">Personal Information</CardTitle></CardHeader>
                  <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">First Name</Label>
                        <Input defaultValue={profile?.firstName} onBlur={(e) => handleUpdateProfile('firstName', e.target.value)} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Last Name</Label>
                        <Input defaultValue={profile?.lastName} onBlur={(e) => handleUpdateProfile('lastName', e.target.value)} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Email Address</Label>
                        <Input value={profile?.email} disabled className="h-12 rounded-xl bg-slate-50 border-none" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Phone Number</Label>
                        <Input defaultValue={profile?.phoneNumber} onBlur={(e) => handleUpdateProfile('phoneNumber', e.target.value)} placeholder="+1..." className="h-12 rounded-xl" />
                      </div>
                    </div>
                    <div className="pt-8 border-t flex justify-end">
                      <Button className="rounded-xl h-12 px-12 font-black shadow-xl shadow-primary/20">Save Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
