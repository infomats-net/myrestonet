
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
  Clock3
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { doc, collection, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DesignSystemEditor } from '@/components/design-system-editor';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { MenuCatalogEditor } from '@/components/menu-catalog-editor';
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
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'reservations');
  }, [firestore, effectiveRestaurantId]);
  const { data: reservations } = useCollection(reservationsQuery);

  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableForm, setTableForm] = useState({ name: '', size: '2', location: 'Indoor' });
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

  const handleDeleteTable = async (table: any) => {
    if (!firestore || !effectiveRestaurantId) return;
    try {
      await updateDoc(doc(firestore, 'restaurants', effectiveRestaurantId), {
        tables: arrayRemove(table)
      });
      toast({ title: "Table Removed" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" });
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
  if (!authUser) return null; // Redirection in progress via useEffect
  
  if (loadingProfile) return <LoadingScreen message="Loading user profile..." />;
  
  // If we have no restaurant context at all (e.g. admin logged in but not impersonating)
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

  const tabTriggerStyle = "flex-1 rounded-xl h-full font-bold bg-primary text-primary-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all";

  return (
    <div className="p-8 space-y-8 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary border border-primary/5">
            <Utensils className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{restaurant?.name || 'Untitled Restaurant'}</h1>
            <p className="text-muted-foreground text-sm font-medium">Merchant Dashboard</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="rounded-xl">
            <Link href={`/customer/${effectiveRestaurantId}/reserve`} target="_blank">
              <CalendarDays className="mr-2 h-4 w-4" /> Booking Page
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href={`/customer/${effectiveRestaurantId}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" /> Live Store
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', v);
        router.push(`/restaurant-admin/dashboard?${params.toString()}`, { scroll: false });
      }} className="space-y-6 w-full">
        <TabsList className="bg-slate-100/50 border p-1 rounded-2xl h-14 w-full flex gap-1 overflow-x-auto no-scrollbar">
          <TabsTrigger value="overview" className={tabTriggerStyle}>Overview</TabsTrigger>
          <TabsTrigger value="reservations" className={tabTriggerStyle}>Reservations</TabsTrigger>
          <TabsTrigger value="tables" className={tabTriggerStyle}>Tables</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-none shadow-md">
              <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upcoming Reservations</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-primary">{reservations?.filter(r => r.status === 'confirmed').length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md">
              <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Waitlist Size</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-amber-500">{reservations?.filter(r => r.waitlist).length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-md">
              <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Tables</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black text-blue-600">{restaurant?.tables?.length || 0}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black">Live Reservations</CardTitle>
                <CardDescription>Manage your guest bookings and AI allocation.</CardDescription>
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
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Table(s)</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reservations?.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map(res => (
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
                          {res.waitlist ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">WAITLIST</Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {res.tableIds?.map((tid: string) => (
                                <Badge key={tid} variant="secondary" className="bg-slate-100 text-slate-600 font-bold">
                                  {restaurant?.tables?.find((t: any) => t.id === tid)?.name || tid}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
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
                    {(!reservations || reservations.length === 0) && (
                      <tr><td colSpan={6} className="p-20 text-center text-muted-foreground italic">No reservations found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900">Floor Plan & Tables</h2>
            <Button onClick={() => setIsTableDialogOpen(true)} className="rounded-2xl h-12 shadow-xl"><Plus className="mr-2" /> New Table</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurant?.tables?.map((table: any) => (
              <Card key={table.id} className="rounded-3xl border-none shadow-lg overflow-hidden group">
                <CardHeader className="bg-slate-50 p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-black">{table.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteTable(table)}><Trash2 className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</span>
                    <span className="font-black text-slate-900 text-xl">{table.size} People</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</span>
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">{table.location}</Badge>
                  </div>
                  <div className="pt-4 border-t flex items-center gap-2">
                    <Switch checked={table.isActive} />
                    <span className="text-xs font-bold text-slate-500">Active Seating</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!restaurant?.tables || restaurant.tables.length === 0) && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[3rem] text-muted-foreground bg-slate-50/50">
                <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">No tables configured yet.</p>
                <Button variant="link" onClick={() => setIsTableDialogOpen(true)}>Add your first table</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="menu">
          <MenuCatalogEditor restaurantId={effectiveRestaurantId!} />
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
