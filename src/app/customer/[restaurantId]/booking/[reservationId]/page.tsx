
"use client";

import { use, useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  Calendar, 
  Users, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  ChevronLeft,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function BookingManagementPage({ params }: { params: Promise<{ restaurantId: string, reservationId: string }> }) {
  const resolvedParams = use(params);
  const { restaurantId, reservationId } = resolvedParams;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);

  const resRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId || !reservationId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'reservations', reservationId);
  }, [firestore, restaurantId, reservationId]);
  const { data: reservation, isLoading: loadingRes } = useDoc(resRef);

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant } = useDoc(restaurantRef);

  useEffect(() => {
    if (auth && !auth.currentUser) signInAnonymously(auth);
  }, [auth]);

  const handleCancel = async () => {
    if (!firestore || !restaurantId || !reservationId || !window.confirm("Are you sure you want to cancel this reservation?")) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(firestore, 'restaurants', restaurantId, 'reservations', reservationId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
      toast({ title: "Booking Cancelled", description: "Your table has been released." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not cancel booking." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingRes) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!reservation) return <div className="min-h-screen flex items-center justify-center"><p className="font-bold text-slate-400">Booking not found.</p></div>;

  const isCancelled = reservation.status === 'cancelled';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="rounded-xl font-bold">
            <Link href={`/customer/${restaurantId}`}><ChevronLeft className="mr-2" /> Back to Store</Link>
          </Button>
          <Badge className={cn(
            "font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full",
            reservation.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" :
            reservation.status === 'pending' ? "bg-amber-100 text-amber-700" :
            "bg-rose-100 text-rose-700"
          )}>
            {reservation.status}
          </Badge>
        </div>

        <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-10 space-y-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black tracking-tight">Your Reservation</CardTitle>
              <CardDescription className="text-slate-400 font-medium">{restaurant?.name} • ID: {reservationId.slice(-6).toUpperCase()}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-8 pb-8 border-b border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</p>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Calendar className="h-4 w-4 text-primary" />
                  {format(new Date(reservation.dateTime), 'EEEE, MMM do')}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Time</p>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Clock className="h-4 w-4 text-primary" />
                  {format(new Date(reservation.dateTime), 'p')}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Guests</p>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Users className="h-4 w-4 text-primary" />
                  {reservation.partySize} People
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Waitlist</p>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  {reservation.waitlist ? "Active" : "None"}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Information</h3>
                <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <Mail className="h-4 w-4 opacity-40" /> {reservation.customerEmail}
                  </div>
                  {reservation.customerPhone && (
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                      <Phone className="h-4 w-4 opacity-40" /> {reservation.customerPhone}
                    </div>
                  )}
                </div>
              </div>

              {reservation.specialRequests && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" /> Special Requests
                  </h3>
                  <p className="text-sm italic text-slate-600 bg-slate-50 p-4 rounded-xl border border-dashed">
                    "{reservation.specialRequests}"
                  </p>
                </div>
              )}
            </div>

            <div className="pt-8 flex flex-col gap-4">
              {!isCancelled && (
                <>
                  <Button variant="outline" className="h-14 rounded-2xl font-black text-rose-600 hover:bg-rose-50 border-rose-100" onClick={handleCancel} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <XCircle className="mr-2" />}
                    Cancel Reservation
                  </Button>
                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    To modify your party size or date, please cancel and re-book or contact the restaurant directly.
                  </p>
                </>
              )}
              {isCancelled && (
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex items-center gap-4 text-rose-700">
                  <AlertTriangle className="h-6 w-6 shrink-0" />
                  <p className="text-sm font-bold leading-tight">This reservation was cancelled on {format(new Date(reservation.updatedAt), 'MMM d, p')}.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
