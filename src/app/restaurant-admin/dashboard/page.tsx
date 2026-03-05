
"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2,
  Plus,
  ShieldAlert,
  ShoppingBag,
  CreditCard,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Zap,
  Globe,
  Utensils,
  Camera,
  Palette,
  Settings as SettingsIcon,
  LayoutDashboard,
  Package,
  LifeBuoy
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, updateDoc, arrayUnion, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DesignSystemEditor } from '@/components/design-system-editor';
import { MenuCatalogEditor } from '@/components/menu-catalog-editor';
import { GalleryManager } from '@/components/gallery-manager';
import { OrdersManager } from '@/components/orders-manager';
import { RestaurantBilling } from '@/components/restaurant-billing';
import { PaymentsManager } from '@/components/payments-manager';
import { StoreSettingsManager } from '@/components/store-settings-manager';
import { InventoryManager } from '@/components/inventory-manager';
import { SupportTicketingSystem } from '@/components/support-ticketing-system';
import { ReservationManager } from '@/components/reservation-manager';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="p-20 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-bold text-slate-500">{message}</p>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const activeTab = searchParams.get('tab') || 'overview';
  
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const { toast } = useToast();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return query(collection(firestore, 'restaurants', effectiveRestaurantId, 'reservations'), orderBy('dateTime', 'desc'));
  }, [firestore, effectiveRestaurantId]);
  const { data: reservations } = useCollection(reservationsQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return query(collection(firestore, 'restaurants', effectiveRestaurantId, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, effectiveRestaurantId]);
  const { data: orders } = useCollection(ordersQuery);

  const [isResDialogOpen, setIsResDialogOpen] = useState(false);
  const [resForm, setResForm] = useState({ 
    name: '', 
    email: '', 
    date: new Date() as Date | undefined, 
    time: '19:00', 
    partySize: '2', 
    tableIds: [] as string[]
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/auth/login');
    }
  }, [authLoading, authUser, router]);

  const handleAddReservation = async () => {
    if (!firestore || !effectiveRestaurantId || !resForm.date) return;
    setIsSaving(true);
    try {
      const reservationDateTime = new Date(resForm.date);
      const [h, m] = resForm.time.split(':');
      reservationDateTime.setHours(parseInt(h), parseInt(m), 0, 0);

      const reservationData = {
        customerId: `admin-added-${Date.now()}`,
        customerName: resForm.name,
        customerEmail: resForm.email,
        tableIds: resForm.tableIds,
        dateTime: reservationDateTime.toISOString(),
        partySize: parseInt(resForm.partySize),
        status: 'confirmed',
        waitlist: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(firestore, 'restaurants', effectiveRestaurantId, 'reservations'), reservationData);
      setIsResDialogOpen(false);
      setResForm({ name: '', email: '', date: new Date(), time: '19:00', partySize: '2', tableIds: [] });
      toast({ title: "Reservation Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return <LoadingScreen message="Checking authentication..." />;
  if (!authUser) return null; 
  if (loadingProfile) return <LoadingScreen message="Loading user profile..." />;
  
  if (!effectiveRestaurantId && !loadingProfile) {
    return (
      <div className="p-20 text-center space-y-6 max-w-xl mx-auto">
        <ShieldAlert className="h-16 w-16 mx-auto text-amber-500 opacity-50" />
        <h1 className="text-2xl font-black">No Restaurant Context</h1>
        <p className="text-slate-500">Please select a tenant from your dashboard to manage their instance.</p>
        <Button asChild className="rounded-xl h-12 px-8">
          <Link href={userProfile?.role === 'marketing_partner' ? '/partner-admin/dashboard' : '/super-admin/dashboard'}>
            Go to Platform Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  if (loadingRes) return <LoadingScreen message="Loading restaurant instance..." />;

  const tabTriggerStyle = "flex-1 rounded-xl h-full font-bold bg-primary text-primary-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all px-4 flex items-center justify-center gap-2";

  const handleTabChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', v);
    router.push(`/restaurant-admin/dashboard?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="p-8 space-y-8 w-full animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6 w-full bg-black p-8 md:p-12 rounded-[3rem] shadow-2xl">
        <TabsList className="bg-white/10 border-none p-1 rounded-2xl h-14 w-full max-w-5xl mx-auto flex gap-1 overflow-x-auto no-scrollbar">
          <TabsTrigger value="overview" className={tabTriggerStyle}><LayoutDashboard className="h-4 w-4" /> <span className="hidden lg:inline">Dashboard</span></TabsTrigger>
          <TabsTrigger value="orders" className={tabTriggerStyle}><ShoppingBag className="h-4 w-4" /> <span className="hidden lg:inline">Orders</span></TabsTrigger>
          <TabsTrigger value="inventory" className={tabTriggerStyle}><Package className="h-4 w-4" /> <span className="hidden lg:inline">Inventory</span></TabsTrigger>
          <TabsTrigger value="reservations" className={tabTriggerStyle}><CalendarDays className="h-4 w-4" /> <span className="hidden lg:inline">Reservations</span></TabsTrigger>
          <TabsTrigger value="menu" className={tabTriggerStyle}><Utensils className="h-4 w-4" /> <span className="hidden lg:inline">Catalog</span></TabsTrigger>
          <TabsTrigger value="support" className={tabTriggerStyle}><LifeBuoy className="h-4 w-4" /> <span className="hidden lg:inline">Support</span></TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Orders</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-primary">{orders?.filter(o => o.status === 'new' || o.status === 'pending').length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmed Bookings</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-blue-600">{reservations?.filter(r => r.status === 'confirmed').length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payments Status</CardTitle></CardHeader>
              <CardContent>
                <Badge className={restaurant?.paymentsEnabled ? "bg-emerald-500" : "bg-slate-400"}>
                  {restaurant?.paymentsEnabled ? "Stripe Active" : "Stripe Disconnected"}
                </Badge>
              </CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-slate-900">{restaurant?.tables?.length || 0} Tables</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 p-8 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black">Recent Activity</CardTitle>
                  <CardDescription>Latest orders and status updates.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="font-bold text-primary" onClick={() => handleTabChange('orders')}>View All</Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {orders?.slice(0, 5).map(order => (
                    <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-lg"><ShoppingBag className="h-4 w-4 text-primary" /></div>
                        <div>
                          <p className="font-bold text-slate-900">Order #{order.orderNumber || order.id.slice(-4).toUpperCase()}</p>
                          <p className="text-xs text-slate-400">{format(new Date(order.createdAt), 'h:mm a')}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">{order.status}</Badge>
                    </div>
                  ))}
                  {(!orders || orders.length === 0) && <div className="p-10 text-center text-slate-400 italic">No recent activity.</div>}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 p-8 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black">Upcoming Guests</CardTitle>
                  <CardDescription>Next 5 confirmed reservations.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="font-bold text-primary" onClick={() => handleTabChange('reservations')}>Manage</Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {reservations?.filter(r => r.status === 'confirmed').slice(0, 5).map(res => (
                    <div key={res.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-2 rounded-lg"><CalendarDays className="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <p className="font-bold text-slate-900">{res.customerName}</p>
                          <p className="text-xs text-slate-400">{format(new Date(res.dateTime), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-none">{res.partySize} Guests</Badge>
                    </div>
                  ))}
                  {(!reservations || reservations.length === 0) && <div className="p-10 text-center text-slate-400 italic">No upcoming reservations.</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <OrdersManager restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryManager restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="reservations">
          <ReservationManager restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="support">
          <SupportTicketingSystem restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="menu">
          <MenuCatalogEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="gallery">
          <GalleryManager restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="design">
          <DesignSystemEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsManager restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="billing">
          <RestaurantBilling restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="settings">
          <StoreSettingsManager restaurantId={effectiveRestaurantId!} />
        </TabsContent>
      </Tabs>

      {/* Manual Reservation Dialog */}
      <Dialog open={isResDialogOpen} onOpenChange={setIsResDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">New Manual Booking</DialogTitle>
            <DialogDescription>Manually register a customer reservation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6 overflow-y-auto max-h-[70vh] no-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={resForm.name} onChange={e => setResForm({...resForm, name: e.target.value})} placeholder="Full Name" className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label>Email (Optional)</Label>
                <Input type="email" value={resForm.email} onChange={e => setResForm({...resForm, email: e.target.value})} placeholder="customer@email.com" className="rounded-xl h-12" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start text-left font-bold rounded-xl bg-slate-50">
                      <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                      {resForm.date ? format(resForm.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <Calendar mode="single" selected={resForm.date} onSelect={(d) => setResForm({...resForm, date: d})} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select value={resForm.time} onValueChange={v => setResForm({...resForm, time: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Party Size</Label>
              <Input type="number" value={resForm.partySize} onChange={e => setResForm({...resForm, partySize: e.target.value})} className="rounded-xl h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={handleAddReservation} disabled={isSaving || !resForm.name || !resForm.date}>
              {isSaving ? <Loader2 className="animate-spin" /> : "Confirm Reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RestaurantAdminDashboard() {
  return (
    <Suspense fallback={<LoadingScreen message="Initializing merchant portal..." />}>
      <DashboardContent />
    </Suspense>
  );
}
