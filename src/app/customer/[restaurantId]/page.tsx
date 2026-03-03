
"use client";

import { use, useState, useEffect, ReactNode } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { doc, collection, addDoc, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  UtensilsCrossed, 
  MapPin, 
  ShoppingBag, 
  Plus, 
  Minus, 
  CreditCard, 
  Truck, 
  Phone, 
  Clock, 
  Star, 
  Info, 
  ChevronRight, 
  CalendarDays, 
  Quote, 
  Mail, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetFooter 
} from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { checkIsRestaurantOpen } from '@/lib/operating-hours';
import { generateEmailContent } from '@/ai/flows/generate-email-content';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function CustomerStorefront({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  const designRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'design', 'settings');
  }, [firestore, restaurantId]);
  const { data: designSettings } = useDoc(designRef);

  const hoursRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId, 'config', 'operatingHours');
  }, [firestore, restaurantId]);
  const { data: operatingHours } = useDoc(hoursRef);

  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!firestore || !restaurantId || !menus) return;
    const fetchAllItems = async () => {
      setLoadingItems(true);
      const items: any[] = [];
      for (const menu of menus) {
        const querySnapshot = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', menu.id, 'items'));
        querySnapshot.forEach((doc) => {
          items.push({ ...doc.data(), id: doc.id, menuId: menu.id });
        });
      }
      setAllMenuItems(items);
      setLoadingItems(false);
    };
    fetchAllItems();
  }, [firestore, restaurantId, menus]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast({ title: "Added to cart" });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  const handleCheckout = async () => {
    if (!auth || !firestore || !restaurantId) return;
    setIsProcessing(true);
    
    try {
      let user = auth.currentUser;
      if (!user) {
        const userCredential = await signInAnonymously(auth);
        user = userCredential.user;
      }

      const orderData = {
        customerId: user.uid,
        items: cart,
        totalAmount: total,
        currency: restaurant?.baseCurrency || 'USD',
        status: 'pending',
        paymentMethod,
        paymentStatus: paymentMethod === 'stripe' ? 'paid' : 'pending',
        createdAt: new Date().toISOString()
      };

      const ordersRef = collection(firestore, 'restaurants', restaurantId, 'orders');
      
      // Perform write and handle result via .then() to avoid blocking if Genkit/Email fails
      addDoc(ordersRef, orderData)
        .then(async () => {
          // Success State
          setCart([]);
          setOrderComplete(true);
          setIsCheckoutOpen(false);
          toast({ title: "Order Placed!" });

          // Background task: AI Email Notification
          generateEmailContent({
            type: 'order_confirmed',
            recipientName: "Valued Customer",
            restaurantName: restaurant?.name,
            details: `Total: ${total} ${restaurant?.baseCurrency}. Items: ${cart.length}`
          }).then(emailContent => {
            addDoc(collection(firestore, 'mail'), {
              to: [auth.currentUser?.email || 'customer@example.com'],
              message: emailContent,
              createdAt: new Date().toISOString()
            });
          }).catch(err => {
            console.warn("AI Email failed, but order was saved.", err);
          });
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: ordersRef.path,
            operation: 'create',
            requestResourceData: orderData,
          });
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
          setIsProcessing(false);
        });

    } catch (e: any) {
      toast({ variant: "destructive", title: "Checkout Error", description: "Could not initialize order session." });
      setIsProcessing(false);
    }
  };

  if (loadingRes || loadingMenus || loadingItems) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10" /></div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center"><h1>Restaurant Not Found</h1></div>;

  const isOpen = checkIsRestaurantOpen(operatingHours);
  const theme = designSettings?.theme || { primary: '#22c55e', background: '#ffffff', text: '#0f172a' };
  const currencySymbol = restaurant?.baseCurrency === 'USD' ? '$' : restaurant?.baseCurrency || '$';

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: theme.background, color: theme.text }}>
      <nav className="sticky top-0 z-[100] w-full border-b backdrop-blur-md h-20 flex items-center bg-white/90">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <Link href={`/customer/${restaurantId}`} className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1.5" style={{ backgroundColor: theme.primary }}><UtensilsCrossed className="text-white" /></div>
            <span className="text-xl font-black text-slate-900">{restaurant.name}</span>
          </Link>
          <button className="relative p-2" onClick={() => setIsCheckoutOpen(true)}>
            <ShoppingBag className="h-6 w-6 text-slate-900" />
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black" style={{ backgroundColor: theme.primary }}>{cart.length}</span>
            )}
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <h2 className="text-5xl font-black text-center">Our Signature Menu</h2>
        {menus?.map(menu => (
          <div key={menu.id} className="space-y-8">
            <h3 className="text-3xl font-black border-l-8 pl-6" style={{ borderColor: theme.primary }}>{menu.name}</h3>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {allMenuItems.filter(i => i.menuId === menu.id).map(item => (
                <Card key={item.id} className="overflow-hidden border-none shadow-lg rounded-[2.5rem] bg-white text-slate-900">
                  <div className="relative h-56">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`} alt={item.name} className="w-full h-full object-cover" />
                    <Badge className="absolute top-4 right-4 bg-white/90 text-black font-black text-lg">{currencySymbol}{item.price}</Badge>
                  </div>
                  <CardContent className="p-8 space-y-4">
                    <h4 className="font-black text-2xl">{item.name}</h4>
                    <p className="text-sm text-slate-500 font-medium h-10 line-clamp-2">{item.description}</p>
                    <Button className="w-full rounded-2xl font-black" style={{ backgroundColor: theme.primary }} onClick={() => addToCart(item)}>Add to Cart</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <SheetContent className="w-full sm:max-w-md rounded-l-[3rem] p-0 flex flex-col">
          <SheetHeader className="p-8 border-b bg-slate-50/50">
            <SheetTitle className="text-2xl font-black">Your Order</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.quantity} x {currencySymbol}{item.price}</p>
                  </div>
                  <span className="font-black">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center text-slate-400 py-10 italic">Cart is empty</p>}
            </div>

            {cart.length > 0 && (
              <div className="space-y-6 pt-8 border-t">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid gap-3">
                    <div className={cn("flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === 'cod' ? "border-primary bg-primary/5" : "border-slate-100")}>
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1 flex items-center justify-between cursor-pointer">
                        <span className="font-bold">Cash on Delivery</span>
                        <Truck className="h-4 w-4 opacity-40" />
                      </Label>
                    </div>
                    {restaurant?.paymentsEnabled && (
                      <div className={cn("flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer", paymentMethod === 'stripe' ? "border-[#635BFF] bg-[#635BFF]/5" : "border-slate-100")}>
                        <RadioGroupItem value="stripe" id="stripe" />
                        <Label htmlFor="stripe" className="flex-1 flex items-center justify-between cursor-pointer">
                          <span className="font-bold">Pay with Card (Stripe)</span>
                          <CreditCard className="h-4 w-4 text-[#635BFF]" />
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center opacity-60 text-sm">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-black border-t border-white/10 pt-4">
                    <span>Total</span>
                    <span>{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="p-8 bg-slate-50/50 border-t">
            <Button 
              className="w-full h-16 rounded-2xl text-xl font-black shadow-xl" 
              style={{ backgroundColor: theme.primary }}
              disabled={cart.length === 0 || isProcessing || !isOpen}
              onClick={handleCheckout}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : orderComplete ? <CheckCircle2 /> : "Confirm Order"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={orderComplete} onOpenChange={setOrderComplete}>
        <DialogContent className="rounded-[3rem] text-center p-12">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black">Order Received!</h2>
          <p className="text-slate-500 mt-2 mb-8">We are preparing your meal. An AI-generated receipt has been sent to your email.</p>
          <Button className="w-full h-14 rounded-2xl font-black" onClick={() => setOrderComplete(false)}>Perfect, Thanks!</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
