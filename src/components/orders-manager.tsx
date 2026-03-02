'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBag, 
  Clock, 
  Loader2,
  DollarSign,
  User,
  Package
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

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map(order => (
          <Card key={order.id} className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white group hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-72 bg-slate-50 p-8 border-r space-y-6 shrink-0">
                  <div className="space-y-1">
                    <Badge className={cn(
                      "font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border-none",
                      order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                      order.status === 'preparing' ? "bg-blue-100 text-blue-700" :
                      order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {order.status}
                    </Badge>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Order ID</p>
                    <p className="text-xs font-mono font-bold text-slate-900">#{order.id.slice(-6).toUpperCase()}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-slate-600">
                        {order.createdAt ? format(new Date(order.createdAt), 'h:mm a, MMM d') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-lg font-black text-slate-900">${order.totalAmount?.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {order.status === 'pending' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-lg text-[9px] font-bold h-8" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                          Start Prep
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg text-[9px] font-bold h-8" onClick={() => updateOrderStatus(order.id, 'delivered')}>
                          Delivered
                        </Button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/5 text-[9px] font-bold h-8" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Package className="h-3 w-3" /> Ordered Items
                      </h3>
                      <div className="space-y-3">
                        {order.items?.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm font-bold p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">{item.quantity}x</span>
                              <span className="text-slate-700">{item.name}</span>
                            </div>
                            <span className="text-slate-400">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <User className="h-3 w-3" /> Delivery Details
                      </h3>
                      <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-medium">Customer ID</span>
                          <span className="font-bold text-slate-900 truncate max-w-[120px]">{order.customerId}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-medium">Payment</span>
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">{order.paymentMethod}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-medium">Charge</span>
                          <span className="font-black text-primary">${order.deliveryCharge?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredOrders.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-[3rem] bg-white/5">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20 text-white" />
            <p className="font-bold text-white uppercase text-[10px] tracking-[0.2em]">No orders in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}