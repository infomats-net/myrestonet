
"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Utensils, 
  Settings, 
  Clock,
  Save,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ShieldAlert,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  Truck,
  DollarSign,
  ChevronRight,
  ListFilter,
  Users,
  LayoutGrid,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock3,
  ShoppingCart,
  Camera,
  Calendar as CalendarIcon,
  Zap,
  Star,
  Check
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { doc, collection, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DesignSystemEditor } from '@/components/design-system-editor';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { MenuCatalogEditor } from '@/components/menu-catalog-editor';
import { GalleryManager } from '@/components/gallery-manager';
import { OrdersManager } from '@/components/orders-manager';
import { RestaurantBilling } from '@/components/restaurant-billing';
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
  
  // 1. Resolve User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);
  
  // 2. Determine Restaurant ID Context
  const effectiveRestaurantId = impersonateId || userProfile?.restaurantId;

  // 3. Fetch Restaurant Data
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 4. Fetch Reservations
  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return query(collection(firestore, 'restaurants', effectiveRestaurantId, 'reservations'), orderBy('dateTime', 'desc'));
  }, [firestore, effectiveRestaurantId]);
  const { data: reservations } = useCollection(reservationsQuery);

  // 5. Fetch Orders
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return query(collection(firestore, 'restaurants', effectiveRestaurantId, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, effectiveRestaurantId]);
  const { data: orders } = useCollection(ordersQuery);

  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableForm, setTableForm] = useState({ name: '', size: '2', location: 'Indoor' });
  
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

  // Auth & Role Protection
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/auth/login');
    }
  }, [authLoading, authUser, router]);

  const handleAddTable = async () => {
    if (!firestore || !effectiveRestaurantId) return;
    setIsSaving(true);
    try {
      const newTable = {
        id: `table-${Date.now()}`,
        name: tableForm.name,
        size: parseInt(tableForm.size),
        location: tableForm.location,
        isActive: true
      };
      await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId), {
        tables: arrayUnion(newTable)
      });
      setIsTableDialogOpen(false);
      setTableForm({ name: '', size: '2', location: 'Indoor' });
      toast({ title: "Table Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

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
      toast({ title: "Reservation Added", description: "Table has been booked successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const updateReservationStatus = async (resId: string, status: string) => {
    if (!firestore || !effectiveRestaurantId) return;
    try {
      await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId, 'reservations', resId), { status });
      toast({ title: "Reservation Updated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
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
        <p className="text-slate-500">You are logged in as a platform administrator or partner. Please select a tenant from your specific dashboard to manage their instance.</p>
        <Button asChild className="rounded-xl h-12 px-8">
          <Link href={userProfile?.role === 'marketing_partner' ? '/partner-admin/dashboard' : '/super-admin/dashboard'}>
            Go to Platform Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  if (loadingRes) return <LoadingScreen message="Loading restaurant instance..." />;

  const tabTriggerStyle = "flex-1 rounded-xl h-full font-bold bg-primary text-primary-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all px-4";

  return (
    <div className="p-8 space-y-8 w-full animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', v);
        router.push(`/restaurant-admin/dashboard?${params.toString()}`, { scroll: false });
      }} className="space-y-6 w-full bg-black p-8 md:p-12 rounded-[3rem] shadow-2xl">
        <TabsList className="bg-white/10 border-none p-1 rounded-2xl h-14 w-full flex gap-1 overflow-x-auto no-scrollbar">
          <TabsTrigger value="overview" className={tabTriggerStyle}>Dashboard</TabsTrigger>
          <TabsTrigger value="orders" className={tabTriggerStyle}>Orders</TabsTrigger>
          <TabsTrigger value="reservations" className={tabTriggerStyle}>Reservations</TabsTrigger>
          <TabsTrigger value="billing" className={tabTriggerStyle}>Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Orders</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-primary">{orders?.filter(o => o.orderStatus === 'new').length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmed Bookings</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-blue-600">{reservations?.filter(r => r.status === 'confirmed').length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Status</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-amber-500 capitalize">{restaurant?.subscriptionStatus || 'Active'}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md bg-white">
              <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-slate-900">{restaurant?.tables?.length || 0}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <OrdersManager restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="reservations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-white">Live Reservations</h2>
            <Button onClick={() => setIsResDialogOpen(true)} className="rounded-2xl h-12 shadow-xl bg-primary hover:bg-primary/90 text-white font-black">
              <Plus className="mr-2" /> New Reservation
            </Button>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Active Bookings</CardTitle>
                <CardDescription>Manage your guest list and table allocations.</CardDescription>
              </div>
              <Badge variant="outline" className="h-8 rounded-full border-primary/20 bg-primary/5 text-primary font-bold">
                {reservations?.length || 0} Total
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Party</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reservations?.map(res => (
                      <tr key={res.id} className={cn("hover:bg-slate-50/50 transition-colors", res.waitlist && "bg-amber-50/30")}>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                              {res.customerName?.[0] || 'G'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{res.customerName}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{res.customerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-bold">{format(new Date(res.dateTime), 'MMM d, h:mm a')}</span>
                          </div>
                        </td>
                        <td className="p-6 text-sm font-black text-slate-900">{res.partySize} Guests</td>
                        <td className="p-6">
                          <Badge className={cn(
                            res.status === 'confirmed' ? 'bg-emerald-500' : 
                            res.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'
                          )}>
                            {res.status}
                          </Badge>
                        </td>
                        <td className="p-6">
                          <div className="flex gap-2">
                            {res.status === 'pending' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => updateReservationStatus(res.id, 'confirmed')}><CheckCircle2 className="h-4 w-4" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateReservationStatus(res.id, 'cancelled')}><XCircle className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <RestaurantBilling restaurantId={effectiveRestaurantId!} />
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
        <TabsContent value="settings">
          <OperatingHoursEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>
      </Tabs>

      {/* Table Dialog */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Configure Table</DialogTitle>
            <DialogDescription>Define a table for AI allocation and reservations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Table Name / Number</Label>
              <Input value={tableForm.name} onChange={e => setTableForm({...tableForm, name: e.target.value})} placeholder="e.g. Table 1 or Terrace 4" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Size</Label>
                <Input type="number" value={tableForm.size} onChange={e => setTableForm({...tableForm, size: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={tableForm.location} onValueChange={v => setTableForm({...tableForm, location: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Indoor">Indoor</SelectItem>
                    <SelectItem value="Outdoor">Outdoor</SelectItem>
                    <SelectItem value="Window">Window</SelectItem>
                    <SelectItem value="Bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black" onClick={handleAddTable} disabled={isSaving || !tableForm.name}>
              {isSaving ? <Loader2 className="animate-spin" /> : "Save Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
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
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm Reservation"}
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
