
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
  AlertCircle,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_OPERATING_HOURS, OperatingHours } from '@/lib/operating-hours';
import { cn } from '@/lib/utils';

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

    const docRef = doc(firestore, 'restaurants', restaurantId, 'config', 'operatingHours');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setHours({ ...DEFAULT_OPERATING_HOURS, ...snap.data() } as OperatingHours);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, restaurantId]);

  const handleSave = async () => {
    if (!firestore || !restaurantId) return;
    setSaving(true);
    try {
      await setDoc(doc(firestore, 'restaurants', restaurantId, 'config', 'operatingHours'), {
        ...hours,
        updatedAt: new Date().toISOString()
      });
      toast({ title: 'Schedule Updated', description: 'Your operating hours and holiday closures have been published.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
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
      toast({ variant: "destructive", title: "Already added", description: "This date is already marked as a closure." });
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

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/5">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Operating Schedule</h2>
            <p className="text-sm text-muted-foreground">Manage your weekly opening times and special closures.</p>
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
          {/* Weekly Schedule */}
          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">Weekly Routine</CardTitle>
              </div>
              <CardDescription>Configure standard opening and closing windows for each day.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(Object.keys(hours.schedule) as Array<keyof OperatingHours['schedule']>).map((day) => (
                  <div key={day} className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4 hover:bg-slate-50/30 transition-colors">
                    <div className="w-full sm:w-32">
                      <Label className="text-sm font-black uppercase tracking-widest text-slate-900 block mb-1">{day}</Label>
                      {hours.schedule[day].isClosed ? (
                        <Badge variant="destructive" className="rounded-md px-2 text-[10px] font-black uppercase">Closed</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-md px-2 text-[10px] font-black uppercase">Active</Badge>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-wrap items-center gap-6 justify-end w-full">
                      {!hours.schedule[day].isClosed && (
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Open</span>
                            <Input 
                              type="time" 
                              value={hours.schedule[day].open} 
                              onChange={(e) => updateDay(day, 'open', e.target.value)}
                              className="h-10 w-32 rounded-xl bg-slate-50 border-slate-200"
                            />
                          </div>
                          <div className="h-px w-2 bg-slate-300 mt-5" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Close</span>
                            <Input 
                              type="time" 
                              value={hours.schedule[day].close} 
                              onChange={(e) => updateDay(day, 'close', e.target.value)}
                              className="h-10 w-32 rounded-xl bg-slate-50 border-slate-200"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-auto">
                        <Switch 
                          checked={!hours.schedule[day].isClosed} 
                          onCheckedChange={(v) => updateDay(day, 'isClosed', !v)} 
                        />
                        <span className="text-xs font-bold text-slate-500 uppercase">{hours.schedule[day].isClosed ? 'Closed' : 'Open'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holiday Closures */}
          <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-amber-50/50 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-lg font-bold text-amber-900">Special Closures</CardTitle>
                </div>
                <CardDescription className="text-amber-700/70">Set specific dates when the restaurant is closed (holidays, private events).</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Date of Closure</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl bg-slate-50", !newHolidayDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newHolidayDate ? format(newHolidayDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={newHolidayDate} onSelect={setNewHolidayDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Reason (e.g. Christmas)</Label>
                    <Input 
                      placeholder="Reason for closure..." 
                      className="h-12 rounded-xl bg-slate-50"
                      value={newHolidayReason}
                      onChange={(e) => setNewHolidayReason(e.target.value)}
                    />
                  </div>
                  <Button onClick={addHoliday} className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold gap-2">
                    <Plus className="h-4 w-4" /> Add Special Closure
                  </Button>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Planned Closures ({hours.holidays.length})</h4>
                  <div className="space-y-2">
                    {hours.holidays.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed">
                        <p className="text-xs text-muted-foreground italic">No holidays listed.</p>
                      </div>
                    ) : (
                      hours.holidays.map((h, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm group hover:border-amber-200 transition-all">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{format(new Date(h.date), 'MMM dd, yyyy')}</p>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{h.reason}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-full"
                            onClick={() => removeHoliday(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex gap-4">
              <div className="bg-white h-10 w-10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Global Sync</p>
                <p className="text-xs text-slate-600 leading-relaxed">Customers will see a 'Closed Now' notice and won't be able to order during these times.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {hours.isAlwaysOpen && (
        <div className="p-20 text-center bg-slate-50/50 rounded-[3rem] border-4 border-dashed space-y-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">24/7 Availability Active</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your restaurant is currently set to be always open. Customers can place orders at any time of the day or year.
            </p>
          </div>
          <Button variant="outline" className="rounded-full px-8" onClick={() => setHours({...hours, isAlwaysOpen: false})}>
            Set Specific Business Hours
          </Button>
        </div>
      )}
    </div>
  );
}
