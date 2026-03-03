'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBag, 
  Clock, 
  Loader2,
  DollarSign,
  User,
  Package,
  Phone,
  Hash
} from 'lucide-react';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase 
} from '@/firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function OrdersManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'delivered' | 'cancelled'>('all');

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return query(
      collection(firestore, 'restaurants', restaurantId, 'orders'), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore, restaurantId]);

  const { data: orders, isLoading } = useCollection(ordersQuery);

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!firestore || !restaurantId) return;
    try {
      await updateDoc(doc(firestore, 'restaurants', restaurantId, 'orders', orderId), {
        status,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Order Updated", description: `Status changed to ${status}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update order status." });
    }
  };

  const filteredOrders = orders?.filter(o => filter === 'all' || o.status === filter) || [];

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 w-12 h-12 rounded-2xl flex items-center justify-center text-primary shadow-lg border border-primary/10">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Live Orders</h2>
            <p className="text-slate-400 text-xs font-medium">Real-time fulfillment management.</p>
          </div>
        </div>
        
        <div className="flex bg-white/10 p-1 rounded-xl gap-1">
          {['all', 'pending', 'preparing', 'delivered'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {filteredOrders.map(order => (
          <AccordionItem 
            key={order.id} 
            value={order.id} 
            className="border-none bg-white px-6 rounded-3xl overflow-hidden shadow-xl"
          >
            <AccordionTrigger className="hover:no-underline py-6">
              <div className="flex flex-1 items-center justify-between text-left pr-6">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                    <Hash className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-lg text-slate-900 leading-tight">Order #{order.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                      <Phone className="h-3 w-3 text-primary" /> {order.customerPhone || 'No Phone'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                   <div className="text-right hidden sm:block">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Amount</p>
                     <p className="font-black text-slate-900">${order.totalAmount?.toFixed(2)}</p>
                   </div>
                   <Badge className={cn(
                      "font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full border-none shadow-sm",
                      order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                      order.status === 'preparing' ? "bg-blue-100 text-blue-700" :
                      order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {order.status}
                    </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-8 pt-4 border-t border-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-2 mt-4">
                {/* Column 1: Order Content */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" /> Order Summary
                    </h3>
                    <div className="space-y-2">
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm font-bold p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">{item.quantity}x</span>
                            <span className="text-slate-700">{item.name}</span>
                          </div>
                          <span className="text-slate-900 font-black">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t space-y-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">Fulfillment Controls</p>
                    <div className="flex flex-wrap gap-3">
                      {order.status === 'pending' && (
                        <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 font-black text-xs h-11" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                          Start Preparation
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-6 font-black text-xs h-11" onClick={() => updateOrderStatus(order.id, 'delivered')}>
                          Mark as Delivered
                        </Button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl font-black text-xs h-11" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                          Cancel Order
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Delivery Details */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> Customer & Logistics
                    </h3>
                    <div className="bg-slate-50 p-8 rounded-[2rem] space-y-6 border border-slate-100">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Full Name</p>
                          <p className="text-sm font-black text-slate-900">{order.customerName || 'Guest'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email Address</p>
                          <p className="text-sm font-bold text-slate-600 truncate">{order.customerEmail || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1 pt-4 border-t border-slate-200/50">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Delivery Address</p>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{order.deliveryAddress || 'N/A'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200/50">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Payment Method</p>
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-300 rounded-lg bg-white">
                            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Stripe Online'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Placed At</p>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="h-3 w-3" />
                            <span className="text-[11px] font-bold">
                              {order.createdAt ? format(new Date(order.createdAt), 'MMM d, h:mm a') : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}

        {filteredOrders.length === 0 && (
          <div className="py-24 text-center border-2 border-dashed border-white/10 rounded-[3rem] bg-white/5 backdrop-blur-sm">
            <ShoppingBag className="h-16 w-16 mx-auto mb-6 opacity-20 text-white" />
            <p className="font-black text-white uppercase text-xs tracking-[0.3em]">No orders in this category</p>
          </div>
        )}
      </Accordion>
    </div>
  );
}