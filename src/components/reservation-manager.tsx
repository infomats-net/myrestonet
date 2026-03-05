
'use client';

import { useState } from 'react';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useDoc 
} from '@/firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  CalendarDays, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Plus, 
  Table as TableIcon,
  Trash2,
  AlertCircle,
  Bell,
  Utensils
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function ReservationManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('bookings');
  
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableForm, setTableForm] = useState({ name: '', size: '2', location: 'Indoor' });

  // 1. Fetch Reservations
  const reservationsQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return query(collection(firestore, 'restaurants', restaurantId, 'reservations'), orderBy('dateTime', 'desc'));
  }, [firestore, restaurantId]);
  const { data: reservations, isLoading: loadingRes } = useCollection(reservationsQuery);

  // 2. Fetch Restaurant Data (for Table management)
  const resRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant } = useDoc(resRef);

  const updateStatus = async (resId: string, status: string) => {
    if (!firestore || !restaurantId) return;
    try {
      await updateDoc(doc(firestore, 'restaurants', restaurantId, 'reservations', resId), {
        status,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Status Updated", description: `Guest marked as ${status.replace('_', ' ')}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleAddTable = async () => {
    if (!firestore || !restaurantId) return;
    setIsProcessing(true);
    try {
      const currentTables = restaurant?.tables || [];
      const newTable = {
        id: `table-${Date.now()}`,
        name: tableForm.name,
        size: parseInt(tableForm.size),
        location: tableForm.location,
        isActive: true
      };
      
      await updateDoc(doc(firestore, 'restaurants', restaurantId), {
        tables: [...currentTables, newTable],
        updatedAt: serverTimestamp()
      });
      
      setIsTableDialogOpen(false);
      setTableForm({ name: '', size: '2', location: 'Indoor' });
      toast({ title: "Table Added" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeTable = async (tableId: string) => {
    if (!firestore || !restaurantId || !window.confirm("Remove this table?")) return;
    try {
      const remaining = (restaurant?.tables || []).filter((t: any) => t.id !== tableId);
      await updateDoc(doc(firestore, 'restaurants', restaurantId), {
        tables: remaining,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Table Removed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  if (loadingRes) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 w-14 h-14 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Guestbook & Floor Plan</h2>
            <p className="text-slate-400 text-sm font-medium">Manage allocations and live table status.</p>
          </div>
        </div>
        
        <div className="flex bg-white/10 p-1 rounded-xl gap-1">
          <button onClick={() => setActiveTab('bookings')} className={cn("px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'bookings' ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white")}>Reservations</button>
          <button onClick={() => setActiveTab('tables')} className={cn("px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'tables' ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white")}>Table Config</button>
        </div>
      </div>

      <Tabs value={activeTab} className="w-full">
        <TabsContent value="bookings" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="rounded-[2rem] border-none shadow-xl bg-white">
              <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confirmed Today</p></CardHeader>
              <CardContent><div className="text-4xl font-black text-primary">{reservations?.filter(r => r.status === 'confirmed').length || 0}</div></CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-xl bg-white">
              <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Waitlisted</p></CardHeader>
              <CardContent><div className="text-4xl font-black text-amber-500">{reservations?.filter(r => r.waitlist).length || 0}</div></CardContent>
            </Card>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b">
                  <tr>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Guest</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Time & Table</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Party</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reservations?.map(res => (
                    <tr key={res.id} className={cn("hover:bg-slate-50/50 transition-colors group", res.status === 'cancelled' && "opacity-50")}>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">{res.customerName?.[0]}</div>
                          <div>
                            <p className="font-black text-slate-900">{res.customerName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{res.customerPhone || 'No Phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{format(new Date(res.dateTime), 'MMM d, p')}</span>
                          <span className="text-[9px] font-black text-primary uppercase">Table: {res.tableIds?.join(', ') || 'Auto'}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <Badge variant="outline" className="font-black text-[10px] tracking-widest">{res.partySize} Guests</Badge>
                      </td>
                      <td className="p-6">
                        <Badge className={cn(
                          "font-black text-[9px] uppercase tracking-widest",
                          res.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" :
                          res.status === 'pending' ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {res.status}
                        </Badge>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="rounded-full text-emerald-600" onClick={() => updateStatus(res.id, 'attended')}><CheckCircle2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="rounded-full text-rose-600" onClick={() => updateStatus(res.id, 'cancelled')}><XCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="rounded-full text-blue-600"><Bell className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6 mt-0">
          <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
            <div>
              <h3 className="text-xl font-black text-white">Dining Floor Map</h3>
              <p className="text-slate-400 text-xs">Define your available seating for the smart reservation engine.</p>
            </div>
            <Button onClick={() => setIsTableDialogOpen(true)} className="rounded-2xl h-12 px-6 shadow-xl font-black">
              <Plus className="mr-2" /> Add Table
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurant?.tables?.map((table: any) => (
              <Card key={table.id} className="rounded-[2rem] border-none shadow-xl overflow-hidden group">
                <CardHeader className="bg-slate-50 p-6 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary"><TableIcon className="h-5 w-5" /></div>
                    <CardTitle className="text-lg font-black">{table.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-300 hover:text-destructive" onClick={() => removeTable(table.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capacity</span>
                    <Badge variant="secondary" className="font-black">{table.size} People</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Location</span>
                    <Badge className="bg-primary/10 text-primary border-none uppercase text-[9px] font-black">{table.location}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!restaurant?.tables || restaurant.tables.length === 0) && (
              <div className="col-span-full py-20 text-center space-y-4 bg-white/5 border-2 border-dashed border-white/10 rounded-[3rem]">
                <TableIcon className="h-12 w-12 mx-auto text-white/20" />
                <p className="font-black text-white/40 uppercase text-xs tracking-widest">No tables defined yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Configure Table</DialogTitle>
            <DialogDescription>Define a new seating area for the matching engine.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Table Name / Number</Label>
              <Input value={tableForm.name} onChange={e => setTableForm({...tableForm, name: e.target.value})} placeholder="e.g. Window 4" className="h-12 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Size (Guests)</Label>
                <Input type="number" value={tableForm.size} onChange={e => setTableForm({...tableForm, size: e.target.value})} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={tableForm.location} onValueChange={v => setTableForm({...tableForm, location: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
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
            <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl" onClick={handleAddTable} disabled={isProcessing || !tableForm.name}>
              {isProcessing ? <Loader2 className="animate-spin" /> : "Save Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
