
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CalendarDays
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_OPERATING_HOURS, OperatingHours } from '@/lib/operating-hours';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function OperatingHoursEditor({ restaurantId }: { restaurantId: string }) {
  const [hours, setHours] = useState<OperatingHours>(DEFAULT_OPERATING_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState<Date | undefined>(new Date());
  const [newHolidayReason, setNewHolidayReason] = useState('');
  
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !restaurantId) return;

    // Strict multi-tenant path for configuration
    const docRef = doc(firestore, 'restaurants', restaurantId, 'config', 'operatingHours');
    const unsub = onSnapshot(docRef, 
      (snap) => {
        if (snap.exists()) {
          setHours({ ...DEFAULT_OPERATING_HOURS, ...snap.data() } as OperatingHours);
        }
        setLoading(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firestore, restaurantId]);

  const handleSave = async () => {
    if (!firestore || !restaurantId) return;
    setSaving(true);
    try {
      const docRef = doc(firestore, 'restaurants', restaurantId, 'config', 'operatingHours');
      await setDoc(docRef, {
        ...hours,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: 'Schedule Updated', description: 'Business hours have been synced to the live storefront.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: "You don't have permission to update settings." });
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: keyof OperatingHours['schedule'], field: string, value: any) => {
    setHours(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value }
      }
    }));
  };

  const addHoliday = () => {
    if (!newHolidayDate) return;
    const dateStr = format(newHolidayDate, 'yyyy-MM-dd');
    if (hours.holidays.some(h => h.date === dateStr)) {
      toast({ variant: "destructive", title: "Duplicate date", description: "This closure is already scheduled." });
      return;
    }
    setHours(prev => ({
      ...prev,
      holidays: [...prev.holidays, { date: dateStr, reason: newHolidayReason || 'Holiday' }]
    }));
    setNewHolidayReason('');
  };

  const removeHoliday = (index: number) => {
    setHours(prev => ({
      ...prev,
      holidays: prev.holidays.filter((_, i) => i !== index)
    }));
  };

  if (loading) return <div className="p-20 flex justify-center items-center h-full"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/5">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Operating Schedule</h2>
            <p className="text-sm text-muted-foreground">Manage tenant-specific availability.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100/50 p-2 px-4 rounded-full border">
            <Switch 
              id="always-open" 
              checked={hours.isAlwaysOpen} 
              onCheckedChange={(v) => setHours({ ...hours, isAlwaysOpen: v })} 
            />
            <Label htmlFor="always-open" className="text-xs font-black uppercase tracking-widest text-slate-600 cursor-pointer">Open 24/7</Label>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Schedule
          </Button>
        </div>
      </div>

      {!hours.isAlwaysOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">Weekly Routine</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(Object.keys(hours.schedule) as Array<keyof OperatingHours['schedule']>).map((day) => (
                  <div key={day} className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                    <div className="w-full sm:w-32">
                      <Label className="text-sm font-black uppercase tracking-widest text-slate-900 block mb-1">{day}</Label>
                      {hours.schedule[day].isClosed ? (
                        <Badge variant="destructive" className="rounded-md px-2 text-[10px] uppercase">Closed</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 rounded-md px-2 text-[10px] uppercase">Active</Badge>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-wrap items-center gap-6 justify-end w-full">
                      {!hours.schedule[day].isClosed && (
                        <div className="flex items-center gap-3">
                          <Input 
                            type="time" 
                            value={hours.schedule[day].open} 
                            onChange={(e) => updateDay(day, 'open', e.target.value)}
                            className="h-10 w-32 rounded-xl bg-slate-50 border-slate-200"
                          />
                          <span className="text-slate-300">to</span>
                          <Input 
                            type="time" 
                            value={hours.schedule[day].close} 
                            onChange={(e) => updateDay(day, 'close', e.target.value)}
                            className="h-10 w-32 rounded-xl bg-slate-50 border-slate-200"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={!hours.schedule[day].isClosed} 
                          onCheckedChange={(v) => updateDay(day, 'isClosed', !v)} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden h-fit">
            <CardHeader className="bg-amber-50/50 border-b">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg font-bold">Special Closures</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-12 rounded-xl bg-slate-50">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newHolidayDate ? format(newHolidayDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newHolidayDate} onSelect={setNewHolidayDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <Input 
                  placeholder="Reason (e.g. Christmas)..." 
                  className="h-12 rounded-xl bg-slate-50"
                  value={newHolidayReason}
                  onChange={(e) => setNewHolidayReason(e.target.value)}
                />
                <Button onClick={addHoliday} className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold gap-2">
                  <Plus className="h-4 w-4" /> Add Closure
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t">
                {hours.holidays.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm group">
                    <div>
                      <p className="text-sm font-bold">{format(new Date(h.date), 'MMM dd, yyyy')}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{h.reason}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-300 hover:text-destructive rounded-full"
                      onClick={() => removeHoliday(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
