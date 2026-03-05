
"use client";

import { use, useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, addDoc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  UtensilsCrossed,
  AlertCircle,
  MessageSquare,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addHours, startOfHour, setHours, setMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { generateEmailContent } from '@/ai/flows/generate-email-content';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function CustomerReservationPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("19:00");
  const [partySize, setPartySize] = useState("2");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSaving] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [waitlist, setWaitlist] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  useEffect(() => {
    if (auth && !auth.currentUser) signInAnonymously(auth);
  }, [auth]);

  const handleBooking = async () => {
    if (!auth?.currentUser || !firestore || !restaurantId || !date) return;
    setIsSaving(true);
    try {
      const reservationDateTime = new Date(date);
      const [h, m] = time.split(':');
      reservationDateTime.setHours(parseInt(h), parseInt(m), 0, 0);

      // --- Smart Table Allocation Logic ---
      const tables = restaurant?.tables || [];
      const activeTables = tables.filter((t: any) => t.isActive);
      
      // Query bookings for this exact slot
      const resQuery = query(
        collection(firestore, 'restaurants', restaurantId, 'reservations'),
        where('dateTime', '==', reservationDateTime.toISOString()),
        where('status', 'in', ['confirmed', 'pending'])
      );
      const resSnap = await getDocs(resQuery);
      const bookedTableIds = resSnap.docs.flatMap(d => d.data().tableIds || []);

      const availableTables = activeTables.filter((t: any) => !bookedTableIds.includes(t.id));
      
      let assignedTableIds: string[] = [];
      const sizeNeeded = parseInt(partySize);
      
      // Find smallest table that fits the party
      const perfectFit = availableTables
        .filter((t: any) => t.size >= sizeNeeded)
        .sort((a: any, b: any) => a.size - b.size)[0];

      if (perfectFit) {
        assignedTableIds = [perfectFit.id];
      } else {
        setWaitlist(true);
      }

      const reservationData = {
        customerId: auth.currentUser.uid,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        specialRequests,
        tableIds: assignedTableIds,
        dateTime: reservationDateTime.toISOString(),
        partySize: sizeNeeded,
        status: assignedTableIds.length > 0 ? 'confirmed' : 'pending',
        waitlist: assignedTableIds.length === 0,
        depositStatus: restaurant?.reservationDepositEnabled ? 'pending' : 'none',
        depositAmount: restaurant?.reservationDepositEnabled ? (restaurant.reservationDepositAmount || 0) : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const resRef = collection(firestore, 'restaurants', restaurantId, 'reservations');
      const docRef = await addDoc(resRef, reservationData);
      setLastBookingId(docRef.id);

      // Trigger AI Email Generation
      const emailContent = await generateEmailContent({
        type: 'reservation_confirmed',
        recipientName: name,
        restaurantName: restaurant?.name,
        details: `Time: ${format(reservationDateTime, 'PPP p')}, Party: ${sizeNeeded} guests. ${assignedTableIds.length > 0 ? 'Table confirmed.' : 'Added to priority waitlist.'} Manage your booking: https://myrestonet.app/customer/${restaurantId}/booking/${docRef.id}`
      });

      await addDoc(collection(firestore, 'mail'), {
        to: [email],
        message: emailContent,
        createdAt: new Date().toISOString()
      });

      setBookingSuccess(true);
      toast({ title: waitlist ? "Joined Waitlist" : "Table Reserved!", description: "Check your email for the dining pass." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to book table." });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingRes) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[2.5rem] border-none shadow-2xl p-10 text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900">{waitlist ? "Waitlist Confirmed" : "Booking Confirmed!"}</h1>
            <p className="text-slate-500 font-medium">
              We've sent your digital dining pass to <strong>{email}</strong>.
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Date</span>
              <span className="font-black text-slate-900">{format(date!, 'PPP')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Time</span>
              <span className="font-black text-slate-900">{time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Guests</span>
              <span className="font-black text-slate-900">{partySize} People</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button className="w-full h-14 rounded-2xl font-black text-lg" variant="outline" asChild>
              <a href={`/customer/${restaurantId}/booking/${lastBookingId}`}>Manage Booking</a>
            </Button>
            <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={() => window.location.reload()}>Book Another</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-2xl mx-auto p-6 md:p-12 space-y-12">
        <header className="text-center space-y-4">
          <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center text-primary mx-auto border border-primary/5 shadow-sm">
            <CalendarIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Fine Dining Registry</h1>
            <p className="text-slate-500 font-medium">{restaurant?.name} • Smart Availability</p>
          </div>
        </header>

        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 p-10 border-b">
            <CardTitle className="text-xl font-black">Secure Your Table</CardTitle>
            <CardDescription>Real-time matching with Michelin-standard seating.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            {/* Step 1: Party & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Visit</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-14 justify-start text-left font-bold rounded-2xl bg-slate-50 border-slate-100">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Number of Guests</Label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="number" 
                    min="1" 
                    max="20" 
                    value={partySize} 
                    onChange={e => setPartySize(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 font-bold text-lg"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Time Slots */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preferred Time Slot</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"].map(t => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={cn(
                      "h-12 rounded-xl text-sm font-black transition-all border",
                      time === t ? "bg-primary text-white border-primary shadow-lg scale-105" : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Contact & Requests */}
            <div className="space-y-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Full Name</Label>
                  <Input placeholder="John Doe" className="h-12 rounded-xl" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Email Address</Label>
                  <Input type="email" placeholder="john@example.com" className="h-12 rounded-xl" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Phone Number (Optional)</Label>
                <Input type="tel" placeholder="+1..." className="h-12 rounded-xl" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-3 w-3 text-slate-400" />
                  <Label className="font-bold text-slate-700">Special Requests / Allergies</Label>
                </div>
                <Textarea 
                  placeholder="e.g. Birthday celebration, gluten-free required..." 
                  className="rounded-xl min-h-[100px] bg-slate-50 border-slate-100" 
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                />
              </div>

              {restaurant?.reservationDepositEnabled && (
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                      <span className="font-black text-emerald-900">Secure Deposit Required</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-black">${restaurant.reservationDepositAmount}</Badge>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                    This restaurant requires a small deposit to prevent no-shows. The amount will be deducted from your final bill.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
                <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Your privacy is our priority. Your data is isolated and used only for managing your dining experience.
                </p>
              </div>

              <Button 
                className="w-full h-20 rounded-3xl text-2xl font-black shadow-2xl shadow-primary/20" 
                disabled={isSubmitting || !name || !email}
                onClick={handleBooking}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : waitlist ? "Join Priority Waitlist" : "Confirm Reservation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
